import React, { useState, useEffect } from 'react';
import { ArrowLeft, History, Pause, Mic, Square, ChevronDown, ChevronUp, CheckCircle, User } from 'lucide-react';
import { Dialog, Toast } from 'react-vant';
import SoundWave from '../components/SoundWave';
import Button from '../components/Button';
import { MOCK_QUESTIONS } from '../constants';
import { Question, DealRecord } from '../types';
import { dealService } from '../services/dealService';
import { useRecordingStore } from '../store/useRecordingStore';



interface RecordingPageProps {
  deal: DealRecord | null;
  onBack: () => void;
  onHistoryClick?: () => void;
  isRecording: boolean;
  seconds: number;
  onToggleRecording: () => void;
  interviewInstId?: string;
  interviewInstTitle?: string;
  onFinish?: () => void;
}

const RecordingPage: React.FC<RecordingPageProps> = ({
  deal,
  onBack,
  onHistoryClick,
  isRecording,
  seconds,
  onToggleRecording,
  interviewInstId,
  interviewInstTitle,
  onFinish
}) => {
  const [activeTab, setActiveTab] = useState<'questions' | 'transcription'>('questions');
  const [questions, setQuestions] = useState<Question[]>(MOCK_QUESTIONS);
  const [expandedQuestion, setExpandedQuestion] = useState<number | string | null>(null);
  // const [transcriptionList, setTranscriptionList] = useState<any[]>([]); // REMOVED: Use Global Store
  const { transcriptionList, setTranscriptionList } = useRecordingStore();

  const resetStore = useRecordingStore(state => state.reset);

  // Auto-scroll ref
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Scroll to bottom when list updates or tab becomes active
  useEffect(() => {
    if (activeTab === 'transcription') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcriptionList, activeTab]);

  // NOTE: Global listeners are now in App.tsx. 
  // We only keep necessary unique logic here if any, or just rely on store updates.

  // 同步问题清单数据
  useEffect(() => {
    if (deal?.questionInfoList && deal.questionInfoList.length > 0) {
      const backendQuestions: Question[] = deal.questionInfoList.map((item, index) => ({
        id: item.id || String(index),
        text: item.questionName,
        isAnswered: !!item.CHECKED,
        details: item.questionAnswer || undefined
      }));
      setQuestions(backendQuestions);
    }
  }, [deal]);

  // 获取录音转写数据
  useEffect(() => {
    // 只有当列表为空时才去拉取历史记录 (e.g. 首次进入或由于某种原因 store 为空)
    // 且必须有 interviewInstId
    if (activeTab === 'transcription' && interviewInstId && transcriptionList.length === 0) {
      const fetchTranscription = async () => {
        try {
          const res = await dealService.queryInterviewInstContentListByPage({
            interviewInstId,
            pageNum: 1,
            pageSize: 100 // 暂时获取前100条
          });
          if (res.success && res.data && res.data.records) {
            // Map backend data to TranscriptionItem if necessary, or ensure compatible types
            // Assuming backend structure matches or is compatible
            setTranscriptionList(res.data.records);
          }
        } catch (error) {
          console.error('获取转写记录失败', error);
        }
      };
      fetchTranscription();
    }
  }, [activeTab, interviewInstId, transcriptionList.length, setTranscriptionList]);

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFinishInterview = () => {
    Dialog.confirm({
      title: '结束访谈',
      message: '确定要结束当前的访谈吗？结束将停止录音并保存记录。',
      confirmButtonText: '确定结束',
      cancelButtonText: '继续访谈',
      confirmButtonColor: '#4E3EF8',
    })
      .then(async () => {
        // 结束时如果是录音状态，先调用停止
        if (isRecording) {
          if (window.Android?.stopRequestVoice) {
            window.Android.stopRequestVoice();
          } else if (window.Android?.stopRecord) {
            window.Android.stopRecord();
          }
        }

        if (!interviewInstId) {
          // 如果没有 ID，直接重置并返回
          resetStore();
          if (onFinish) {
            onFinish();
          } else {
            onBack();
          }
          return;
        }

        Toast.loading({ message: '正在保存...', forbidClick: true, duration: 0 });
        try {
          // 1. 上传录音文件 (暂用 Mock 文件替代实际录音数据)
          // 实际开发中应从 MediaRecorder 获取 Blob 并转为 File
          // 注意：现在集成了 Android 录音，文件在本地路径。
          // Web 无法直接读取 Android 本地文件路径上传，通常需要：
          // a) Android 端负责上传
          // b) Android 端读取文件内容传给 H5 (Base64)
          // c) H5 仅负责业务逻辑，文件流转由原生处理
          // 这里保持原逻辑 Mock，仅做流程演示
          const mockFile = new File(["dummy audio content"], `recording_${Date.now()}.wav`, { type: "audio/wav" });
          const uploadRes = await dealService.uploadInterviewInstRecordFile(interviewInstId, mockFile);

          if (!uploadRes.success) {
            Toast.fail(uploadRes.message || '录音保存失败');
            return;
          }

          // 2. 结束访谈
          const res = await dealService.overInterviewInst(interviewInstId);
          if (res.success) {
            resetStore(); // 清除全局状态（浮窗消失）
            Toast.success('访谈已结束');
            if (onFinish) {
              onFinish();
            } else {
              onBack();
            }
          } else {
            Toast.fail(res.message || '结束失败');
          }
        } catch (error) {
          console.error(error);
          Toast.fail('网络异常，结束失败');
        } finally {
          Toast.clear();
        }
      })
      .catch(() => {
        // 取消，什么都不做
      });
  };

  const [countdown, setCountdown] = useState<number>(0);

  const handleToggleWrapper = () => {
    if (isRecording) {
      // 暂停/停止录音
      // Stop Voice Request (New Plugin API)
      if (window.Android?.stopRequestVoice) {
        console.log("[H5] calling stopRequestVoice...");
        window.Android.stopRequestVoice();
      } else if (window.Android?.stopRecord) {
        // Fallback
        try {
          window.Android.stopRecord();
        } catch (e) { console.error(e); }
      }
      onToggleRecording();
    } else {
      if (seconds === 0) {
        setCountdown(5);
      } else {
        // Start Voice Request (New Plugin API)
        if (window.Android?.startRequestVoice) {
          console.log("[H5] calling startRequestVoice...");
          window.Android.startRequestVoice();
        } else if (window.Android?.startRecord) {
          // Fallback to old API
          const surveyId = interviewInstId || deal?.id || 'default_id';
          window.Android.startRecord(surveyId);
        }
        onToggleRecording();
      }
    }
  };

  useEffect(() => {
    if (countdown > 0) {
      // 当倒计时到达 1 时，触发录音逻辑
      if (countdown === 1) {
        if (window.Android?.startRequestVoice) {
          console.log("[H5] countdown finished, calling startRequestVoice...");
          window.Android.startRequestVoice();
        } else if (window.Android?.startRecord) {
          const surveyId = interviewInstId || deal?.id || 'default_id';
          window.Android.startRecord(surveyId);
        }
        onToggleRecording();
      }

      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [countdown]); // 注意：这里移除了 onToggleRecording 依赖，避免闭包问题，但 onToggleRecording 应该是稳定的

  return (
    <div className="flex flex-col h-screen relative bg-[#F7F8FA]">

      {/* NavBar */}
      <div className="bg-white px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-700">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-lg font-bold text-slate-800">
          {interviewInstTitle || deal?.interviewCust || '访谈录音'}
        </h1>
        <button
          className="p-2 -mr-2 text-slate-700"
          onClick={onHistoryClick}
        >
          <History size={22} />
        </button>
      </div>

      {/* Header Area: Timer & SoundWave */}
      <div className="bg-white pt-6 pb-2 text-center z-10">
        <SoundWave isRecording={isRecording} />
        <div className="mt-2 text-3xl font-mono font-medium text-slate-800 tracking-wider">
          {formatTime(seconds)}
        </div>
      </div>

      <div className="flex-1 flex flex-col relative min-h-0">
        {countdown > 0 && (
          <div className="absolute inset-0 z-50 bg-white flex flex-col items-center pt-24">
            <div className="w-56 h-56 flex items-center justify-center relative">
              <img
                src="/talk-assistant/assets/startrecorde.png"
                alt="Countdown Bear"
                className="w-full h-full object-contain"
              />
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl font-extrabold text-[#4E3EF8] mt-8 mr-1 transform rotate-[-5deg]">
                {countdown}
              </span>
            </div>
            <p className="mt-4 text-indigo-600 font-bold text-lg animate-pulse">准备开始录音...</p>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white mt-1 border-t border-gray-100 z-10 sticky top-[60px]">
          <div className="flex">
            <button
              className={`flex-1 py-3 text-sm font-medium relative transition-colors ${activeTab === 'questions' ? 'text-indigo-600' : 'text-gray-500'}`}
              onClick={() => setActiveTab('questions')}
            >
              问题清单
              {activeTab === 'questions' && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-indigo-600 rounded-t-full" />
              )}
            </button>
            <button
              className={`flex-1 py-3 text-sm font-medium relative transition-colors ${activeTab === 'transcription' ? 'text-indigo-600' : 'text-gray-500'}`}
              onClick={() => setActiveTab('transcription')}
            >
              录音转写
              {activeTab === 'transcription' && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-indigo-600 rounded-t-full" />
              )}
            </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto pb-24 p-4 scroll-smooth relative">

          {/* Question List Tab */}
          <div className={activeTab === 'questions' ? 'block' : 'hidden'}>
            <div className="space-y-3">
              <div className="text-xs text-gray-400 mb-2 pl-1">已自动匹配 {questions.filter(q => q.isAnswered).length} / {questions.length} 项</div>
              {questions.map((q, index) => (
                <div key={q.id} className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-50 transition-all">
                  <div
                    className="flex items-center justify-between cursor-pointer py-1"
                    onClick={() => q.details && setExpandedQuestion(expandedQuestion === q.id ? null : q.id)}
                  >
                    <h3 className={`flex-1 text-[15px] leading-snug font-medium pr-3 ${q.isAnswered ? 'text-gray-800' : 'text-gray-500'}`}>
                      {index + 1}. {q.text}
                    </h3>

                    <div className="flex items-center gap-3">
                      {q.details && (
                        <div className="text-gray-400">
                          {expandedQuestion === q.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                      )}

                      <div className="min-w-[20px]">
                        {q.isAnswered ? (
                          <div className="text-indigo-600">
                            <CheckCircle size={22} fill="white" />
                          </div>
                        ) : (
                          <div className="w-[18px] h-[18px] rounded-full border border-gray-300 ml-[2px]"></div>
                        )}
                      </div>
                    </div>
                  </div>

                  {expandedQuestion === q.id && q.details && (
                    <div className="mt-3 text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 flex gap-2">
                      <span className="text-indigo-500 font-bold shrink-0">A:</span>
                      <span>{q.details}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Transcription (Chat) Tab */}
          <div className={activeTab === 'transcription' ? 'block' : 'hidden'}>
            <div className="space-y-6">
              {transcriptionList.length > 0 ? (
                transcriptionList.map((item, index) => {
                  // Determine alignment based on roleId
                  // Assuming Role 1 (or default) is "Me" (Right), Role 2 is "Other" (Left)
                  // Use String() to safely handle both number and string types from backend/native
                  const isMe = String(item.roleId) === '1';

                  return (
                    <div key={index} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isMe ? 'bg-indigo-100' : 'bg-orange-100'}`}>
                          <User size={16} className={isMe ? 'text-indigo-600' : 'text-orange-600'} fill="currentColor" />
                        </div>
                      </div>

                      <div className={`flex-1 flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        {/* Name Label */}
                        <div className={`text-xs text-gray-500 mb-1.5 ${isMe ? 'mr-1' : 'ml-1'}`}>
                          {item.roleId ? (isMe ? '咨询师' : '客户') : `访谈对象${item.id}`}
                        </div>

                        {/* Chat Bubble */}
                        <div className={`p-3.5 rounded-xl text-[15px] leading-relaxed max-w-[90%] break-words shadow-sm
                          ${isMe
                            ? 'bg-[#4E3EF8] text-white rounded-tr-sm'
                            : 'bg-white border border-gray-100 text-slate-700 rounded-tl-sm'
                          }`}
                        >
                          {item.content || '暂无内容'}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <p className="text-sm">暂无转写记录</p>
                </div>
              )}
              {/* Dummy element for auto-scroll */}
              <div ref={messagesEndRef} />
            </div>
          </div>

        </div>

      </div>

      {/* Sticky Bottom Bar */}
      {countdown === 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-4 pb-8 z-30 flex gap-4 items-center justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <Button
            variant="primary"
            onClick={handleToggleWrapper}
            className="flex-1 rounded-full shadow-lg shadow-indigo-200"
          >
            {isRecording ? (
              <>
                <Pause size={18} className="mr-2" /> 暂停录音
              </>
            ) : (
              <>
                <Mic size={18} className="mr-2" /> {seconds === 0 ? '开始录音' : '继续录音'}
              </>
            )}
          </Button>

          {seconds > 0 && (
            <Button
              variant="secondary"
              onClick={handleFinishInterview}
              className="flex-1 rounded-full border-indigo-100 text-indigo-600"
            >
              <Square size={16} className="mr-2 fill-current" /> 结束访谈
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default RecordingPage;
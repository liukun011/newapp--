import React, { useState, useEffect } from 'react';
import { ArrowLeft, History, Pause, Mic, Square, ChevronDown, ChevronUp, CheckCircle, User } from 'lucide-react';
import { Dialog, Toast } from 'react-vant';
import SoundWave from '../components/SoundWave';
import Button from '../components/Button';
import { MOCK_QUESTIONS } from '../constants';
import { Question, DealRecord } from '../types';
import { dealService } from '../services/dealService';
import { useRecordingStore } from '../store/useRecordingStore';
import { nativeBridge } from '../services/nativeBridge';



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

  // 获取录音转写数据（仅在查看历史时）
  useEffect(() => {
    // 只有在以下情况才调用接口获取历史转写记录：
    // 1. 当前在转写 tab
    // 2. 有 interviewInstId
    // 3. 列表为空（首次进入）
    // 4. 不在录音中（正在录音时内容来自 Native 实时推送）
    if (activeTab === 'transcription' && interviewInstId && transcriptionList.length === 0 && !isRecording) {
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
  }, [activeTab, interviewInstId, transcriptionList.length, isRecording, setTranscriptionList]);

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 上传转写内容到服务器
  const uploadTranscriptionContent = async () => {
    if (!interviewInstId) {
      return;
    }

    // 只上传最终结果（isFinal: true）
    const finalResults = transcriptionList.filter(item => item.isFinal);
    
    if (finalResults.length === 0) {
      console.log('[上传转写] 没有需要上传的内容');
      return;
    }

    try {
      const contentList = finalResults.map(item => ({
        id: String(item.id),
        content: item.content,
      }));

      console.log('[上传转写] 上传内容:', contentList.length, '条');
      
      await dealService.uploadInterviewInstContent({
        interviewInstId,
        contentList,
      });

      console.log('[上传转写] 上传成功');
    } catch (error) {
      console.error('[上传转写] 上传失败:', error);
    }
  };

  // 获取并上传录音文件
  const uploadRecordingFile = async (): Promise<boolean> => {
    if (!interviewInstId) {
      console.log('[上传录音] 没有 interviewInstId');
      return false;
    }
    // 从 Native 获取录音文件（所有环境统一使用）
    return new Promise((resolve) => {
      // 设置回调监听
      const handleAudioList = async (response: any) => {
        nativeBridge.off('getAudioList', handleAudioList); // 移除监听

        if (response.success && response.data && response.data.list && response.data.list.length > 0) {
          // 获取最新的录音文件（通常是列表的第一个）
          const latestAudio = response.data.list[0];
          console.log('[上传录音] 找到录音文件:', {
            fileName: latestAudio.fileName,
            fileURL: latestAudio.fileURL,
            fileSize: latestAudio.fileSize,
            timestamp: latestAudio.timestamp
          });

          try {
            // 尝试从 appfile:// URL 获取文件内容
            console.log('[上传录音] 正在从 Native 读取文件:', latestAudio.fileURL);
            const fileResponse = await fetch(latestAudio.fileURL);
            
            if (!fileResponse.ok) {
              console.error('[上传录音] 文件读取失败:', fileResponse.statusText);
              resolve(false);
              return;
            }

            const blob = await fileResponse.blob();
            const file = new File([blob], latestAudio.fileName, { type: 'audio/wav' });
            
            console.log('[上传录音] 文件读取成功，准备上传:', {
              name: file.name,
              size: file.size,
              type: file.type
            });

            const uploadRes = await dealService.uploadInterviewInstRecordFile(interviewInstId, file);
            
            if (uploadRes.success) {
              console.log('[上传录音] 上传成功');
              resolve(true);
            } else {
              console.error('[上传录音] 上传失败:', uploadRes.message);
              resolve(false);
            }
          } catch (error) {
            console.error('[上传录音] 文件处理或上传异常:', error);
            resolve(false);
          }
        } else {
          console.log('[上传录音] 没有找到录音文件');
          resolve(false);
        }
      };

      // 注册回调
      nativeBridge.on('getAudioList', handleAudioList);

      // 调用 Native 获取音频列表
      console.log('[上传录音] 查询录音文件, surveyId:', interviewInstId);
      nativeBridge.getAudioList({
        surveyId: interviewInstId,
        page: 1,
        pageSize: 99999,
      });

      // 设置超时
      setTimeout(() => {
        nativeBridge.off('getAudioList', handleAudioList);
        console.log('[上传录音] 查询超时');
        resolve(false);
      }, 10000); // 10秒超时
    });
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
          // if (window.Android?.stopRecord) {
          //   window.Android.stopRecord();
          // }
          nativeBridge.stopRecording();
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
          // 1. 上传录音文件（从 Native 获取）
          const uploadSuccess = await uploadRecordingFile();
          
          if (!uploadSuccess) {
            Toast.fail('录音文件上传失败');
            return;
          }

          // 2. 上传转写内容
          await uploadTranscriptionContent();
          // 3. 结束访谈
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
      // 停止录音（暂停）
      console.log("[H5] calling stopRecord...");
      // if (window.Android?.stopRecord) {
      //   try {\n      //     window.Android.stopRecord();
      //   } catch (e) { console.error(e); }
      // }
      nativeBridge.stopRecording();
      onToggleRecording();
      
      // 暂停时上传转写内容和录音文件
      uploadTranscriptionContent();
      uploadRecordingFile();
    } else {
      if (seconds === 0) {
        setCountdown(3); // Changed to 3s for better UX
      } else {
        // 继续录音
        startNativeRecord();
      }
    }
  };

  const startNativeRecord = () => {
    const surveyId = interviewInstId || '';
    console.log(`[H5] Calling startRecord with surveyId: ${surveyId}`);
    // if (window.Android?.startRecord) {
    //   window.Android.startRecord(surveyId);
    // } else {
    //   Toast.fail('Native interface not found');
    // }
    nativeBridge.startRecordingWithParams({ surveyId });
    onToggleRecording();
  };

  useEffect(() => {
    if (countdown > 0) {
      // 当倒计时到达 1 时，触发录音逻辑
      if (countdown === 1) {
        // We need a small delay or the next tick to ensure UI update
        // But logic-wise, we just start recording
        setTimeout(() => {
          startNativeRecord();
        }, 800);
      }

      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [countdown]);

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
                  const isRecognizing = item.isFinal === false;

                  return (
                    <div key={item.id || index} className="flex gap-3 flex-row">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-orange-100">
                          <User size={16} className="text-orange-600" fill="currentColor" />
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col items-start">
                        {/* Name Label with recognizing indicator */}
                        <div className={`text-xs mb-1.5 flex items-center gap-1 ml-1 ${isRecognizing ? 'text-gray-400' : 'text-gray-500'}`}>
                          访谈对象{item.roleId || index + 1}
                          {isRecognizing && (
                            <>
                              <span className="inline-block w-1 h-1 bg-gray-400 rounded-full animate-pulse"></span>
                              <span className="text-[10px]">识别中...</span>
                            </>
                          )}
                        </div>

                        {/* Chat Bubble */}
                        <div className={`p-3.5 rounded-xl rounded-tl-sm text-[15px] leading-relaxed max-w-[90%] break-words shadow-sm
                          ${isRecognizing
                            ? 'bg-indigo-50 text-indigo-600 border border-indigo-100 opacity-80'
                            : 'bg-white border border-gray-100 text-slate-700'
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
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto px-4 pb-6 z-30">
          <div className="flex gap-4 items-center justify-between">
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
        </div>
      )}
    </div>
  );
};

export default RecordingPage;
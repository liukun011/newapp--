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
  const [transcriptionList, setTranscriptionList] = useState<any[]>([]);

  const resetStore = useRecordingStore(state => state.reset);

  // 同步问题清单数据
  useEffect(() => {
    if (deal?.questionInfoList && deal.questionInfoList.length > 0) {
      const backendQuestions: Question[] = deal.questionInfoList.map(item => ({
        id: item.id,
        text: item.questionName,
        isAnswered: !!item.CHECKED,
        details: item.questionAnswer || undefined
      }));
      setQuestions(backendQuestions);
    }
  }, [deal]);

  // 获取录音转写数据
  useEffect(() => {
    if (activeTab === 'transcription' && interviewInstId) {
      const fetchTranscription = async () => {
        try {
          const res = await dealService.queryInterviewInstContentListByPage({
            interviewInstId,
            pageNum: 1,
            pageSize: 100 // 暂时获取前100条
          });
          if (res.success && res.data) {
            setTranscriptionList(res.data.records || []);
          }
        } catch (error) {
          console.error('获取转写记录失败', error);
        }
      };
      fetchTranscription();
    }
  }, [activeTab, interviewInstId]);

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
      onToggleRecording();
    } else {
      if (seconds === 0) {
        setCountdown(5);
      } else {
        onToggleRecording();
      }
    }
  };

  useEffect(() => {
    if (countdown > 0) {
      // 当倒计时到达 1 时，触发录音逻辑
      if (countdown === 1) {
        onToggleRecording();
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


        {activeTab === 'questions' ? (
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
                      {/* 展开箭头 - 仅当有答案时显示 */}
                      {q.details && (
                        <div className="text-gray-400">
                          {expandedQuestion === q.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                      )}

                      {/* 状态图标 */}
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

                 {/* 展开的答案内容 */}
                 {expandedQuestion === q.id && q.details && (
                   <div className="mt-3 text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 flex gap-2">
                     <span className="text-indigo-500 font-bold shrink-0">A:</span>
                     <span>{q.details}</span>
                   </div>
                 )}
               </div>
             ))}
          </div>
        ) : (
          <div className="space-y-6">
             {transcriptionList.length > 0 ? (
               transcriptionList.map((item, index) => (
                 <div key={index} className="flex gap-3">
                   {/* 头像 */}
                   <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0">
                     <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <User size={16} className="text-blue-600" fill="currentColor" />
                     </div>
                   </div>
                   
                   <div className="flex-1">
                     {/* 名字 */}
                     <div className="text-xs text-gray-500 mb-1.5 ml-1">
                       访谈对象{item.id}
                     </div>
                     {/* 气泡内容 */}
                     <div className="bg-[#F0F5FF] p-3.5 rounded-xl rounded-tl-sm text-[15px] text-slate-700 leading-relaxed">
                       {item.content || '暂无内容'}
                     </div>
                   </div>
                 </div>
               ))
             ) : (
               <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                 <p className="text-sm">暂无转写记录</p>
               </div>
             )}
          </div>
        )}
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
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Play, Pause, RotateCcw, RotateCw, ChevronDown, ChevronUp, CheckCircle, User } from 'lucide-react';
import { Toast } from 'react-vant';
import Button from '../components/Button';
import { MOCK_QUESTIONS } from '../constants';
import { Question, DealRecord } from '../types';
import { dealService } from '../services/dealService';

interface HistoryDetailPageProps {
  deal: DealRecord | null;
  interviewInstId: string;
  interviewInstTitle: string;
  onBack: () => void;
}

const HistoryDetailPage: React.FC<HistoryDetailPageProps> = ({ 
  deal, 
  interviewInstId,
  interviewInstTitle,
  onBack
}) => {
  const [activeTab, setActiveTab] = useState<'questions' | 'transcription'>('questions');
  const [questions, setQuestions] = useState<Question[]>(MOCK_QUESTIONS);
  const [expandedQuestion, setExpandedQuestion] = useState<number | string | null>(null);
  const [transcriptionList, setTranscriptionList] = useState<any[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

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

  // 获取录音文件
  useEffect(() => {
    if (interviewInstId) {
      const fetchAudio = async () => {
        try {
          const res = await dealService.queryInterviewRecordFileInstByInterviewInstId({
             interviewInstId
          });
          if (res.success && res.data) {
             // 使用 recordFileUrl 字段
             const url = res.data.recordFileUrl || res.data.fileUrl || res.data.url || (typeof res.data === 'string' ? res.data : '');
             if (url) {
               setAudioUrl(url);
               console.log('Audio URL fetched:', url);
             }
          }
        } catch (error) {
          console.error('Fetch audio failed', error);
        }
      };
      fetchAudio();
    }
  }, [interviewInstId]);

  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (!audioUrl) {
      Toast.info('暂无录音文件');
      return;
    }
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current && audioRef.current.duration) {
       const p = (audioRef.current.currentTime / audioRef.current.duration) * 100;
       setProgress(p);
       setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  // 音频加载完成时更新时长
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      console.log('录音时长加载中:', audioRef.current.duration);
    }
  };

  // 快退 15 秒
  const skipBackward = () => {
    if (audioRef.current) {
      const currentTime = audioRef.current.currentTime;
      // 如果当前时间不足15秒，提示用户
      if (currentTime < 15) {
        Toast.info({ message: '剩余时长不足15秒', position: 'top' });
        return;
      }
      audioRef.current.currentTime = currentTime - 15;
    }
  };

  // 快进 15 秒
  const skipForward = () => {
    if (audioRef.current) {
      const currentTime = audioRef.current.currentTime;
      const duration = audioRef.current.duration || 0;
      const remainingTime = duration - currentTime;
      // 如果剩余时间不足15秒，提示用户
      if (remainingTime < 15) {
        Toast.info({ message: '剩余时长不足15秒', position: 'top' });
        return;
      }
      audioRef.current.currentTime = currentTime + 15;
    }
  };

  // 格式化时间
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '00:00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 获取录音转写数据
  useEffect(() => {
    if (activeTab === 'transcription' && interviewInstId) {
      const fetchTranscription = async () => {
        try {
          const res = await dealService.queryInterviewInstContentListByPage({
            interviewInstId,
            pageNum: 1,
            pageSize: 100
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

  return (
    <div className="flex flex-col h-screen relative bg-[#F7F8FA]">
      
      {/* NavBar */}
      <div className="bg-white px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-700">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-lg font-bold text-slate-800">
          {interviewInstTitle || '访谈详情'}
        </h1>
        <div className="w-10" /> 
      </div>

      <audio 
        ref={audioRef} 
        src={audioUrl} 
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleAudioEnded}
        onLoadedMetadata={handleLoadedMetadata}
      />

      {/* Audio Player Header */}
      <div className="bg-white pt-6 pb-4 text-center z-10 px-8">
        {/* Progress Bar - 使用 range input 实现可拖动进度条 */}
        <div className="relative mb-4">
          <input
            type="range"
            min={0}
            max={100}
            value={progress}
            onChange={(e) => {
              const newProgress = Number(e.target.value);
              setProgress(newProgress);
              if (audioRef.current && audioRef.current.duration) {
                audioRef.current.currentTime = (newProgress / 100) * audioRef.current.duration;
              }
            }}
            className="w-full h-1 bg-gray-200 rounded-full appearance-none cursor-pointer accent-indigo-500"
            style={{
              background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${progress}%, #e5e7eb ${progress}%, #e5e7eb 100%)`
            }}
          />
        </div>
        
        {/* Time Display */}
        <div className="flex justify-between text-xs text-gray-500 font-mono mb-6">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-10">
          <button 
            className="text-indigo-500 p-2 active:opacity-70"
            onClick={skipBackward}
          >
            <div className="relative">
              <RotateCcw size={24} strokeWidth={1.5} />
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[8px] font-bold pt-0.5">15</span>
            </div>
          </button>

          <button 
            className="w-14 h-14 rounded-full border-2 border-indigo-500 flex items-center justify-center text-indigo-500 shadow-md active:scale-95 transition-transform"
            onClick={togglePlay}
          >
            {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
          </button>

          <button 
            className="text-indigo-500 p-2 active:opacity-70"
            onClick={skipForward}
          >
             <div className="relative">
              <RotateCw size={24} strokeWidth={1.5} />
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[8px] font-bold pt-0.5">15</span>
            </div>
          </button>
        </div>
      </div>

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
      <div className="flex-1 overflow-y-auto pb-24 p-4 scroll-smooth">
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
        ) : (
          <div className="space-y-6">
             {transcriptionList.length > 0 ? (
               transcriptionList.map((item, index) => (
                 <div key={index} className="flex gap-3">
                   <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0">
                     <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <User size={16} className="text-blue-600" fill="currentColor" />
                     </div>
                   </div>
                   
                   <div className="flex-1">
                     <div className="text-xs text-gray-500 mb-1.5 ml-1">
                       访谈对象{item.id}
                     </div>
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

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-4 pb-8 z-30 flex gap-4 items-center justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <Button 
          disabled
          className="flex-1 rounded-full border border-gray-200 bg-white text-gray-300 pointer-events-none"
          variant="secondary"
        >
           已结束
        </Button>
      </div>
    </div>
  );
};

export default HistoryDetailPage;

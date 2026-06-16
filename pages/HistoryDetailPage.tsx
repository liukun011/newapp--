import React, { useState, useEffect, useRef } from 'react';
import { useThrottleFn } from '../hooks/useThrottleFn';
import { ArrowLeft, Play, Pause, RotateCcw, RotateCw, ChevronDown, ChevronUp, CheckCircle, User } from 'lucide-react';
import { Toast } from 'react-vant';
import Button from '../components/Button';
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
  const fallbackInterview = deal?.interviewInstList?.[0];
  const effectiveInterviewInstId = interviewInstId || fallbackInterview?.interviewInstId || fallbackInterview?.id || '';
  const effectiveInterviewInstTitle = interviewInstTitle || fallbackInterview?.interviewInstTitle || fallbackInterview?.interviewInstName || '访谈详情';
  const [activeTab, setActiveTab] = useState<'questions' | 'transcription'>('questions');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [expandedQuestion, setExpandedQuestion] = useState<number | string | null>(null);
  const [transcriptionList, setTranscriptionList] = useState<any[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // 转写分页状态
  const [transcriptionPage, setTranscriptionPage] = useState(1);
  const [hasMoreTranscription, setHasMoreTranscription] = useState(true);
  const [loadingMoreTranscription, setLoadingMoreTranscription] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
    if (effectiveInterviewInstId) {
      const fetchAudio = async () => {
        try {
          const res = await dealService.queryInterviewRecordFileInstByInterviewInstId({
             interviewInstId: effectiveInterviewInstId
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
  }, [effectiveInterviewInstId]);

  // 监听原生返回键
  useEffect(() => {
    const handleNativeBack = (e: Event) => {
      e.preventDefault();
      onBack();
    };

    window.addEventListener('requestNativeBack', handleNativeBack);
    return () => {
      window.removeEventListener('requestNativeBack', handleNativeBack);
    };
  }, [onBack]);

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
    if (!Number.isFinite(seconds)) return '00:00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 获取录音转写数据（支持分页）
  const fetchTranscription = async (page: number, append = false) => {
    if (!effectiveInterviewInstId) return;
    if (append) setLoadingMoreTranscription(true);
    try {
      const res = await dealService.queryInterviewInstContentListByPage({
        interviewInstId: effectiveInterviewInstId,
        pageNum: page,
        pageSize: 100
      });
      if (res.success && res.data) {
        const records = res.data.records || [];
        // 过滤掉 type=4 (补充资料语音录入) 的内容
        const filteredRecords = records.filter((item: any) => item.type !== '4');
        
        if (append) {
          setTranscriptionList(prev => [...prev, ...filteredRecords]);
        } else {
          setTranscriptionList(filteredRecords);
        }

        // 判断是否还有更多数据
        const total = res.data.total || 0;
        const loaded = append 
          ? transcriptionList.length + filteredRecords.length 
          : filteredRecords.length;
        setHasMoreTranscription(loaded < total && records.length === 100);
        setTranscriptionPage(page);
      }
    } catch (error) {
      console.error('获取转写记录失败', error);
    } finally {
      setLoadingMoreTranscription(false);
    }
  };

  // 切换到转写 tab 时加载第一页
  useEffect(() => {
    if (activeTab === 'transcription' && effectiveInterviewInstId) {
      // 重置分页状态
      setTranscriptionPage(1);
      setHasMoreTranscription(true);
      fetchTranscription(1, false);
    }
  }, [activeTab, effectiveInterviewInstId]);

  // 滚动加载更多
  const handleContentScroll = () => {
    if (activeTab !== 'transcription' || !hasMoreTranscription || loadingMoreTranscription) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    // 距离底部 200px 时触发加载
    const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200;
    if (nearBottom) {
      fetchTranscription(transcriptionPage + 1, true);
    }
  };

  // Throttled Handlers
  const handleBackThrottled = useThrottleFn(onBack, 1000);
  const togglePlayThrottled = useThrottleFn(togglePlay, 500); // 播放暂停可以稍微短一点
  const skipBackwardThrottled = useThrottleFn(skipBackward, 500);
  const skipForwardThrottled = useThrottleFn(skipForward, 500);

  return (
    <div className="flex flex-col h-screen relative bg-[#F7FAFE]">
      
      {/* NavBar */}
      <div className="bg-[#FFFFFF] px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-[0_3px_10px_rgba(15,40,72,0.04)]">
        <button onClick={handleBackThrottled} className="p-2 -ml-2 text-[#476285]">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-lg font-medium text-[#0F2848] flex-1 text-center truncate mx-4">
          {effectiveInterviewInstTitle}
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
      <div className="bg-[#FFFFFF] pt-6 pb-4 text-center z-10 px-8">
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
            className="w-full h-1 bg-gray-200 rounded-[999px] appearance-none cursor-pointer accent-[#004ACC]"
            style={{
              background: `linear-gradient(to right, #004ACC 0%, #004ACC ${progress}%, #e5e7eb ${progress}%, #e5e7eb 100%)`
            }}
          />
        </div>
        
        {/* Time Display */}
        <div className="flex justify-between text-xs text-[#476285] font-mono mb-6">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-10">
          <button 
            className="text-[#004ACC] p-2 active:opacity-70"
            onClick={skipBackwardThrottled}
          >
            <div className="relative">
              <RotateCcw size={24} strokeWidth={1.5} />
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[8px] font-medium pt-0.5">15</span>
            </div>
          </button>

          <button 
            className="w-14 h-14 rounded-[999px] border-2 border-[#004ACC] flex items-center justify-center text-[#004ACC] shadow-md active:scale-95 transition-transform"
            onClick={togglePlayThrottled}
          >
            {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
          </button>

          <button 
            className="text-[#004ACC] p-2 active:opacity-70"
            onClick={skipForwardThrottled}
          >
             <div className="relative">
              <RotateCw size={24} strokeWidth={1.5} />
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[8px] font-medium pt-0.5">15</span>
            </div>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-[#FFFFFF] mt-1 border-t border-[#E2EBF5]/60 z-10 sticky top-[60px]">
        <div className="flex">
          <button 
            className={`flex-1 py-3 text-sm font-medium relative transition-colors ${activeTab === 'questions' ? 'text-[#004ACC]' : 'text-[#476285]'}`}
            onClick={() => setActiveTab('questions')}
          >
            问题清单
            {activeTab === 'questions' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-[#004ACC] rounded-t-full" />
            )}
          </button>
          <button 
            className={`flex-1 py-3 text-sm font-medium relative transition-colors ${activeTab === 'transcription' ? 'text-[#004ACC]' : 'text-[#476285]'}`}
            onClick={() => setActiveTab('transcription')}
          >
            录音转写
            {activeTab === 'transcription' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-[#004ACC] rounded-t-full" />
            )}
          </button>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div ref={scrollContainerRef} onScroll={handleContentScroll} className="flex-1 overflow-y-auto p-4 scroll-smooth">
        {activeTab === 'questions' ? (
          <div className="space-y-3">
             <div className="text-xs text-[#8AA2BF] mb-2 pl-1">已自动匹配 {questions.filter(q => q.isAnswered).length} / {questions.length} 项</div>
             {questions.map((q, index) => (
               <div key={q.id} className="bg-[#FFFFFF] rounded-[14px] px-4 py-3 shadow-[0_3px_10px_rgba(15,40,72,0.04)] border border-[#E2EBF5]/50 transition-all">
                 <div 
                   className="flex items-center justify-between cursor-pointer py-1"
                   onClick={() => q.details && setExpandedQuestion(expandedQuestion === q.id ? null : q.id)}
                 >
                   <h3 className={`flex-1 text-[15px] leading-snug font-medium pr-3 ${q.isAnswered ? 'text-[#0F2848]' : 'text-[#476285]'}`}>
                     {index + 1}. {q.text}
                   </h3>
                   
                   <div className="flex items-center gap-3">
                      {q.details && (
                        <div className="text-[#8AA2BF]">
                          {expandedQuestion === q.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                      )}

                      <div className="min-w-[20px]">
                        {q.isAnswered ? (
                          <div className="text-[#004ACC]">
                            <CheckCircle size={22} fill="white" />
                          </div>
                        ) : (
                          <div className="w-[18px] h-[18px] rounded-[999px] border border-gray-300 ml-[2px]"></div>
                        )}
                      </div>
                   </div>
                 </div>

                 {expandedQuestion === q.id && q.details && (
                   <div className="mt-3 text-sm text-[#476285] leading-relaxed bg-[#F7FAFE] p-3 rounded-lg border border-[#E2EBF5]/70 flex gap-2">
                     <span className="text-[#004ACC] font-medium shrink-0">A:</span>
                     <span>{q.details}</span>
                   </div>
                 )}
               </div>
             ))}
             {/* iOS 兼容：使用实际 DOM 元素作为底部占位，确保滚动区域正确 */}
             <div style={{ height: 120, flexShrink: 0 }} />
          </div>
        ) : (
          <div className="space-y-6">
             {transcriptionList.length > 0 ? (
               transcriptionList.map((item, index) => (
                 <div key={index} className="flex gap-3">
                   <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0">
                     <div className="w-8 h-8 bg-[#337DFF] rounded-[999px] flex items-center justify-center">
                        <User size={16} className="text-[#004ACC]" fill="currentColor" />
                     </div>
                   </div>
                   
                   <div className="flex-1">
                     <div className="text-xs text-[#476285] mb-1.5 ml-1 font-medium">
                       {item.contentType || `访谈对象${item.roleId || item.id || ''}`}
                     </div>
                     <div 
                        /* 暂时注释掉点击跳转录音功能
                        onClick={() => {
                          if (audioRef.current && item.audioStartTime !== undefined) {
                            const seekTime = item.audioStartTime / 1000;
                            audioRef.current.currentTime = seekTime;
                            if (audioRef.current.paused) {
                              audioRef.current.play().catch(e => console.error('Play triggered by seek failed:', e));
                              setIsPlaying(true);
                            }
                            Toast.info(`已跳转至 ${formatTime(seekTime).substring(3)}`);
                          }
                        }}
                        */
                        className="bg-[#004ACC1A] p-3.5 rounded-[18px] rounded-tl-sm text-[15px] text-[#476285] leading-relaxed shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-colors"
                      >
                       {item.content || '暂无内容'}
                     </div>
                   </div>
                 </div>
               ))
             ) : (
               <div className="flex flex-col items-center justify-center py-12 text-[#8AA2BF]">
                 <p className="text-sm">暂无转写记录</p>
               </div>
             )}
             {/* 加载更多提示 */}
             {loadingMoreTranscription && (
               <div className="flex justify-center py-4">
                 <div className="w-5 h-5 border-2 border-[#E2EBF5] border-t-[#004ACC] rounded-[999px] animate-spin"></div>
               </div>
             )}
             {!hasMoreTranscription && transcriptionList.length > 0 && (
               <div className="text-center text-xs text-[#8AA2BF] py-3">没有更多了</div>
             )}
             {/* iOS 兼容：使用实际 DOM 元素作为底部占位，确保滚动区域正确 */}
             <div style={{ height: 120, flexShrink: 0 }} />
          </div>
        )}
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 px-4 py-3 z-30 flex gap-4 items-center justify-between bg-[#FFFFFF] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.04)]">
        <div className="absolute top-0 left-4 right-4 h-[1px] bg-[#E2EBF5]" />
        <Button 
          disabled
          className="flex-1 rounded-[999px] border border-[#E2EBF5] bg-[#FFFFFF] text-[#8AA2BF] font-medium shadow-none"
          variant="secondary"
        >
           已结束
        </Button>
      </div>
    </div>
  );
};

export default HistoryDetailPage;

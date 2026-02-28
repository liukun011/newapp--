import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause, X } from 'lucide-react';

interface AudioPlayerModalProps {
  visible: boolean;
  onClose: () => void;
  audioUrl: string;
  fileName?: string;
}

const AudioPlayerModal: React.FC<AudioPlayerModalProps> = ({ visible, onClose, audioUrl, fileName }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // 格式化时间为 mm:ss
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!visible || !containerRef.current || !audioUrl) return;

    // 清理之前的实例
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
    }

    setIsReady(false);
    setIsPlaying(false);
    setErrorMsg('');
    setCurrentTime(0);
    setDuration(0);

    try {
      const ws = WaveSurfer.create({
        container: containerRef.current,
        waveColor: '#C3D1FD',
        progressColor: '#4337F1',
        cursorColor: '#4337F1',
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        height: 60,
        dragToSeek: true, // 允许拖动进度
        interact: true,
        normalize: true,
      });

      wavesurferRef.current = ws;

      ws.on('ready', () => {
        setIsReady(true);
        setDuration(ws.getDuration());
      });

      ws.on('audioprocess', () => {
        setCurrentTime(ws.getCurrentTime());
      });

      ws.on('interaction', () => {
        setCurrentTime(ws.getCurrentTime());
      });

      ws.on('finish', () => {
        setIsPlaying(false);
        ws.seekTo(0);
        setCurrentTime(0);
      });

      ws.on('error', (err) => {
        console.error('Wavesurfer error:', err);
        setErrorMsg('音频加载失败，可能是不支持的格式或网络问题');
      });

      ws.load(audioUrl);
    } catch (err) {
      console.error('Wavesurfer init error:', err);
      setErrorMsg('播放器初始化失败');
    }

    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }
    };
  }, [visible, audioUrl]);

  const togglePlay = () => {
    if (wavesurferRef.current && isReady) {
      if (isPlaying) {
        wavesurferRef.current.pause();
      } else {
        wavesurferRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      
      {/* Modal Content */}
      <div className="relative bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-[scaleIn_0.2s_ease-out]">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex-1 min-w-0">
            <h3 className="text-[17px] font-bold text-slate-800 truncate">
              {fileName || '录音播放'}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">点击波形图可拖动进度</p>
          </div>
          <button 
            onClick={onClose} 
            className="ml-4 p-2 text-gray-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Player Body */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 mb-8 relative">
          {/* Waveform container */}
          <div ref={containerRef} className="w-full h-[60px] cursor-pointer" />
          
          {/* Time Display */}
          <div className="flex justify-between mt-3 px-1">
            <span className="text-[11px] font-medium text-indigo-600 tabular-nums">
              {formatTime(currentTime)}
            </span>
            <span className="text-[11px] font-medium text-slate-400 tabular-nums">
              {formatTime(duration)}
            </span>
          </div>
          
          {/* Loading State */}
          {!isReady && !errorMsg && (
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-slate-50/80 rounded-2xl z-10">
               <div className="flex flex-col items-center gap-2 text-indigo-500">
                  <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                  <span className="text-[11px] font-medium">音频解析中...</span>
               </div>
             </div>
          )}

          {/* Error State */}
          {errorMsg && (
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-red-50/90 rounded-2xl z-20 px-6">
               <span className="text-[12px] text-red-500 font-medium text-center">{errorMsg}</span>
             </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex justify-center mb-2">
          <button 
            onClick={togglePlay}
            disabled={!isReady || !!errorMsg}
            className={`w-16 h-16 rounded-full flex items-center justify-center text-white transition-all transform active:scale-90 ${
              isReady && !errorMsg 
                ? 'bg-gradient-to-tr from-[#4337F1] to-[#6366F1] shadow-xl shadow-indigo-500/30' 
                : 'bg-slate-200 cursor-not-allowed grayscale'
            }`}
          >
            {isPlaying ? (
              <Pause size={28} fill="currentColor" />
            ) : (
              <Play size={28} fill="currentColor" className="ml-1" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayerModal;

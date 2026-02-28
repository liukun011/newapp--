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

  useEffect(() => {
    if (!visible || !containerRef.current || !audioUrl) return;

    // 清理之前的实例
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
    }

    setIsReady(false);
    setIsPlaying(false);
    setErrorMsg('');

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
      });

      wavesurferRef.current = ws;

      ws.on('ready', () => {
        setIsReady(true);
      });

      ws.on('finish', () => {
        setIsPlaying(false);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={onClose} />
      
      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl w-[90%] max-w-sm p-5 shadow-xl animate-[scaleIn_0.2s_ease-out]">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
          <h3 className="text-base font-bold text-slate-800 truncate pr-4">
            {fileName || '录音播放'}
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Player Body */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-5 relative min-h-[92px]">
          {/* Waveform container */}
          <div ref={containerRef} className="w-full h-[60px]" />
          
          {/* Loading State */}
          {!isReady && !errorMsg && (
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-slate-50/80 rounded-xl z-10">
               <div className="flex items-center gap-2 text-indigo-500">
                  <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                  <span className="text-xs font-medium">音频加载中...</span>
               </div>
             </div>
          )}

          {/* Error State */}
          {errorMsg && (
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-red-50/90 rounded-xl z-20">
               <span className="text-xs text-red-500 font-medium px-4 text-center">{errorMsg}</span>
             </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex justify-center">
          <button 
            onClick={togglePlay}
            disabled={!isReady || !!errorMsg}
            className={`w-[52px] h-[52px] rounded-full flex items-center justify-center text-white transition-all transform active:scale-95 ${
              isReady && !errorMsg 
                ? 'bg-[#4337F1] shadow-lg shadow-indigo-500/30 hover:bg-indigo-600' 
                : 'bg-gray-300 cursor-not-allowed opacity-70'
            }`}
          >
            {isPlaying ? (
              <Pause size={24} fill="currentColor" />
            ) : (
              <Play size={24} fill="currentColor" className="ml-1" /> // Play icon visual centering tweak
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayerModal;

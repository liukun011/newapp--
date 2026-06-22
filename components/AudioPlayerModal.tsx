import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause, X } from 'lucide-react';
// @ts-ignore
import BenzAMRRecorder from 'benz-amr-recorder';

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

  // 将 PCM 采样数据转换为 WAV Blob
  const pcmToWav = (samples: Float32Array, sampleRate: number) => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (view: DataView, offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    const floatTo16BitPCM = (output: DataView, offset: number, input: Float32Array) => {
      for (let i = 0; i < input.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, input[i]));
        output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      }
    };

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true); // 单声道
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true); // 1 channel * 2 bytes
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);
    floatTo16BitPCM(view, 44, samples);

    return new Blob([buffer], { type: 'audio/wav' });
  };

  useEffect(() => {
    if (!visible || !audioUrl) return;

    const isAmr = audioUrl.toLowerCase().endsWith('.amr') || fileName?.toLowerCase().endsWith('.amr');

    const cleanup = () => {
      if (wavesurferRef.current) {
        try { wavesurferRef.current.destroy(); } catch (e) { console.warn(e); }
        wavesurferRef.current = null;
      }
    };

    cleanup();
    setIsReady(false);
    setIsPlaying(false);
    setErrorMsg('');
    setCurrentTime(0);
    setDuration(0);

    const initWaveSurfer = (url: string | Blob) => {
      if (!containerRef.current) return;
      try {
        const ws = WaveSurfer.create({
          container: containerRef.current,
          waveColor: '#C3D1FD',
          progressColor: '#2563EB',
          cursorColor: '#2563EB',
          barWidth: 2,
          barGap: 1,
          barRadius: 2,
          height: 60,
          dragToSeek: true,
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
          setErrorMsg('音频播放失败，请稍后重试');
        });

        if (url instanceof Blob) {
          ws.loadBlob(url);
        } else {
          ws.load(url);
        }
      } catch (err) {
        console.error('Wavesurfer init error:', err);
        setErrorMsg('播放器启动失败');
      }
    };

    if (isAmr) {
      const amr = new BenzAMRRecorder();
      amr.initWithUrl(audioUrl).then(() => {
        // 使用 amr 内部已解码的采样数据转换为 WaveSurfer 可识别的 WAV
        // @ts-ignore
        const samples = amr._samples;
        if (samples && samples.length > 0) {
          const wavBlob = pcmToWav(samples, 8000);
          initWaveSurfer(wavBlob);
        } else {
          setErrorMsg('AMR 录音数据解析为空');
        }
      }).catch((err: any) => {
        console.error('AMR init error:', err);
        setErrorMsg('AMR 录音加载失败');
      });
    } else {
      setTimeout(() => initWaveSurfer(audioUrl), 50);
    }

    return cleanup;
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
      <div className="relative bg-[#FFFFFF] rounded-[22px] border border-[#E2EBF5] w-full max-w-sm p-6 shadow-[0_18px_44px_rgba(15,40,72,0.16)] animate-[scaleIn_0.2s_ease-out]">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex-1 min-w-0">
            <h3 className="text-[17px] font-semibold text-[#0F2848] truncate pr-2">
              {fileName || '录音播放'}
            </h3>
            <p className="text-[11px] text-[#476285] mt-0.5">点击波形图可拖动进度</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-[#8AA2BF] hover:text-[#2563EB] rounded-[12px] hover:bg-[#2563EB1A] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Player Body */}
        <div className="bg-[#FFFFFF] border border-[#E2EBF5] rounded-[16px] p-5 mb-8 relative">
          {/* Waveform container */}
          <div ref={containerRef} className="w-full h-[60px] cursor-pointer" />
          
          {/* Time Display */}
          <div className="flex justify-between mt-3 px-1">
            <span className="text-[11px] font-medium text-[#2563EB] tabular-nums">
              {formatTime(currentTime)}
            </span>
            <span className="text-[11px] font-medium text-[#8AA2BF] tabular-nums">
              {formatTime(duration)}
            </span>
          </div>
          
          {/* Loading State */}
          {!isReady && !errorMsg && (
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-[#FFFFFF]/80 rounded-[16px] z-10">
               <div className="flex flex-col items-center gap-2 text-[#2563EB]">
                  <div className="w-5 h-5 border-2 border-[#E2EBF5] border-t-[#2563EB] rounded-full animate-spin"></div>
                  <span className="text-[11px] font-medium">音频加载中...</span>
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
                ? 'bg-[#2563EB] shadow-xl shadow-[rgba(37, 99, 235,0.22)]' 
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

import React, { useState } from 'react';
import { Mic } from 'lucide-react';

interface VoiceInputModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (content: string) => void;
}

const VoiceInputModal: React.FC<VoiceInputModalProps> = ({
  visible,
  onClose,
  onSave
}) => {
  const [content, setContent] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  if (!visible) return null;

  const handleSave = () => {
    onSave(content);
    setContent('');
    onClose();
  };

  const handleRecordClick = () => {
    // TODO: 实现语音录入功能
    setIsRecording(!isRecording);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={handleBackdropClick}
    >
      <div 
        className="w-full bg-white rounded-t-3xl animate-slide-up"
        style={{ 
          maxHeight: '80vh',
          animation: 'slideUp 0.3s ease-out'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-lg font-bold text-slate-800">补充信息</h2>
          <button 
            onClick={handleSave}
            className="px-4 py-1.5 border border-indigo-500 text-indigo-600 rounded-full text-sm font-medium hover:bg-indigo-50 active:scale-95 transition-all"
          >
            保存
          </button>
        </div>

        {/* Text Input Area */}
        <div className="px-5 relative">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="请输入需要补充的文字信息，或点击录音按钮进行语音输入..."
            className="w-full h-48 p-4 pb-16 bg-gray-50 rounded-2xl text-sm text-slate-700 placeholder-gray-400 resize-none border border-gray-200 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
          />
          
          {/* Voice Record Button - positioned on bottom border */}
          <div 
            className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center"
            style={{ transform: 'translateX(-50%) translateY(58%)' }}
          >
            <button 
              onClick={handleRecordClick}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-lg ${
                isRecording 
                  ? 'bg-red-500 animate-pulse' 
                  : 'bg-indigo-500 hover:bg-indigo-600'
              }`}
            >
              <Mic size={24} className="text-white" />
            </button>
            <span className="mt-2 text-sm text-gray-500">
              {isRecording ? '录音中...' : '点击录音'}
            </span>
          </div>
        </div>

        {/* Bottom Safe Area */}
        <div className="h-24" />
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default VoiceInputModal;

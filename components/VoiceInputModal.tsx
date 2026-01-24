import React, { useState, useEffect } from 'react';
import { Mic } from 'lucide-react';
import { Toast } from 'react-vant';
import { dealService } from '../services/dealService';
import { nativeBridge, handleTranscriptionResult } from '../services/nativeBridge';

interface VoiceInputModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (content: string) => void;
  dealId?: string;
  initialContent?: string;
}

const VoiceInputModal: React.FC<VoiceInputModalProps> = ({
  visible,
  onClose,
  onSave,
  dealId,
  initialContent = ''
}) => {
  const [content, setContent] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  // 当弹框打开时，设置初始内容
  useEffect(() => {
    if (visible) {
      setContent(initialContent);
    }
  }, [visible, initialContent]);



  const handleSave = async () => {
    if (!content.trim()) {
      Toast.info('请输入补充信息');
      return;
    }

    if (!dealId) {
      Toast.fail('未找到尽调实例');
      return;
    }

    try {
      Toast.loading({ message: '保存中...', duration: 0, forbidClick: true });
      const res = await dealService.appendResource({
        interviewDealInstId: dealId,
        appendText: content.trim(),
      });
      Toast.clear();

      if (res.success) {
        Toast.success('保存成功');
        onSave(content);
        setContent('');
        onClose();
      } else {
        Toast.fail(res.message || '保存失败');
      }
    } catch (error) {
      Toast.clear();
      console.error('Save voice input failed:', error);
      Toast.fail('保存失败');
    }
  };

  // 监听转写结果
  useEffect(() => {
    if (!visible) return;

    const handleTranscription = (response: any) => {
       // 参考 nativeBridge.ts 中的 handleTranscriptionResult 逻辑
       if (response.data) {
         try {
           const resultStr = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
           const parsed = handleTranscriptionResult(resultStr);
           
           // Only append text if it is the final result
           if (parsed && parsed.text && parsed.isFinal) {
             console.log('[VoiceInput] Transcribed (Final):', parsed.text);
             setContent(prev => prev + parsed.text);
           }
         } catch (e) {
           console.error('[VoiceInput] Parse transcription error:', e);
         }
       }
    };

    const handleInterrupt = () => {
       setIsRecording(false);
       Toast.info('录音已中断');
    };

    try {
      if (nativeBridge) {
        nativeBridge.on('transcriptionResult', handleTranscription);
        nativeBridge.on('recordingInterrupted', handleInterrupt);
      } else {
        console.error('nativeBridge is undefined');
      }
    } catch (e) {
      console.error('Error registering native listeners:', e);
    }

    return () => {
      try {
        if (nativeBridge) {
          nativeBridge.off('transcriptionResult', handleTranscription);
          nativeBridge.off('recordingInterrupted', handleInterrupt);
        }
      } catch (e) {
        console.error('Error removing native listeners:', e);
      }
    };
  }, [visible]);

  // 关闭时确保停止录音
  useEffect(() => {
    if (!visible && isRecording) {
      try {
        if (nativeBridge) {
          nativeBridge.stopRecording();
        }
      } catch (e) {
        console.error('Error stopping recording:', e);
      }
      setIsRecording(false);
    }
  }, [visible, isRecording]);

  const handleRecordClick = () => {
    try {
      if (isRecording) {
        // 停止录音
        if (nativeBridge) nativeBridge.stopRecording();
        setIsRecording(false);
      } else {
        // 开始录音
        if (nativeBridge) nativeBridge.startRecording();
        setIsRecording(true);
        Toast.info('开始录音，请说话...');
      }
    } catch (e) {
      console.error('Record action failed:', e);
      Toast.fail('录音操作失败');
      setIsRecording(false);
    }
  };

  if (!visible) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
    >
      <div 
        className="w-full bg-white rounded-t-3xl animate-slide-up"
        style={{ 
          maxHeight: '80vh',
          // animation handled by class
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-lg font-bold text-slate-800">补充信息</h2>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                if(isRecording) {
                  try {
                    if (nativeBridge) nativeBridge.stopRecording();
                  } catch(e) { console.error(e); }
                  setIsRecording(false);
                }
                onClose();
              }}
              className="px-5 py-1.5 border border-gray-300 text-gray-600 rounded-full text-base font-medium active:scale-95 transition-transform"
            >
              取消
            </button>
            
            <button 
              onClick={handleSave}
              className="px-5 py-1.5 border border-[#4E3EF8] text-[#4E3EF8] rounded-full text-base font-medium active:scale-95 transition-transform"
            >
              保存
            </button>
          </div>
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
              {isRecording ? '录音中...' : '点击录音转写'}
            </span>
          </div>
        </div>

        {/* Bottom Safe Area */}
        <div className="h-24" />
      </div>
    </div>
  );
};

export default VoiceInputModal;

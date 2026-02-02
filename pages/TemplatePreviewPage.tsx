import React, { memo } from 'react';
import { ArrowLeft } from 'lucide-react';
import config from '../config';

interface TemplatePreviewPageProps {
  templateName: string;
  templateUrl: string;
  templateId?: string;
  onSelect?: (id: string) => void;
  onBack: () => void;
}

const TemplatePreviewPage: React.FC<TemplatePreviewPageProps> = ({
  templateName,
  templateUrl,
  templateId,
  onSelect,
  onBack
}) => {
  // 监听原生返回键
  React.useEffect(() => {
    const handleNativeBack = (e: Event) => {
      e.preventDefault();
      onBack();
    };

    window.addEventListener('requestNativeBack', handleNativeBack);
    return () => {
      window.removeEventListener('requestNativeBack', handleNativeBack);
    };
  }, [onBack]);

  return (
    <div className="flex flex-col h-screen bg-[#F7F8FA]">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 shadow-sm">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-700">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-slate-800 truncate flex-1">
          {templateName || '模板预览'}
        </h1>
      </div>

      {/* Preview Content */}
      <div className="flex-1 relative overflow-hidden bg-white mb-[80px]"> 
        {templateUrl ? (
          <iframe 
            className="absolute inset-0 w-full h-full border-none"
            src={`${config.previewUrl}?url=${encodeURIComponent(window.btoa(unescape(encodeURIComponent(templateUrl))))}`} 
            title="模板预览"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <p>暂无预览内容</p>
          </div>
        )}
      </div>

      {/* Select Button - Fixed at bottom */}
      {onSelect && templateId && (
        <div className="fixed bottom-0 left-0 right-0 p-4 z-50 safe-area-bottom">
           <button
             onClick={() => onSelect(templateId)}
             className="w-full py-3 bg-indigo-600 text-white rounded-full font-bold active:scale-95 transition-transform shadow-lg shadow-indigo-200"
           >
             选择此模板
           </button>
        </div>
      )}
    </div>
  );
};

export default memo(TemplatePreviewPage);

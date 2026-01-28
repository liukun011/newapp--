import React, { memo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { SitesUrl } from '../constants';

interface TemplatePreviewPageProps {
  templateName: string;
  templateUrl: string;
  onBack: () => void;
}

const TemplatePreviewPage: React.FC<TemplatePreviewPageProps> = ({
  templateName,
  templateUrl,
  onBack
}) => {
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
      <div className="flex-1 relative overflow-hidden bg-white">
        {templateUrl ? (
          <iframe 
            className="absolute inset-0 w-full h-full border-none"
            src={`${SitesUrl.preview}?url=${encodeURIComponent(window.btoa(unescape(encodeURIComponent(templateUrl))))}`} 
            title="模板预览"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <p>暂无预览内容</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(TemplatePreviewPage);

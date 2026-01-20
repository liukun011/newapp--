import React from 'react';
import { ArrowLeft, Download } from 'lucide-react';
import { Toast } from 'react-vant';

interface ReportPreviewPageProps {
  reportName: string;
  reportUrl: string;
  previewUrl: string;
  onBack: () => void;
}

const ReportPreviewPage: React.FC<ReportPreviewPageProps> = ({
  reportName,
  reportUrl,
  previewUrl,
  onBack
}) => {
  const handleDownload = () => {
    try {
      // 创建一个隐藏的 a 标签来触发下载
      const link = document.createElement('a');
      link.href = reportUrl;
      link.download = reportName || '尽调报告.docx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      Toast.success('开始下载');
    } catch (error) {
      console.error('Download failed:', error);
      Toast.fail('下载失败');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#F7F8FA]">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 shadow-sm relative z-[60]">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-700">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-slate-800 truncate flex-1">
          {reportName || '报告预览'}
        </h1>
      </div>

      {/* Preview Content */}
      <div className="flex-1 relative overflow-hidden bg-white">
        {previewUrl ? (
          <iframe 
            className="absolute inset-0 w-full h-full border-none"
            src={previewUrl}
            title="报告预览"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <p>暂无预览内容</p>
          </div>
        )}
      </div>

      {/* Download Button */}
      <div className="bg-white px-4 py-3 shadow-lg border-t border-gray-100 relative z-[60]">
        <button
          onClick={handleDownload}
          className="w-full py-3 bg-indigo-600 text-white rounded-full font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <Download size={20} />
          立即下载
        </button>
      </div>
    </div>
  );
};

export default ReportPreviewPage;

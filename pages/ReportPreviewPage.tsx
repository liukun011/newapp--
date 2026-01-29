import React from 'react';
import { ArrowLeft, Download } from 'lucide-react';
import { Toast } from 'react-vant';
import { nativeBridge } from '../services/nativeBridge';

interface ReportPreviewPageProps {
  reportName: string;
  reportUrl: string;
  previewUrl: string;
  showDownloadButton?: boolean;
  onBack: () => void;
}

const ReportPreviewPage: React.FC<ReportPreviewPageProps> = ({
  reportName,
  reportUrl,
  previewUrl,
  showDownloadButton = false,
  onBack
}) => {
  const handleDownload = () => {
      // 监听下载结果
      const handleDownloadResult = (response: any) => {
        console.log('[Native] Download Callback:', JSON.stringify(response));

        // 兼容处理：检查外层 message 是否为 "下载成功" 或 success=true
        if (response.success) {
           if (response.data?.percent === 100 || response.message === '下载成功') {
              Toast.success('下载成功');
              nativeBridge.off('onDownloadResult', handleDownloadResult);
           }
        } else {
           // 失败
           Toast.fail(response.message || '下载失败');
           nativeBridge.off('onDownloadResult', handleDownloadResult);
        }
      };
  
      nativeBridge.on('onDownloadResult', handleDownloadResult);
      
      Toast.loading({ message: '开始下载...', duration: 1000 });
      nativeBridge.downloadFile({ filePath: reportUrl });
  
      // Timeout protection
      setTimeout(() => {
          nativeBridge.off('onDownloadResult', handleDownloadResult);
      }, 60000);
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
      {showDownloadButton && (
        <div className="fixed bottom-0 left-0 right-0 p-4 z-[60]">
          <button
            onClick={handleDownload}
            className="w-full py-3 bg-indigo-600 text-white rounded-full font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-indigo-200"
          >
            <Download size={20} />
            立即下载
          </button>
        </div>
      )}
    </div>
  );
};

export default ReportPreviewPage;

import React from 'react';
import { ArrowLeft, Download, RefreshCw } from 'lucide-react';
import { Toast } from 'react-vant';
import { nativeBridge } from '../services/nativeBridge';
import { useThrottleFn } from '../hooks/useThrottleFn';

interface ReportPreviewPageProps {
  reportName: string;
  reportUrl: string;
  previewUrl: string;
  showDownloadButton?: boolean;
  actionButtonText?: string;
  onAction?: () => void;
  onBack: () => void;
  onRefresh?: () => void;
}

const ReportPreviewPage: React.FC<ReportPreviewPageProps> = ({
  reportName,
  reportUrl,
  previewUrl,
  showDownloadButton = false,
  actionButtonText,
  onAction,
  onBack,
  onRefresh
}) => {
  const previewHtml = React.useMemo(() => {
    const prefix = 'data:text/html;charset=utf-8,';
    if (!previewUrl?.startsWith(prefix)) return '';
    return decodeURIComponent(previewUrl.slice(prefix.length));
  }, [previewUrl]);

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

  const handleDownloadThrottled = useThrottleFn(handleDownload, 1500);
  const handleActionThrottled = useThrottleFn(() => onAction?.(), 1500);

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
    <div className="flex flex-col h-screen bg-[#F7FAFE]">
      {/* Header */}
      <div className="bg-[#FFFFFF] px-4 py-3 flex items-center gap-3 shadow-[0_3px_10px_rgba(15,40,72,0.04)] relative z-[60]">
        <button onClick={onBack} className="p-2 -ml-2 text-[#476285]">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-medium text-[#0F2848] truncate flex-1">
          {reportName || '报告预览'}
        </h1>
        {onRefresh && (
          <button 
            onClick={onRefresh}
            className="p-2 text-[#476285] active:bg-[#F7FAFE] rounded-[999px] transition-colors"
          >
            <RefreshCw size={20} />
          </button>
        )}
      </div>

      {/* Preview Content */}
      <div className="flex-1 relative overflow-hidden bg-[#FFFFFF]">
        {previewUrl ? (
          <iframe 
            className="absolute inset-0 w-full h-full border-none"
            src={previewHtml ? undefined : previewUrl}
            srcDoc={previewHtml || undefined}
            title="报告预览"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-[#8AA2BF]">
            <p>暂无预览内容</p>
          </div>
        )}
      </div>

      {/* Action Button (Download or Custom) */}
      {(showDownloadButton || actionButtonText) && (
        <div className="fixed bottom-0 left-0 right-0 px-4 py-2 z-[60] bg-[#FFFFFF] border-t border-[#E2EBF5]/60 safe-area-bottom">
          {showDownloadButton ? (
            <button
              onClick={handleDownloadThrottled}
              className="w-full py-3 bg-primary-gradient text-[#FFFFFF] rounded-[999px] font-medium flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-[0_6px_14px_rgba(37, 99, 235,0.14)]"
            >
              <Download size={20} />
              立即下载
            </button>
          ) : (
            <button
              onClick={handleActionThrottled}
              className="w-full py-3 bg-primary-gradient text-[#FFFFFF] rounded-[999px] font-medium flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-[0_6px_14px_rgba(37, 99, 235,0.14)]"
            >
              {actionButtonText}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportPreviewPage;

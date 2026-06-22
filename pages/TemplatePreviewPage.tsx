import React, { memo, useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Toast } from 'react-vant';
import { dealService } from '../services/dealService';
import { mockPreviewHtml } from '../mock/mockData';

interface TemplatePreviewPageProps {
  templateName: string;
  templateUrl: string;
  templateId?: string;
  skipIdInPreview?: boolean; // 是否在预览接口中跳过传ID (如果是模板预览则跳过，文件预览则不跳过)
  onSelect?: (id: string) => void;
  onBack: () => void;
  onPreviewReport?: (name: string, url: string, previewUrl: string, showDownload: boolean) => void;
}

const TemplatePreviewPage: React.FC<TemplatePreviewPageProps> = ({
  templateName,
  templateUrl,
  templateId,
  skipIdInPreview,
  onSelect,
  onBack,
  onPreviewReport
}) => {
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const previewHtml = React.useMemo(() => {
    const prefix = 'data:text/html;charset=utf-8,';
    if (!previewUrl.startsWith(prefix)) return '';
    return decodeURIComponent(previewUrl.slice(prefix.length));
  }, [previewUrl]);

  // 监听原生返回键
  useEffect(() => {
    const handleNativeBack = (e: Event) => {
      e.preventDefault();
      onBack();
    };

    window.addEventListener('requestNativeBack', handleNativeBack);
    return () => {
      window.removeEventListener('requestNativeBack', handleNativeBack);
    };
  }, [onBack]);

  // 获取真实预览地址
  useEffect(() => {
    const fetchPreviewUrl = async () => {
      // 如果没有ID或URL，无法调用接口
      // 如果 skipIdInPreview 为 true，则只校验 url
      const missingId = !skipIdInPreview && !templateId;
      
      if (missingId || !templateUrl) {
         setPreviewUrl(mockPreviewHtml(templateName || '模板预览', '<p>当前模板暂无文件地址，已展示离线 mock 预览内容。</p>'));
         return;
      }

      try {
        setLoading(true);
        Toast.loading({ message: '正在加载预览...', duration: 0, forbidClick: true });
        
        // 根据 skipIdInPreview 决定是否传 ID
        const idToPass = skipIdInPreview ? undefined : templateId;
        const res = await dealService.viewReportUrl(idToPass, templateUrl);
        
        Toast.clear();
        
        if (res.success && res.data) {
          setPreviewUrl(String(res.data));
          if (onPreviewReport) {
            onPreviewReport(
              templateName || '模板预览',
              templateUrl,
              res.data,
              false
            );
          }
        } else {
          setPreviewUrl(mockPreviewHtml(templateName || '模板预览', '<p>预览接口暂无数据，已展示离线 mock 预览内容。</p>'));
          Toast.fail(res.message || '加载预览失败');
        }
      } catch (error) {
        Toast.clear();
        console.error('Fetch preview url failed:', error);
        setPreviewUrl(mockPreviewHtml(templateName || '模板预览', '<p>预览加载异常，已展示离线 mock 预览内容。</p>'));
        Toast.fail('加载预览失败');
      } finally {
        setLoading(false);
      }
    };

    fetchPreviewUrl();
  }, [templateId, templateUrl, templateName, skipIdInPreview, onPreviewReport]);

  return (
    <div className="flex flex-col h-screen bg-[#F7FAFE]">
      {/* Header */}
      <div className="bg-[#FFFFFF] px-4 py-3 flex items-center gap-3 shadow-[0_3px_10px_rgba(15,40,72,0.04)]">
        <button onClick={onBack} className="p-2 -ml-2 text-[#476285]">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-medium text-[#0F2848] truncate flex-1">
          {templateName || '模板预览'}
        </h1>
      </div>

      {/* Preview Content */}
      <div className="flex-1 relative overflow-hidden bg-[#FFFFFF] mb-[80px]"> 
        {previewUrl ? (
          <iframe
            className="absolute inset-0 w-full h-full border-none bg-[#FFFFFF]"
            src={previewHtml ? undefined : previewUrl}
            srcDoc={previewHtml || undefined}
            title={templateName || '模板预览'}
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-[#8AA2BF]">
            {loading ? <p>正在加载...</p> : <p>暂无预览内容</p>}
          </div>
        )}
      </div>

      {/* Select Button - Fixed at bottom */}
      {onSelect && templateId && (
        <div className="fixed bottom-0 left-0 right-0 px-4 pb-3 z-50 safe-area-bottom">
           <button
             onClick={() => onSelect(templateId)}
             className="w-full py-3 bg-primary-gradient text-[#FFFFFF] rounded-[999px] font-medium active:scale-95 transition-transform shadow-[0_6px_14px_rgba(37, 99, 235,0.14)]"
           >
             选择此模板
           </button>
        </div>
      )}
    </div>
  );
};

export default memo(TemplatePreviewPage);

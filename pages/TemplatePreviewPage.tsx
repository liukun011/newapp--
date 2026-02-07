import React, { memo, useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Toast } from 'react-vant';
import { dealService } from '../services/dealService';

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
         if (templateUrl) {
           Toast.fail('缺少文件ID，无法预览');
         }
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
          if (onPreviewReport) {
            onPreviewReport(
              templateName || '模板预览',
              templateUrl,
              res.data,
              false
            );
          }
        } else {
          Toast.fail(res.message || '加载预览失败');
        }
      } catch (error) {
        Toast.clear();
        console.error('Fetch preview url failed:', error);
        Toast.fail('加载预览失败');
      } finally {
        setLoading(false);
      }
    };

    fetchPreviewUrl();
  }, [templateId, templateUrl, onPreviewReport]);

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
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
            {loading ? <p>正在加载...</p> : <p>暂无预览内容</p>}
        </div>
      </div>

      {/* Select Button - Fixed at bottom */}
      {onSelect && templateId && (
        <div className="fixed bottom-0 left-0 right-0 px-4 pb-3 z-50 safe-area-bottom">
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

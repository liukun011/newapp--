import React, { useState, useEffect, useRef } from 'react';
import { useThrottleFn } from '../hooks/useThrottleFn';
import { ArrowLeft, Image as ImageIcon } from 'lucide-react';
import { Toast } from 'react-vant';
import Button from '../components/Button';
import { templateService } from '../services/templateService';
import { nativeBridge } from '../services/nativeBridge';

interface UploadTemplatePageProps {
  onBack: () => void;
  onCancel: () => void;
  onSubmit?: () => void;
  onViewList?: () => void; // 查看列表回调
}

const UploadTemplatePage: React.FC<UploadTemplatePageProps> = ({ 
  onBack, 
  onCancel,
  onSubmit,
  onViewList
}) => {
  const [templateName, setTemplateName] = useState('');
  const [selectedFile, setSelectedFile] = useState<{name: string, url: string} | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // 上传状态锁
  const isUploadingRef = useRef(false);

  // 处理Native文件上传
  const uploadNativeFile = async (localPath: string) => {
      if (isUploadingRef.current) return;
      isUploadingRef.current = true;
      
      try {
          Toast.loading({ message: '文件处理中...', duration: 0, forbidClick: true });
          
          const token = localStorage.getItem('zov-user-token') || '';
          const uploadHost = 'http://68.79.42.215/report/upload/file'; // 硬编码

          const params = {
              host: uploadHost,
              authorization: token,
              filePath: localPath,
          };
          
          console.log('[模板上传] 开始上传文件:', localPath);

          const serverUrl = await new Promise<string>((resolve, reject) => {
               const resultHandler = (res: any) => {
                   const resultData = res.data?.result || (res.data?.success !== undefined ? res.data : null);
                   const isSuccess = res.success && (resultData?.success === true || resultData?.errno === 0);

                   if (isSuccess) {
                       const url = resultData.data?.url || resultData.url || (typeof resultData.data === 'string' ? resultData.data : "");
                       if (url) {
                           nativeBridge.off('onUploadResult', resultHandler);
                           resolve(url);
                       }
                   } else if (res.success && res.data?.percent !== undefined) {
                       Toast.loading({ message: `上传中 ${res.data.percent}%`, duration: 0 });
                   } else {
                       if (res.success === false || (resultData && resultData.success === false)) {
                           nativeBridge.off('onUploadResult', resultHandler);
                           reject(new Error(resultData?.message || res.message || '上传失败'));
                       }
                   }
               };
               
               nativeBridge.on('onUploadResult', resultHandler);
               nativeBridge.uploadInterviewFile(params);
               
               setTimeout(() => {
                   nativeBridge.off('onUploadResult', resultHandler);
                   reject(new Error('上传超时'));
               }, 60000);
          });

          console.log('[模板上传] 上传成功:', serverUrl);
          
          // 获取文件名（从路径截取）
          const fileName = localPath.split('/').pop() || '上传文件';
          
          setSelectedFile({
              name: fileName,
              url: serverUrl
          });
          
          Toast.clear();
          Toast.success('文件已就绪');

      } catch (error: any) {
          console.error('Native upload failed:', error);
          Toast.clear();
          Toast.fail(error.message || '文件上传失败');
      } finally {
          isUploadingRef.current = false;
      }
  };

  useEffect(() => {
      const handleFileSelected = (res: any) => {
          if (res.success && res.data && res.data.fileURL) {
               console.log('[模板上传] 收到文件:', res.data.fileURL);
               uploadNativeFile(res.data.fileURL);
          }
      };

      nativeBridge.on('fileSelected', handleFileSelected);
      return () => {
          nativeBridge.off('fileSelected', handleFileSelected);
      };
  }, []);

  const handleChooseFile = () => {
      if (isUploadingRef.current) return;
      nativeBridge.chooseFile();
  };

  const handleSubmit = async () => {
    if (!templateName.trim()) {
      Toast.info('请输入模板名称');
      return;
    }

    if (!selectedFile) {
      Toast.info('请上传模板文件');
      return;
    }

    setLoading(true);
    try {
      const res = await templateService.addApproveReportNew({
        approveReportName: templateName.trim(),
        approveTemplateUrl: selectedFile.url,
      });

      if (res.success) {
        setShowSuccess(true);
        onSubmit?.();
      } else {
        Toast.fail(res.message || '提交失败，请重试');
      }
    } catch (error) {
      console.error('Failed to submit template:', error);
      Toast.fail('提交失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitThrottled = useThrottleFn(handleSubmit, 1000);

  // 如果显示成功页面
  if (showSuccess) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F7F8FA]">
        {/* Header with back button */}
        <div className="bg-white px-4 py-3 flex items-center border-b border-gray-100">
          <button 
            onClick={onBack}
            className="p-2 -ml-2 text-slate-700 hover:bg-slate-50 rounded-full active:bg-slate-100 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
        </div>

        {/* Success Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-32">
          {/* Mascot Image */}
          <div className="mb-8 relative">
            <img 
              src="/talk-assistant/assets/success-mascot.png" 
              alt="Success" 
              className="w-48 h-48 object-contain relative z-10"
              onError={(e) => {
                // Fallback to a placeholder if image not found
                e.currentTarget.style.display = 'none';
              }}
            />
            {/* Blue gradient blur effect below image */}
            <div 
              className="absolute w-40 h-12"
              style={{
                bottom: '-12px',
                left: '52%',
                transform: 'translateX(-50%)',
                background: 'linear-gradient(180deg, #D5E5FF 0%, #9DC3FF 97%)',
                filter: 'blur(14px)',
                borderRadius: '50%',
              }}
            />
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-slate-800 mb-3">
            已进入审核队列
          </h2>

          {/* Description */}
          <p className="text-sm text-gray-500 text-center leading-relaxed max-w-sm">
            您的模板已成功上传，系统将在 1-2 小时内完成合规审核，请在"审核中"分类查看进度
          </p>

          {/* View List Button */}
          <button
            onClick={onViewList}
            className="mt-12 w-64 h-14 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-base font-semibold rounded-full shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 active:scale-95 transition-all"
          >
            查看列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F7F8FA]">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-center relative border-b border-gray-100">
        <button 
          onClick={onBack}
          className="absolute left-4 p-2 text-slate-700 hover:bg-slate-50 rounded-full active:bg-slate-100 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-semibold text-slate-800">上传访谈模板</h1>
      </div>

      {/* Form Content */}
      <div className="flex-1 px-4 pt-6 pb-24">
        {/* Template Name */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-600 mb-2 px-1">
            模板名称 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="A公司流贷尽调"
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-slate-800 placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-colors"
          />
        </div>

        {/* Upload Template */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2 px-1">
            上传模板 <span className="text-red-500">*</span>
          </label>
            <div 
              className="bg-white rounded-xl border border-dashed border-gray-300 p-8 flex flex-col items-center justify-center min-h-[200px] hover:border-indigo-400 transition-colors cursor-pointer active:bg-gray-50"
              onClick={handleChooseFile}
            >
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <ImageIcon size={28} className="text-gray-400" />
              </div>
              {selectedFile ? (
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-800 mb-1">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">点击重新选择</p>
                </div>
              ) : (
                <p className="text-sm text-gray-400">请上传模板附件</p>
              )}
            </div>
        </div>
      </div>

      {/* Fixed Bottom Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4 pb-8">
        <div className="flex gap-3 max-w-md mx-auto">
          <Button
            variant="secondary"
            block
            onClick={onCancel}
            className="flex-1 !rounded-full !h-12 !text-base !border-gray-200 !text-gray-700"
          >
            取消
          </Button>
          <Button
            variant="primary"
            block
            onClick={handleSubmitThrottled}
            disabled={loading}
            className="flex-1 !rounded-full !h-12 !text-base shadow-lg"
            style={{
              background: loading ? '#9CA3AF' : 'linear-gradient(90deg, #5B4EF8 0%, #6B5EFF 100%)',
            }}
          >
            {loading ? '提交中...' : '提交审核'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UploadTemplatePage;

import React, { useState, useEffect } from 'react';
import { useThrottleFn } from '../hooks/useThrottleFn';
import { ArrowLeft, Plus } from 'lucide-react';
import { Toast } from 'react-vant';
import Button from '../components/Button';
import { DealRecord } from '../types';
import { dealService } from '../services/dealService';

import { nativeBridge } from '../services/nativeBridge';

interface CorporateEditPageProps {
  deal: DealRecord | null;
  onBack: () => void;
  onConfirm: (updatedName: string, updatedLogo: string) => void;
}

const CorporateEditPage: React.FC<CorporateEditPageProps> = ({ deal, onBack, onConfirm }) => {
  const [companyName, setCompanyName] = useState(deal?.interviewCust || '');
  const [logoUrl, setLogoUrl] = useState(deal?.logo || '');
  const [loading, setLoading] = useState(false);
  
  // 上传状态锁
  const isUploadingRef = React.useRef(false);

  // 监听 deal 变化，更新 logo 和 companyName
  useEffect(() => {
    if (deal) {
      setCompanyName(deal.interviewCust || '');
      setLogoUrl(deal.logo || '');
    }
  }, [deal]);

  // 通用 Native 上传方法
  const uploadNativeFile = async (localPath: string) => {
      if (isUploadingRef.current) return;
      isUploadingRef.current = true;
      
      try {
          Toast.loading({ message: '图片处理中...', duration: 0, forbidClick: true });
          
          const token = localStorage.getItem('zov-user-token') || '';
          const uploadHost = 'http://68.79.42.215/report/upload/file'; // 硬编码，需保持一致

          const params = {
              host: uploadHost,
              authorization: token,
              filePath: localPath,
          };
          
          console.log('[企业资料] 开始上传图片:', localPath);

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
                       // 忽略进度
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
               }, 30000);
          });

          console.log('[企业资料] 图片上传成功:', serverUrl);
          setLogoUrl(serverUrl);
          Toast.clear();
          Toast.success('图片已更新');

      } catch (error: any) {
          console.error('Native upload failed:', error);
          Toast.clear();
          Toast.fail(error.message || '图片上传失败');
      } finally {
          isUploadingRef.current = false;
      }
  };

  // 监听 Native 图片选择回调
  useEffect(() => {
      const handleImageSelected = (res: any) => {
          if (res.success && res.data && res.data.imageURL) {
              uploadNativeFile(res.data.imageURL);
          }
      };
      
      nativeBridge.on('imageSelected', handleImageSelected);
      
      return () => {
          nativeBridge.off('imageSelected', handleImageSelected);
      };
  }, []);

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

  // 将网络图片转换为 Base64
  const imageToBase64 = async (imagePath: string): Promise<string> => {
    try {
      // 1. 使用fetch获取图片资源
      const response = await fetch(imagePath);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // 2. 将响应转换为Blob对象
      const blob = await response.blob();

      // 3. 使用FileReader将Blob转换为Base64
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('图片转换失败:', error);
      return imagePath; // 如果转换失败，保留原路径
    }
  };

  // 处理确认按钮点击
  const handleConfirm = async () => {
    if (!companyName.trim()) {
      Toast.info('请输入企业名称');
      return;
    }

    if (!deal?.id) {
      Toast.fail('未找到尽调信息');
      return;
    }

    try {
      setLoading(true);
      
      // 确保 logo 是 Base64 格式
      let finalLogo = logoUrl.trim();
      if (finalLogo && (finalLogo.startsWith('http://') || finalLogo.startsWith('https://'))) {
         try {
             // 尝试转 Base64，如果是跨域图片可能会失败，失败则依然传 URL
             const base64 = await imageToBase64(finalLogo);
             if (base64.startsWith('data:')) {
                 finalLogo = base64;
             }
         } catch (e) {
             console.warn('Failed to convert existing URL to Base64, using original URL');
         }
      }

      await dealService.createOrUpdateDealInst({
        id: deal.id,
        interviewCust: companyName.trim(),
        logo: finalLogo,
      });
      Toast.success('更新成功');
      onConfirm(companyName.trim(), finalLogo);
    } catch (error: any) {
      Toast.fail(error.message || '更新失败');
    } finally {
      setLoading(false);
    }
  };

  // Throttled Handlers
  const handleSaveThrottled = useThrottleFn(handleConfirm, 1000);
  const handleBackThrottled = useThrottleFn(onBack, 1000);
  const handlePhotoUploadThrottled = useThrottleFn(() => {
    nativeBridge?.openPhotoLibrary?.();
  }, 1000);

  return (
    <div className="fixed inset-0 h-full w-full overflow-hidden flex flex-col bg-[#F7F8FA]">

      {/* NavBar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white sticky top-0 z-10">
        <button onClick={handleBackThrottled} className="p-2 -ml-2 text-slate-700 hover:bg-slate-50 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-slate-800">企业资料</h1>
        <div className="w-8"></div> {/* Spacer for alignment */}
      </div>

      {/* Main Content - Scrollable Area */}
      <div className="flex-1 w-full overflow-y-auto p-6 flex flex-col items-center pb-32">
        {/* Photo Uploader Placeholder / Logo Preview */}
        <div className="mt-8 mb-10 flex flex-col items-center justify-center shrink-0">
            <div 
                className="w-28 h-28 rounded-full bg-indigo-50 flex flex-col items-center justify-center text-indigo-500 mb-2 shadow-sm border border-indigo-100 active:scale-95 transition-transform overflow-hidden cursor-pointer relative group"
                onClick={handlePhotoUploadThrottled}
            >
                {logoUrl ? (
                    <>
                        <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Plus size={24} className="text-white" />
                        </div>
                    </>
                ) : (
                    <Plus size={36} strokeWidth={2.5} />
                )}
            </div>
            <span className="text-[11px] font-medium mt-1 text-indigo-400">
                {logoUrl ? '点击更换图片' : '上传企业照片'}
            </span>
        </div>

        {/* Name Input */}
        <div className="w-full">
            <label className="block text-sm text-slate-500 mb-3 pl-1">被访企业名称</label>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-transparent focus-within:border-indigo-200 transition-colors">
                <input 
                    type="text" 
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full text-[16px] text-slate-800 font-medium outline-none bg-transparent placeholder-gray-300"
                    placeholder="请输入企业名称"
                />
            </div>
        </div>
      </div>

      <div 
        className="absolute bottom-0 left-0 right-0 max-w-md mx-auto px-4 pb-6 z-30 flex gap-4"
        style={{
          paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))',
          transform: 'translateZ(0)',
          WebkitTransform: 'translateZ(0)' 
        }}
      >
         <Button 
            variant="secondary" 
            block 
            className="flex-1 !rounded-full !bg-white !border-indigo-100 !text-indigo-600 !h-12 !text-[16px] shadow-lg shadow-indigo-100/50"
            onClick={handleBackThrottled}
         >
         取消
         </Button>
         
         <Button 
            variant="primary" 
            block 
            className="flex-1 !rounded-full !h-12 !text-[16px] shadow-lg shadow-indigo-500/30"
            onClick={handleSaveThrottled}
            loading={loading}
            disabled={loading}
         >
         确认
         </Button>
      </div>
    </div>
  );
};

export default CorporateEditPage;
import React, { useState, useEffect, useRef } from 'react';
import { useThrottleFn } from '../hooks/useThrottleFn';
import { useKeyboardStatus } from '../hooks/useKeyboardStatus';
import { ArrowLeft, Plus } from 'lucide-react';
import { Toast } from 'react-vant';
import Button from '../components/Button';
import { DealRecord } from '../types';
import { dealService } from '../services/dealService';
import { nativeBridge } from '../services/nativeBridge';
import config from '../config';

interface CorporateEditPageProps {
  deal: DealRecord | null;
  onBack: () => void;
  onConfirm: (updatedName: string, updatedLogo: string) => void;
  setIsEnterpriseSyncing?: (syncing: boolean) => void;
}

const CorporateEditPage: React.FC<CorporateEditPageProps> = ({ deal, onBack, onConfirm }) => {
  // 访谈对象名 (对应后端的 interviewCust)
  const [interviewCust, setInterviewCust] = useState(deal?.interviewCust || '');
  const [logoUrl, setLogoUrl] = useState(deal?.logo || '');

  const [loading, setLoading] = useState(false);

  // 键盘与滚动处理
  const isKeyboardOpen = useKeyboardStatus();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isKeyboardOpen && scrollContainerRef.current) {
      setTimeout(() => {
        scrollContainerRef.current?.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }, 300);
    }
  }, [isKeyboardOpen]);

  const isUploadingRef = useRef(false);

  // 初始化
  useEffect(() => {
    if (deal) {
      setInterviewCust(deal.interviewCust || '');
      setLogoUrl(deal.logo || '');
    }
  }, [deal]);

  // 图片上传逻辑 (保持原样)
  const uploadNativeFile = async (localPath: string) => {
      if (isUploadingRef.current) return;
      isUploadingRef.current = true;
      try {
          Toast.loading({ message: '图片处理中...', duration: 0, forbidClick: true });
          const token = localStorage.getItem('zov-user-token') || '';
          const params = { host: config.uploadUrl, authorization: token, filePath: localPath };
          const serverUrl = await new Promise<string>((resolve, reject) => {
               const resultHandler = (res: any) => {
                   const resultData = res.data?.result || (res.data?.success !== undefined ? res.data : null);
                   if (res.success && (resultData?.success === true || resultData?.errno === 0)) {
                       const url = resultData.data?.url || resultData.url || (typeof resultData.data === 'string' ? resultData.data : "");
                       if (url) { nativeBridge.off('onUploadResult', resultHandler); resolve(url); }
                   } else if (res.success === false) {
                       nativeBridge.off('onUploadResult', resultHandler);
                       reject(new Error(resultData?.message || res.message || '上传失败'));
                   }
               };
               nativeBridge.on('onUploadResult', resultHandler);
               nativeBridge.uploadInterviewFile(params);
               setTimeout(() => { nativeBridge.off('onUploadResult', resultHandler); reject(new Error('上传超时')); }, 30000);
          });
          setLogoUrl(serverUrl);
          Toast.clear();
          Toast.success('图片已更新');
      } catch (error: any) {
          Toast.clear();
          Toast.fail(error.message || '图片上传失败');
      } finally { isUploadingRef.current = false; }
  };

  useEffect(() => {
      const handleImageSelected = (res: any) => { if (res.success && res.data && res.data.imageURL) uploadNativeFile(res.data.imageURL); };
      nativeBridge.on('imageSelected', handleImageSelected);
      return () => { nativeBridge.off('imageSelected', handleImageSelected); };
  }, []);

  useEffect(() => {
    const handleNativeBack = (e: Event) => { e.preventDefault(); onBack(); };
    window.addEventListener('requestNativeBack', handleNativeBack);
    return () => { window.removeEventListener('requestNativeBack', handleNativeBack); };
  }, [onBack]);

  const handleConfirm = async () => {
    if (!interviewCust.trim()) {
      Toast.info('请输入项目名称');
      return;
    }
    if (!deal?.id) {
      Toast.fail('未找到尽调信息');
      return;
    }
    try {
      setLoading(true);
      
      await dealService.createOrUpdateDealInst({
        id: deal.id,
        interviewCust: interviewCust.trim(),
        logo: logoUrl.trim(),
      });

      Toast.success('更新成功');
      onConfirm(interviewCust.trim(), logoUrl.trim());
    } catch (error: any) {
      Toast.fail(error.message || '更新失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveThrottled = useThrottleFn(handleConfirm, 1000);
  const handleBackThrottled = useThrottleFn(onBack, 1000);

  return (
    <div className="fixed inset-0 h-full w-full overflow-hidden flex flex-col bg-[#F7FAFE]">
      {/* NavBar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#FFFFFF] sticky top-0 z-10 border-b border-[#E2EBF5]/60">
        <button onClick={handleBackThrottled} className="p-2 -ml-2 text-[#476285] hover:bg-[#F7FAFE] rounded-[999px] transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-semibold text-[#0F2848] tracking-[-0.01em]">编辑项目资料</h1>
        <div className="w-8"></div>
      </div>

      {/* Main Content */}
      <div
        ref={scrollContainerRef}
        className="flex-1 w-full overflow-y-auto p-6 flex flex-col items-center pb-32"
      >
        {/* Logo Preview */}
        <div className="mt-4 mb-8 flex flex-col items-center justify-center shrink-0">
            <div
                className="w-24 h-24 rounded-[999px] bg-[#FFFFFF] flex flex-col items-center justify-center text-[#2563EB] mb-2 shadow-md border-4 border-white active:scale-95 transition-transform overflow-hidden cursor-pointer relative group"
                onClick={() => nativeBridge?.openPhotoLibrary?.()}
            >
                {logoUrl ? (
                    <>
                        <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Plus size={24} className="text-white" />
                        </div>
                    </>
                ) : (
                    <div className="bg-[#2563EB1A] w-full h-full flex flex-col items-center justify-center">
                        <Plus size={32} strokeWidth={2.5} />
                    </div>
                )}
            </div>
            <span className="text-[11px] font-normal mt-1 text-[#8AA2BF]">点击上传项目图片</span>
        </div>

        {/* Form Fields */}
        <div className="w-full space-y-6">
            {/* Interview Cust */}
            <div className="w-full">
                <div className="flex justify-between items-end mb-2 pl-1">
                    <span className="text-sm text-[#476285] font-medium">项目名称 <span className="text-red-500">*</span></span>
                    <span className="text-[11px] text-[#8AA2BF] font-normal">{interviewCust.length}/30</span>
                </div>
                <div className="bg-[#FFFFFF] rounded-[18px] p-4 shadow-[0_3px_10px_rgba(15,40,72,0.04)] border border-transparent focus-within:border-[#E2EBF5] transition-all">
                    <input
                        type="text"
                        value={interviewCust}
                        onChange={(e) => {
                            let val = e.target.value;
                            if (val.length > 30) val = val.slice(0, 30);
                            val = val.replace(/([\\\|\/\?\*\<\>]|\.\.|[\r\n])/g, '');
                            setInterviewCust(val);
                        }}
                        className="w-full text-[16px] text-[#0F2848] font-normal outline-none bg-transparent placeholder-gray-300"
                        placeholder="请输入项目名称"
                    />
                </div>
            </div>
        </div>
      </div>

      {/* Buttons */}
      <div
        className="absolute bottom-0 left-0 right-0 max-w-md mx-auto px-4 pb-6 z-30 flex gap-4"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
      >
         <Button variant="secondary" block className="flex-1 !rounded-[999px] !bg-[#FFFFFF] !border-[#E2EBF5] !text-[#8AA2BF] !h-12 !text-[16px] !font-medium" onClick={handleBackThrottled}>
            取消
         </Button>
         <Button variant="primary" block className="flex-1 !rounded-[999px] !h-12 !text-[16px] !font-medium shadow-[0_6px_14px_rgba(37, 99, 235,0.14)]" onClick={handleSaveThrottled} loading={loading} disabled={loading}>
            保存
         </Button>
      </div>
    </div>
  );
};

export default CorporateEditPage;

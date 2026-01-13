import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import { Toast } from 'react-vant';
import Button from '../components/Button';
import { DealRecord } from '../types';
import { dealService } from '../services/dealService';

interface CorporateEditPageProps {
  deal: DealRecord | null;
  onBack: () => void;
  onConfirm: (updatedName: string, updatedLogo: string) => void;
}

const CorporateEditPage: React.FC<CorporateEditPageProps> = ({ deal, onBack, onConfirm }) => {
  const [companyName, setCompanyName] = useState(deal?.interviewCust || '');
  const [logoUrl, setLogoUrl] = useState(deal?.logo || '');
  const [loading, setLoading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // 监听 deal 变化，更新 logo 和 companyName
  useEffect(() => {
    if (deal) {
      setCompanyName(deal.interviewCust || '');
      setLogoUrl(deal.logo || '');
    }
  }, [deal]);

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

  // 将文件转换为 Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // 处理文件选择
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
        Toast.info('请选择图片文件');
        return;
    }

    try {
        Toast.loading({ message: '处理中...', duration: 0 });
        const base64 = await fileToBase64(file);
        setLogoUrl(base64);
        Toast.clear();
        Toast.success('图片已选择');
    } catch (error) {
        Toast.clear();
        console.error('Image processing failed:', error);
        Toast.fail('图片处理失败');
    } finally {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
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

  return (
    <div className="flex flex-col min-h-screen bg-[#F7F8FA] relative">
      <input 
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />

      {/* NavBar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white sticky top-0 z-10">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-700 hover:bg-slate-50 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-slate-800">企业资料</h1>
        <div className="w-8"></div> {/* Spacer for alignment */}
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 flex flex-col items-center w-full">
        {/* Photo Uploader Placeholder / Logo Preview */}
        <div className="mt-8 mb-10 flex flex-col items-center justify-center">
            <div 
                className="w-28 h-28 rounded-full bg-indigo-50 flex flex-col items-center justify-center text-indigo-500 mb-2 shadow-sm border border-indigo-100 active:scale-95 transition-transform overflow-hidden cursor-pointer relative group"
                onClick={() => fileInputRef.current?.click()}
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

      {/* Bottom Buttons */}
      <div className="p-6 pb-8 bg-white border-t border-gray-100 flex gap-4 mt-auto sticky bottom-0 z-20 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
         <Button 
            variant="secondary" 
            block 
            className="flex-1 !rounded-full !border-gray-200 !text-slate-600 !h-12 !text-[16px]"
            onClick={onBack}
         >
           取消
         </Button>
         
         <Button 
            variant="primary" 
            block 
            className="flex-1 !rounded-full !h-12 !text-[16px] shadow-indigo-500/25"
            onClick={handleConfirm}
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
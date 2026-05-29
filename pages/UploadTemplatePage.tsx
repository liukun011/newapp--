import React, { useState, useEffect, useRef } from 'react';
import { useThrottleFn } from '../hooks/useThrottleFn';
import { ArrowLeft, Image as ImageIcon, ChevronDown } from 'lucide-react';
import { Toast, Dialog } from 'react-vant';
import Button from '../components/Button';
import { templateService } from '../services/templateService';
import { authService } from '../services/authService';
import { nativeBridge } from '../services/nativeBridge';
import config from '../config';
import { TEMPLATE_CATEGORY_OPTIONS, SCOPE_PERSONAL } from '../constants';

const TEMPLATE_NAME_MAX_LENGTH = 20;
const TEMPLATE_DESC_MAX_LENGTH = 100;

interface UploadTemplatePageProps {
  onBack: () => void;
  onCancel: () => void;
  onSubmit?: () => void;
  onViewList?: () => void; // 查看列表回调
  initialData?: { id: string; name: string; fileUrl: string; fileName: string } | null; // 从"更换"入口传入
}

const UploadTemplatePage: React.FC<UploadTemplatePageProps> = ({ 
  onBack, 
  onCancel,
  onSubmit,
  onViewList,
  initialData,
}) => {
  const [templateName, setTemplateName] = useState('');
  const [templateCategory, setTemplateCategory] = useState<(typeof TEMPLATE_CATEGORY_OPTIONS)[number]['id']>(TEMPLATE_CATEGORY_OPTIONS[0].id);
  const [templateDesc, setTemplateDesc] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{name: string, url: string} | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // 上传状态锁
  const isUploadingRef = useRef(false);

  // 预填充初始数据（更换模式入口）
  useEffect(() => {
    if (initialData) {
      setTemplateName(initialData.name);
      setSelectedFile({ name: initialData.fileName, url: initialData.fileUrl });
    } else {
      setTemplateName('');
      setSelectedFile(null);
    }
  }, [initialData]);

  // 处理Native文件上传
  const uploadNativeFile = async (localPath: string) => {
      if (isUploadingRef.current) return;
      isUploadingRef.current = true;
      
      try {
          Toast.loading({ message: '文件处理中...', duration: 0, forbidClick: true });
          
          const token = localStorage.getItem('zov-user-token') || '';
          const uploadHost = config.uploadUrl; // 从配置获取

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
    // 检查管理员身份
    const checkAdminStatus = async () => {
      try {
        const userInfoStr = localStorage.getItem('zov-user-info');
        if (userInfoStr) {
          const userInfo = JSON.parse(userInfoStr);
          const currentUserId = userInfo.userId;

          // 根据 /api/iam/user_org/page_users 接口返回的 isTenantAdmin 字段判断
          const res = await authService.getOrganizationUsers({
            current: 1,
            size: 9999, // 假设用户量在合理范围内，或者查询自己的状态
            orgId: "" 
          });
          
          if (res.successful && res.data && res.data.records && Array.isArray(res.data.records)) {
            // 在返回的用户列表中查找当前登录的用户
            const currentUser = res.data.records.find((u: any) => String(u.id) === String(currentUserId));
            if (currentUser) {
              setIsAdmin(!!currentUser.isTenantAdmin);
            }
          }
        }
      } catch (e) {
        console.error('Failed to check admin status:', e);
      }
    };

    checkAdminStatus();

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
      let res;
      if (initialData?.id) {
        // 更换模式：调用更换接口（AI判断当前为死代码，MyTemplatesPage 未传入 initialData，故无需补充 businessType/reportTemplateDesc）
        res = await templateService.replaceApproveReport({
          id: initialData.id,
          approveReportName: templateName.trim(),
          approveTemplateUrl: selectedFile.url,
        });
      } else {
        // 新建模式：调用新建接口
        res = await templateService.insertTemplate({
          reportTemplateName: templateName.trim(),
          outTemplateUrl: selectedFile.url,
          useScope: SCOPE_PERSONAL,
          businessType: templateCategory,
          reportTemplateDesc: templateDesc.trim() || undefined,
        });
      }

      if (res.success) {
        const message = isAdmin 
          ? '您是组织的管理员，模板通过后会共享给组织成员。' 
          : '您是组织的成员，模板通过后不会共享。';
        
        Dialog.alert({
          title: '提交成功',
          message: message,
          confirmButtonText: '我知道了',
          confirmButtonColor: '#4337F1',
          onConfirm: () => {
            setShowSuccess(true);
            onSubmit?.();
          }
        });
      } else {
        Toast.fail(res.message || '提交失败，请重试');
      }
    } catch (error: any) {
      console.error('Failed to submit template:', error);
      Toast.fail(error.message ||'提交失败，请重试');
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
            已进入生成队列
          </h2>

          <p className="text-sm text-gray-500 text-center leading-relaxed max-w-sm">
            {isAdmin 
              ? '您是组织的管理员，模板通过后会共享给组织成员。' 
              : '您是组织的成员，模板通过后不会共享。'}
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
        <h1 className="text-lg font-semibold text-slate-800">{initialData ? '更换访谈模板' : '上传访谈模板'}</h1>
      </div>

      {/* Form Content */}
      <div className="flex-1 px-4 pt-6 pb-24">
        {/* Template Category */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-600 mb-2 px-1">
            模板分类 <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowCategoryPicker(!showCategoryPicker)}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-colors flex items-center justify-between"
            >
              <span>{TEMPLATE_CATEGORY_OPTIONS.find((o) => o.id === templateCategory)?.title || '请选择模板分类'}</span>
              <ChevronDown size={18} className={`text-gray-400 transition-transform ${showCategoryPicker ? 'rotate-180' : ''}`} />
            </button>
            {showCategoryPicker && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                {TEMPLATE_CATEGORY_OPTIONS.map((opt) => (
                  <div
                    key={opt.id}
                    onClick={() => {
                      setTemplateCategory(opt.id);
                      setShowCategoryPicker(false);
                    }}
                    className={`px-4 py-3 text-sm cursor-pointer active:bg-gray-50 transition-colors ${
                      templateCategory === opt.id ? 'text-indigo-600 font-medium bg-indigo-50' : 'text-slate-700'
                    }`}
                  >
                    {opt.title}
                  </div>
                ))}
              </div>
            )}
            {showCategoryPicker && (
              <div className="fixed inset-0 z-0" onClick={() => setShowCategoryPicker(false)} />
            )}
          </div>
        </div>

        {/* Template Name */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-600 mb-2 px-1">
            模板名称 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={templateName}
            onChange={(e) => {
              let val = e.target.value;
              if (val.length > TEMPLATE_NAME_MAX_LENGTH) val = val.slice(0, TEMPLATE_NAME_MAX_LENGTH);
              setTemplateName(val);
            }}
            placeholder={`请输入模板名称，最多${TEMPLATE_NAME_MAX_LENGTH}个字符`}
            maxLength={TEMPLATE_NAME_MAX_LENGTH}
            rows={2}
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-slate-800 placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-colors resize-none"
          />
          <div className="text-right text-xs text-slate-400 mt-1">
            {templateName.length}/{TEMPLATE_NAME_MAX_LENGTH}
          </div>
        </div>

        {/* Template Description */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-600 mb-2 px-1">
            模板描述
          </label>
          <textarea
            value={templateDesc}
            onChange={(e) => {
              let val = e.target.value;
              if (val.length > TEMPLATE_DESC_MAX_LENGTH) val = val.slice(0, TEMPLATE_DESC_MAX_LENGTH);
              setTemplateDesc(val);
            }}
            placeholder={`请输入模板描述，最多${TEMPLATE_DESC_MAX_LENGTH}个字符`}
            maxLength={TEMPLATE_DESC_MAX_LENGTH}
            rows={3}
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-slate-800 placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-colors resize-none"
          />
          <div className="text-right text-xs text-slate-400 mt-1">
            {templateDesc.length}/{TEMPLATE_DESC_MAX_LENGTH}
          </div>
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
                <p className="text-sm text-gray-400">请上传.docx格式的模板附件</p>
              )}
            </div>
        </div>
      </div>

      {/* Fixed Bottom Buttons */}
      {/* Fixed Bottom Buttons */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto px-4 pb-3 z-30 flex gap-3">
          <Button
            variant="secondary"
            block
            onClick={onCancel}
            className="flex-1 !rounded-full !h-12 !text-base !bg-white shadow-lg !border-0 !text-gray-700"
          >
            取消
          </Button>
          <Button
            variant="primary"
            block
            onClick={handleSubmitThrottled}
            disabled={loading}
            className={`flex-1 !rounded-full !h-12 !text-base shadow-lg ${
              loading ? 'bg-gray-400' : 'bg-confirm-gradient'
            }`}
          >
            {loading ? '提交中...' : '提交生成'}
          </Button>
      </div>
    </div>
  );
};

export default UploadTemplatePage;

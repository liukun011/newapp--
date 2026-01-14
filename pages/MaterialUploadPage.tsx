import React, { useState } from 'react';
import { ArrowLeft, Pencil, Camera, Image as ImageIcon, FileText, Mic, Sparkles, Check, FileSpreadsheet, Eye, RefreshCw } from 'lucide-react';
import { Toast } from 'react-vant';
import Button from '../components/Button';
import VoiceInputModal from '../components/VoiceInputModal';
import { DealRecord } from '../types';
import { dealService } from '../services/dealService';

interface MaterialUploadPageProps {
  deal: DealRecord | null;
  onBack: () => void;
  onStartInterview: () => void;
  onGenerateAI: () => void;
  onEditInfo?: () => void;
  onChangeTemplate?: () => void;
}

const MaterialUploadPage: React.FC<MaterialUploadPageProps> = ({ 
  deal,
  onBack, 
  onStartInterview, 
  onGenerateAI,
  onEditInfo,
  onChangeTemplate
}) => {
  const [activeTab, setActiveTab] = useState('upload');
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  
  // 引用隐藏的 input 元素
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const galleryInputRef = React.useRef<HTMLInputElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleUploadClick = (id: string) => {
    switch (id) {
      case 'camera':
        cameraInputRef.current?.click();
        break;
      case 'gallery':
        galleryInputRef.current?.click();
        break;
      case 'file':
        fileInputRef.current?.click();
        break;
      case 'voice':
        setVoiceModalVisible(true);
        break;
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    if (!deal?.id) {
      Toast.fail('未找到尽调实例');
      return;
    }

    const file = files[0];
    try {
      Toast.loading({ message: '上传中...', duration: 0 });
      const res = await dealService.uploadDealMaterial(deal.id, file);
      Toast.clear();

      if (res.success) {
        Toast.success('上传成功');
      } else {
        Toast.fail(res.message || '上传失败');
      }
    } catch (error) {
      Toast.clear();
      console.error('Upload failed:', error);
      Toast.fail('上传失败');
    }
    
    // 清空 input 以便再次选择同一文件
    e.target.value = '';
  };

  const uploadOptions = [
    { id: 'camera', label: '相机', icon: Camera },
    { id: 'gallery', label: '相册', icon: ImageIcon },
    { id: 'file', label: '文件', icon: FileText },
    { id: 'voice', label: '语音录入', icon: Mic },
  ];

  const templates = [
    { id: 1, title: '小微企业授信业务尽职调查报告', isDefault: true },
    { id: 2, title: '个人经营性贷款调查报告', isDefault: false },
    { id: 3, title: '固定资产贷款尽职调查报告', isDefault: false },
    { id: 4, title: '科技型企业科创属性评估报告', isDefault: false },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-white relative">
      {/* 隐藏的文件输入框 */}
      <input 
        type="file" 
        ref={cameraInputRef} 
        accept="image/*" 
        capture="environment" 
        className="hidden" 
        onChange={handleFileChange}
      />
      <input 
        type="file" 
        ref={galleryInputRef} 
        accept="image/*" 
        className="hidden" 
        onChange={handleFileChange}
      />
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleFileChange}
      />

      {/* NavBar */}
      <div className="flex items-center justify-between px-4 py-3 sticky top-0 bg-white z-10">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-700 hover:bg-slate-50 rounded-full">
          <ArrowLeft size={24} />
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-slate-800">{deal?.interviewCust || ''}</h1>
          <button onClick={onEditInfo} className="p-1 hover:bg-gray-100 rounded-full">
             <Pencil size={16} className="text-gray-400" />
          </button>
        </div>
        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      {/* Tabs */}
      <div className="flex justify-between px-6 border-b border-gray-100 bg-white z-10">
        {['资料上传', '模板选择', '问题集合'].map((tab, index) => {
           // Mapping internal IDs to display names for logic simplicity
           const tabId = index === 0 ? 'upload' : index === 1 ? 'template' : 'questions';
           const isActive = activeTab === tabId;
           
           return (
            <button
              key={tab}
              onClick={() => setActiveTab(tabId)}
              className={`pb-3 pt-2 text-[15px] font-medium relative transition-colors ${
                isActive ? 'text-slate-900 font-bold' : 'text-gray-400'
              }`}
            >
              {tab}
              {isActive && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-[3px] bg-indigo-600 rounded-full" />
              )}
            </button>
           );
        })}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-[#F7F8FA] p-4">
        
        {/* Tab 1: Upload */}
        {activeTab === 'upload' && (
          <div className="space-y-4">
            {/* Upload Grid */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="grid grid-cols-4 gap-2">
                {uploadOptions.map((opt) => (
                  <button 
                    key={opt.id}
                    onClick={() => handleUploadClick(opt.id)}
                    className="flex flex-col items-center justify-center py-4 rounded-xl active:bg-gray-50 transition-colors"
                  >
                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mb-2 text-slate-700">
                       <opt.icon size={24} strokeWidth={1.5} />
                    </div>
                    <span className="text-xs text-gray-500 font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* AI Analysis Card */}
            <div className="rounded-2xl p-4 flex items-center justify-between relative overflow-hidden shadow-sm"
                 style={{ background: 'linear-gradient(90deg, #Eef2ff 0%, #F5f3ff 100%)' }}>
               <div className="flex items-center gap-4 relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm text-indigo-500">
                    <Sparkles size={28} fill="currentColor" className="opacity-90" />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-bold text-indigo-900 mb-1">AI 智能分析助手</h3>
                    <p className="text-xs text-indigo-400/80">AI智能补全问题并预警风险</p>
                  </div>
               </div>
               
               <button 
                  onClick={onGenerateAI}
                  className="px-4 py-1.5 bg-indigo-500/10 text-indigo-600 rounded-full text-xs font-bold hover:bg-indigo-500/20 active:scale-95 transition-all"
               >
                 去生成
               </button>
            </div>
          </div>
        )}

        {/* Tab 2: Templates */}
        {activeTab === 'template' && (
          <div className="space-y-3">
             {templates.map(template => (
               <div key={template.id} className="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-4">
                  {/* Card Header */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#E8F8F0] flex items-center justify-center flex-shrink-0 text-[#07C160]">
                       <FileSpreadsheet size={24} strokeWidth={1.5} />
                    </div>
                    <h3 className="text-[15px] font-bold text-slate-800 leading-snug pt-1">
                      {template.title}
                    </h3>
                  </div>
                  
                  {/* Card Footer */}
                  <div className="flex items-center justify-between pt-1">
                     <div className={`px-2 py-1 rounded-md text-[10px] font-medium ${template.isDefault ? 'bg-gray-100 text-gray-500' : 'bg-transparent text-transparent'}`}>
                       {template.isDefault ? '默认使用' : ''}
                     </div>
                     
                     <div className="flex gap-3">
                        <Button 
                          variant="secondary" 
                          size="small" 
                          className="!h-8 !px-4 !border-gray-200 !text-gray-600 !rounded-full !font-normal"
                        >
                           <Eye size={14} className="mr-1.5" /> 预览
                        </Button>
                        <Button 
                          variant="primary" 
                          size="small" 
                          className="!h-8 !px-4 !bg-[#4E3EF8] !rounded-full !shadow-indigo-200 !font-normal"
                          onClick={onChangeTemplate}
                        >
                           <RefreshCw size={14} className="mr-1.5" /> 更换
                        </Button>
                     </div>
                  </div>
               </div>
             ))}
          </div>
        )}
        
        {/* Tab 3: Questions Placeholder */}
        {activeTab === 'questions' && (
           <div className="flex flex-col items-center justify-center py-20 text-gray-400">
             <FileText size={48} className="mb-4 opacity-20" />
             <p className="text-sm">问题集合加载中...</p>
           </div>
        )}

      </div>

      {/* Fixed Bottom Bar */}
      <div className="bg-white p-6 pb-8 border-t border-gray-100 flex gap-4 shadow-[0_-4px_10px_rgba(0,0,0,0.03)] sticky bottom-0 z-20">
         <Button 
            variant="secondary" 
            block 
            className="flex-1 !rounded-full !border-indigo-100 !text-indigo-600 !h-12 !text-[16px]"
            onClick={onBack}
         >
           <Check size={18} className="mr-2" /> 确定
         </Button>
         
         <Button 
            variant="primary" 
            block 
            className="flex-1 !rounded-full !h-12 !text-[16px] shadow-indigo-500/25"
            onClick={onStartInterview}
         >
           <Mic size={18} className="mr-2" /> 开启访谈
         </Button>
      </div>

      {/* Voice Input Modal */}
      <VoiceInputModal
        visible={voiceModalVisible}
        onClose={() => setVoiceModalVisible(false)}
        onSave={(content) => {
          // TODO: 处理语音录入的内容
          console.log('Material upload voice input content:', content);
          Toast.success('录入成功');
        }}
      />
    </div>
  );
};

export default MaterialUploadPage;
import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Camera, Image as ImageIcon, FileText, Mic, MinusCircle, Pencil } from 'lucide-react';
import { Toast } from 'react-vant';
import Button from '../components/Button';
import VoiceInputModal from '../components/VoiceInputModal';
import { dealService } from '../services/dealService';
import { Resource } from '../types';

interface MaterialsListPageProps {
  dealId?: string;
  onBack: () => void;
  onGenerateReport: () => void;
}

const MaterialsListPage: React.FC<MaterialsListPageProps> = ({ 
  dealId,
  onBack, 
  onGenerateReport
}) => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  
  // 重命名弹框状态
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Resource | null>(null);
  const [newFileName, setNewFileName] = useState('');

  // 获取尽调详情数据
  const fetchDealDetail = useCallback(async () => {
    if (!dealId) return;
    
    try {
      const res = await dealService.getDealInstDetail(dealId);
      if (res.success && res.data) {
        setResources(res.data.resources || []);
      }
    } catch (error) {
      console.error('Failed to fetch deal detail:', error);
    }
  }, [dealId]);

  useEffect(() => {
    fetchDealDetail();
  }, [fetchDealDetail]);

  // 引用隐藏的 input 元素
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const galleryInputRef = React.useRef<HTMLInputElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleUploadClick = (id: 'camera' | 'gallery' | 'file' | 'voice') => {
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
    
    if (!dealId) {
      Toast.fail('未找到尽调实例');
      return;
    }

    const file = files[0];
    try {
      Toast.loading({ message: '上传中...', duration: 0 });
      const res = await dealService.uploadDealMaterial(dealId, file);
      Toast.clear();

      if (res.success) {
        Toast.success('上传成功');
        // 刷新资料列表
        fetchDealDetail();
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

  // 删除资料
  const handleDeleteResource = async (resourceId: string) => {
    if (!dealId) {
      Toast.fail('未找到尽调实例');
      return;
    }

    try {
      Toast.loading({ message: '删除中...', duration: 0 });
      const res = await dealService.deleteDealMaterial(dealId, resourceId);
      Toast.clear();

      if (res.success) {
        Toast.success('删除成功');
        // 刷新资料列表
        fetchDealDetail();
      } else {
        Toast.fail(res.message || '删除失败');
      }
    } catch (error) {
      Toast.clear();
      console.error('Delete failed:', error);
      Toast.fail('删除失败');
    }
  };

  // 打开重命名弹框
  const handleOpenRenameModal = (resource: Resource) => {
    // 提取文件名（不含后缀）
    const nameParts = resource.fileName.split('.');
    if (nameParts.length > 1) nameParts.pop(); // 移除后缀
    const baseName = nameParts.join('.');
    
    setRenameTarget(resource);
    setNewFileName(baseName);
    setRenameModalVisible(true);
  };

  // 确认重命名
  const handleConfirmRename = async () => {
    if (!renameTarget) {
      Toast.fail('参数错误');
      return;
    }

    if (!newFileName.trim()) {
      Toast.fail('文件名不能为空');
      return;
    }

    // 获取原文件后缀
    const nameParts = renameTarget.fileName.split('.');
    const ext = nameParts.length > 1 ? nameParts.pop() : '';
    const fullNewName = ext ? `${newFileName.trim()}.${ext}` : newFileName.trim();

    try {
      Toast.loading({ message: '重命名中...', duration: 0 });
      const res = await dealService.renameDealMaterial(renameTarget.id, fullNewName);
      Toast.clear();

      if (res.success) {
        Toast.success('重命名成功');
        setRenameModalVisible(false);
        setRenameTarget(null);
        // 刷新资料列表
        fetchDealDetail();
      } else {
        Toast.fail(res.message || '重命名失败');
      }
    } catch (error) {
      Toast.clear();
      console.error('Rename failed:', error);
      Toast.fail('重命名失败');
    }
  };

  // 根据文件类型获取图标图片路径
  // 支持6种类型：excel、word、pdf、txt、ppt、image
  const getFileIconSrc = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (['xlsx', 'xls', 'csv'].includes(ext)) {
      return '/assets/excel.png';
    } else if (['doc', 'docx'].includes(ext)) {
      return '/assets/word.png';
    } else if (['pdf'].includes(ext)) {
      return '/assets/pdf.png';
    } else if (['txt', 'text'].includes(ext)) {
      return '/assets/txt.png';
    } else if (['ppt', 'pptx'].includes(ext)) {
      return '/assets/ppt.png';
    } else if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) {
      return '/assets/image.png';
    }
    // 默认使用 txt 图标
    return '/assets/txt.png';
  };

  const uploadOptions = [
    { id: 'camera' as const, label: '相机', icon: Camera },
    { id: 'gallery' as const, label: '相册', icon: ImageIcon },
    { id: 'file' as const, label: '文件', icon: FileText },
    { id: 'voice' as const, label: '语音录入', icon: Mic },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-white">
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
      <div className="flex items-center justify-center px-4 py-3 relative border-b border-gray-100">
        <button 
          onClick={onBack} 
          className="absolute left-4 p-2 text-slate-700 hover:bg-slate-50 rounded-full active:bg-slate-100 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-semibold text-slate-800">尽调资料</h1>
      </div>

      {/* Upload Options Grid */}
      <div className="px-6 pt-6">
        <div className="grid grid-cols-4 gap-4">
          {uploadOptions.map((option) => (
            <button 
              key={option.id}
              onClick={() => handleUploadClick(option.id)}
              className="flex flex-col items-center gap-2 active:scale-95 transition-transform"
            >
              <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center">
                <option.icon size={32} className="text-slate-600" strokeWidth={1.5} />
              </div>
              <span className="text-sm text-slate-700 font-medium">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Resource List or Empty State */}
      {resources.length > 0 ? (
        <div className="flex-1 overflow-y-auto px-6 pb-24 mt-2">
          <div className="divide-y divide-gray-100">
            {resources.map((resource) => {
              const iconSrc = getFileIconSrc(resource.fileName);
              return (
                <div 
                  key={resource.id} 
                  className="flex items-center py-4 gap-3"
                  style={{ paddingLeft: '0.46rem' }}
                >
                  {/* File Icon */}
                  <div className="w-10 h-10 flex-shrink-0">
                    <img 
                      src={iconSrc} 
                      alt="file icon" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  
                  {/* File Name */}
                  <span className="flex-1 text-sm text-slate-800 truncate">
                    {resource.fileName}
                  </span>
                  
                  {/* Edit Button */}
                  <button 
                    onClick={() => handleOpenRenameModal(resource)}
                    className="p-2 text-indigo-400 hover:text-indigo-600 transition-colors"
                  >
                    <Pencil size={18} strokeWidth={2} />
                  </button>
                  
                  {/* Delete Button */}
                  <button 
                    onClick={() => handleDeleteResource(resource.id)}
                    className="p-2 text-indigo-400 hover:text-red-500 transition-colors"
                  >
                    <MinusCircle size={22} strokeWidth={2} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-24">
          {/* Mascot Illustration */}
          <div className="relative mb-6">
            <svg width="180" height="180" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Decorative stars */}
              <g opacity="0.2">
                <path d="M45 60L47 65L52 67L47 69L45 74L43 69L38 67L43 65L45 60Z" fill="#9CA3AF"/>
                <path d="M140 50L142 55L147 57L142 59L140 64L138 59L133 57L138 55L140 50Z" fill="#9CA3AF"/>
                <path d="M55 140L57 145L62 147L57 149L55 154L53 149L48 147L53 145L55 140Z" fill="#9CA3AF"/>
                <path d="M125 130L127 135L132 137L127 139L125 144L123 139L118 137L123 135L125 130Z" fill="#9CA3AF"/>
              </g>
              
              {/* Main character - cute mascot */}
              <g transform="translate(40, 50)">
                {/* Body */}
                <ellipse cx="50" cy="65" rx="45" ry="42" fill="#E5E7EB"/>
                
                {/* Head */}
                <circle cx="50" cy="35" r="30" fill="#F3F4F6"/>
                
                {/* Ears */}
                <ellipse cx="30" cy="20" rx="8" ry="12" fill="#E5E7EB"/>
                <ellipse cx="70" cy="20" rx="8" ry="12" fill="#E5E7EB"/>
                
                {/* Face details */}
                {/* Eyes - closed/happy */}
                <path d="M38 30 Q40 33 42 30" stroke="#9CA3AF" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                <path d="M58 30 Q60 33 62 30" stroke="#9CA3AF" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                
                {/* Nose */}
                <ellipse cx="50" cy="38" rx="3" ry="2.5" fill="#D1D5DB"/>
                
                {/* Mouth - smiling */}
                <path d="M42 42 Q50 46 58 42" stroke="#9CA3AF" strokeWidth="2" fill="none" strokeLinecap="round"/>
                
                {/* Arms */}
                <ellipse cx="20" cy="60" rx="10" ry="18" fill="#E5E7EB" transform="rotate(-20 20 60)"/>
                <ellipse cx="80" cy="60" rx="10" ry="18" fill="#E5E7EB" transform="rotate(20 80 60)"/>
                
                {/* Belly patch */}
                <ellipse cx="50" cy="70" rx="22" ry="25" fill="#F9FAFB"/>
                
                {/* Paws/feet */}
                <ellipse cx="35" cy="100" rx="12" ry="8" fill="#E5E7EB"/>
                <ellipse cx="65" cy="100" rx="12" ry="8" fill="#E5E7EB"/>
              </g>
            </svg>
          </div>

          {/* Text */}
          <p className="text-sm text-gray-400 text-center">小狸等你上传资料哦</p>
        </div>
      )}

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-4 bg-white">
        <Button 
          variant="primary"
          block 
          className="!rounded-full !h-14 !text-base !font-semibold shadow-lg"
          style={{ 
            background: 'linear-gradient(90deg, #5B4EF8 0%, #6B5EFF 100%)',
            boxShadow: '0 4px 20px rgba(91, 78, 248, 0.3)'
          }}
          onClick={onGenerateReport}
        >
          → 立即生成报告
        </Button>
      </div>

      {/* Voice Input Modal */}
      <VoiceInputModal
        visible={voiceModalVisible}
        onClose={() => setVoiceModalVisible(false)}
        onSave={(content) => {
          // TODO: 保存补充信息
          console.log('Voice input content:', content);
          Toast.success('保存成功');
        }}
      />

      {/* Rename Modal */}
      {renameModalVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/40"
            onClick={() => setRenameModalVisible(false)}
          />
          
          {/* Modal Content */}
          <div className="relative bg-white rounded-2xl w-[85%] max-w-sm p-6 shadow-xl">
            <h3 className="text-center text-lg font-bold text-slate-800 mb-6">文件重命名</h3>
            
            {/* Input */}
            <div className="relative mb-8">
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                className="w-full px-4 py-3 text-base text-slate-800 border border-gray-200 rounded-full focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                placeholder="请输入文件名"
              />
            </div>
            
            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setRenameModalVisible(false)}
                className="flex-1 py-3 text-base font-medium text-slate-600 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmRename}
                className="flex-1 py-3 text-base font-medium text-white rounded-full transition-colors"
                style={{ background: 'linear-gradient(90deg, #5B4EF8 0%, #6B5EFF 100%)' }}
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialsListPage;

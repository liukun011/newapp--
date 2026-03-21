import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, FileUp } from 'lucide-react';
import { templateService, TemplateRecord } from '../services/templateService';
import RenameModal from '../components/RenameModal';
import ConfirmModal from '../components/ConfirmModal';

interface MyTemplatesPageProps {
  onBack?: () => void;
  onUpload: () => void;
  initialTab?: 'success' | 'processing'; // 'processing' now covers both 1 (uploading/reviewing) and 3 (failed)
}

const MyTemplatesPage: React.FC<MyTemplatesPageProps> = ({ onBack, onUpload, initialTab = 'success' }) => {
  const [activeTab, setActiveTab] = useState<'success' | 'processing'>(initialTab);
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedFailedId, setExpandedFailedId] = useState<string | null>(null);

  // 重命名弹框状态
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renamingTemplate, setRenamingTemplate] = useState<TemplateRecord | null>(null);

  // 删除确认弹框状态
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);

  // 获取模板列表 - 根据当前 tab 状态查询
  const fetchTemplates = async () => {
    setLoading(true);
    try {
      if (activeTab === 'success') {
        const res = await templateService.queryApproveReport(2); // 2 = 成功
        if (res.success && res.data) {
          setTemplates(res.data);
        } else {
          setTemplates([]);
        }
      } else {
        // 处理中：查询 1 (审核中/上传中) 和 3 (上传失败/未通过)
        const [res1, res3] = await Promise.all([
          templateService.queryApproveReport(1),
          templateService.queryApproveReport(3),
        ]);
        const arr1 = res1.success && res1.data ? res1.data : [];
        const arr3 = res3.success && res3.data ? res3.data : [];
        
        // 合并并按创建时间倒序
        const combined = [...arr1, ...arr3].sort((a, b) => {
          return new Date(b.createDate || 0).getTime() - new Date(a.createDate || 0).getTime();
        });
        setTemplates(combined);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  // 当 tab 切换时重新获取数据
  useEffect(() => {
    fetchTemplates();
  }, [activeTab]);



  const handleDelete = (id: string) => {
    setDeletingTemplateId(id);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingTemplateId) return;

    try {
      const res = await templateService.deleteApproveReport(deletingTemplateId);
      if (res.success) {
        fetchTemplates();
        setIsDeleteModalOpen(false);
        setDeletingTemplateId(null);
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const handleRename = (template: TemplateRecord) => {
    setRenamingTemplate(template);
    setIsRenameModalOpen(true);
  };

  const handleConfirmRename = async (newName: string) => {
    if (!renamingTemplate) return;

    try {
      const res = await templateService.updateApproveReport({
        id: renamingTemplate.id,
        approveReportName: newName,
      });
      if (res.success) {
        fetchTemplates();
        setIsRenameModalOpen(false);
        setRenamingTemplate(null);
      }
    } catch (error) {
      console.error('Failed to rename template:', error);
    }
  };

  const toggleFailedExpand = (id: string) => {
    setExpandedFailedId(prev => (prev === id ? null : id));
  };

  return (
    <div className="flex flex-col h-screen bg-[#F7F8FA] pb-20">
      {/* Header - 纯标题风格带上传按钮 */}
      <div className="bg-[#F7F8FA] flex items-center justify-center pt-3 pb-1 sticky top-0 z-20 px-4">
        <h1 className="text-[17px] font-bold text-[#1E293B] tracking-wide">模板管理</h1>
        <button 
          onClick={onUpload}
          className="absolute right-4 flex items-center gap-[4px] text-[15px] font-medium text-[#1E293B] active:opacity-60 transition-opacity"
        >
          <FileUp size={18} strokeWidth={2} />
          <span>上传</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-[#F7F8FA] flex border-b border-gray-200">
        {[
          { key: 'success' as const, label: '我的模板' },
          { key: 'processing' as const, label: '处理中' },
        ].map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex-1 py-3 text-[15px] font-bold relative transition-colors"
            >
              <span className={isActive ? 'text-[#1E293B]' : 'text-[#64748B] font-medium'}>
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute bottom-[-1px] left-1/2 -translate-x-1/2 w-8 h-[3px] bg-[#4338CA] rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Template List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-indigo-200 border-t-[#4338CA] rounded-full animate-spin"></div>
            <p className="text-[#94A3B8] text-sm mt-4">加载中...</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <p className="text-sm">暂无数据</p>
          </div>
        ) : (
          templates.map(template => {
            const isProcessing = template.approveReportStatus === '1'; // 审核中
            const isFailed = template.approveReportStatus === '3'; // 未通过
            const isSuccess = template.approveReportStatus === '2'; // 已通过
            const isExpanded = expandedFailedId === template.id;

            return (
              <div
                key={template.id}
                className="bg-white rounded-[16px] overflow-hidden border border-gray-100/50 shadow-[0_2px_12px_rgba(0,0,0,0.02)]"
              >
                {/* 顶部：图标、标题和状态 */}
                <div className="px-4 py-4">
                  {/* 首行：图标、标题和状态垂直居中对齐 */}
                  <div className="flex items-center gap-3">
                    {/* 文档图标 */}
                    <div className="w-10 h-10 rounded-[12px] bg-gradient-to-b from-[#5c8fff] to-[#3B82F6] flex items-center justify-center flex-shrink-0 shadow-sm">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" fill="white" fillOpacity="0.9" />
                        <path d="M14 2V8H20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <text x="12" y="16" fontSize="8" fill="#4B77F6" fontWeight="800" textAnchor="middle" fontFamily="Arial, sans-serif">W</text>
                      </svg>
                    </div>

                    {/* 标题和状态 */}
                    <div className="flex-1 min-w-0 pr-1 flex items-center justify-between gap-2">
                      <h3 className="text-[15px] font-bold text-[#1E293B] leading-snug line-clamp-2">
                        {template.approveReportName}
                      </h3>
                      {/* 状态标签 */}
                      {isSuccess && (
                        <span className="inline-flex px-2 py-[2px] bg-[#E6F8F3] text-[#20C997] text-[11px] font-bold rounded flex-shrink-0">
                          已通过
                        </span>
                      )}
                      {isProcessing && (
                        <span className="inline-flex px-2 py-[2px] bg-[#FFF3E0] text-[#FF9800] text-[11px] font-bold rounded flex-shrink-0">
                          审核中
                        </span>
                      )}
                      {isFailed && (
                        <span className="inline-flex px-2 py-[2px] bg-[#FEE2E2] text-[#EF4444] text-[11px] font-bold rounded flex-shrink-0">
                          未通过
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 未通过原因区 */}
                  {isFailed && (
                    <div className="mt-3 pr-1">
                      <div 
                        className="bg-[#FEF2F2] rounded-lg px-3 py-2 flex items-start gap-2 cursor-pointer transition-all active:bg-[#FEE2E2]"
                        onClick={() => toggleFailedExpand(template.id)}
                      >
                         <p className={`text-[12px] text-[#EF4444] leading-relaxed flex-1 ${!isExpanded ? 'line-clamp-1' : ''}`}>
                           未通过：{template.errorMsg || '模板包含敏感词汇或话术不符合合规要求'}
                         </p>
                         <div className="text-[#EF4444] mt-[2px]">
                           {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                         </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 审核中进度条底部栏 */}
                {isProcessing && (
                  <div className="px-4 py-4 flex items-center gap-3 border-t border-gray-100/80">
                    <div className="flex-1 h-[6px] bg-[#EEF2FF] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#4B77F6] rounded-full"
                        style={{ width: '45%' }}
                      />
                    </div>
                    <span className="text-[12px] text-[#64748B] whitespace-nowrap">预计2小时后完成</span>
                  </div>
                )}

                {/* 底部区：时间+按钮 */}
                {(!isProcessing) && (
                   <div className="px-4 py-3 flex items-center border-t border-gray-50/80 justify-between">
                     <span className="text-[13px] text-[#94A3B8] font-medium tracking-wide">
                       {template.createDate?.slice(0, 16)}
                     </span>
                     <div className="flex gap-[10px]">
                       <button
                         onClick={() => handleDelete(template.id)}
                         className="px-[18px] py-[6px] bg-[#F1F5F9] text-[#94A3B8] text-[13px] font-bold rounded-full hover:bg-gray-200 transition-colors"
                       >
                         删除
                       </button>

                       {isSuccess && (
                         <button
                           onClick={() => handleRename(template)}
                           className="px-[18px] py-[6px] border-[1.5px] border-[#4338CA] text-[#4338CA] text-[13px] font-bold rounded-full bg-white transition-colors"
                         >
                           重命名
                         </button>
                       )}

                       {isFailed && (
                         <button
                           onClick={onUpload}
                           className="px-[18px] py-[6px] bg-[#4338CA] text-white text-[13px] font-bold rounded-full transition-colors"
                         >
                           更换
                         </button>
                       )}
                     </div>
                   </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 重命名弹框 */}
      <RenameModal
        isOpen={isRenameModalOpen}
        initialValue={renamingTemplate?.approveReportName || ''}
        onClose={() => {
          setIsRenameModalOpen(false);
          setRenamingTemplate(null);
        }}
        onConfirm={handleConfirmRename}
      />

      {/* 删除确认弹框 */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="确认删除模板?"
        message="确认删除此模板吗?"
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingTemplateId(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default MyTemplatesPage;

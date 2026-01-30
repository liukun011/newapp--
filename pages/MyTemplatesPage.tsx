import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileText } from 'lucide-react';
import { templateService, TemplateRecord } from '../services/templateService';
import RenameModal from '../components/RenameModal';
import ConfirmModal from '../components/ConfirmModal';

interface MyTemplatesPageProps {
  onBack: () => void;
  onUpload: () => void;
  initialTab?: 'success' | 'uploading' | 'failed'; // 初始显示的 tab
}

const MyTemplatesPage: React.FC<MyTemplatesPageProps> = ({ onBack, onUpload, initialTab = 'success' }) => {
  const [activeTab, setActiveTab] = useState<'success' | 'uploading' | 'failed'>(initialTab);
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // 重命名弹框状态
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renamingTemplate, setRenamingTemplate] = useState<TemplateRecord | null>(null);

  // 删除确认弹框状态
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);

  // 将 tab 映射到对应的状态值
  const getStatusFromTab = (tab: 'success' | 'uploading' | 'failed'): number => {
    if (tab === 'success') return 2; // 已审核
    if (tab === 'uploading') return 1; // 审核中
    if (tab === 'failed') return 3;
    return 2;
  };

  // 获取模板列表 - 根据当前 tab 状态查询
  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const status = getStatusFromTab(activeTab);
      const res = await templateService.queryApproveReport(status);
      if (res.success && res.data) {
        setTemplates(res.data);
      } else {
        setTemplates([]);
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

  const handleDelete = (id: string) => {
    setDeletingTemplateId(id);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingTemplateId) return;

    try {
      const res = await templateService.deleteApproveReport(deletingTemplateId);
      if (res.success) {
        // 删除成功后刷新列表
        fetchTemplates();
        setIsDeleteModalOpen(false);
        setDeletingTemplateId(null);
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const handleRename = (id: string) => {
    const currentTemplate = templates.find(t => t.id === id);
    if (!currentTemplate) return;

    setRenamingTemplate(currentTemplate);
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
        // 重命名成功后刷新列表
        fetchTemplates();
        setIsRenameModalOpen(false);
        setRenamingTemplate(null);
      }
    } catch (error) {
      console.error('Failed to rename template:', error);
    }
  };



  return (
    <div className="flex flex-col h-screen bg-[#F7F8FA]">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100">
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-slate-700 hover:bg-slate-50 rounded-full active:bg-slate-100 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-semibold text-slate-800">我的模板</h1>
        <button
          onClick={onUpload}
          className="px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg active:bg-indigo-100 transition-colors"
        >
          上传
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white flex justify-around border-b border-gray-100">
        {[
          { key: 'success' as const, label: '已审核' },
          { key: 'uploading' as const, label: '审核中' },
          { key: 'failed' as const, label: '未通过' },
        ].map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-3 text-sm font-medium relative transition-colors ${isActive ? 'text-slate-900' : 'text-gray-400'
                }`}
            >
              {tab.label}
              {isActive && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-[3px] bg-indigo-600 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Template List */}
      <div className="flex-1 overflow-y-auto p-4 pb-28 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-gray-400 text-sm mt-4">加载中...</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <FileText size={48} className="mb-4 opacity-20" />
            <p className="text-sm">暂无{activeTab === 'success' ? '已审核' : activeTab === 'uploading' ? '审核中' : '未通过'}的模板</p>
          </div>
        ) : (
          templates.map(template => (
            <div
              key={template.id}
              className="bg-white rounded-2xl shadow-sm overflow-hidden"
            >
              {/* Template Header - 图标、标题和状态 */}
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  {/* 文档图标 */}
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-md">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" fill="white" fillOpacity="0.9" />
                      <path d="M14 2V8H20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <text x="12" y="16" fontSize="8" fill="#5B4EF8" fontWeight="700" textAnchor="middle" fontFamily="Arial, sans-serif">W</text>
                    </svg>
                  </div>

                  {/* 标题和状态 - 垂直居中 */}
                  <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                    <h3 className="text-[15px] font-semibold text-slate-900 leading-snug">
                      {template.approveReportName}
                    </h3>
                    {/* 状态标签 */}
                    {template.approveReportStatus === '2' && (
                      <span className="inline-flex px-2.5 py-0.5 bg-emerald-50 text-emerald-600 text-xs font-medium rounded-md flex-shrink-0">
                        已审核
                      </span>
                    )}
                    {template.approveReportStatus === '1' && (
                      <span className="inline-flex px-2.5 py-0.5 bg-orange-50 text-orange-500 text-xs font-medium rounded-md flex-shrink-0">
                        审核中
                      </span>
                    )}
                    {template.approveReportStatus === '3' && (
                      <span className="inline-flex px-2.5 py-0.5 bg-red-50 text-red-600 text-xs font-medium rounded-md flex-shrink-0">
                        未通过
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Template Footer - 时间和操作按钮（下方区域） */}
              <div className="px-4 py-3">
                {template.approveReportStatus === '1' ? (
                  // 审核中状态：显示进度条
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      {/* 进度条 */}
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-300"
                          style={{ width: '60%' }}
                        />
                      </div>
                      {/* 预计完成时间 */}
                      <span className="text-[13px] text-gray-400 whitespace-nowrap">预计2小时后完成</span>
                    </div>
                  </div>
                ) : (
                  // 其他状态：显示时间和操作按钮
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-gray-400">{template.createDate}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(template.id)}
                        className="px-4 py-1.5 bg-gray-100 text-gray-600 text-[13px] font-medium rounded-lg hover:bg-gray-200 active:bg-gray-250 transition-colors"
                      >
                        删除
                      </button>
                      <button
                        onClick={() => handleRename(template.id)}
                        className="px-4 py-1.5 border-2 border-indigo-500 text-indigo-600 text-[13px] font-medium rounded-lg hover:bg-indigo-50 active:bg-indigo-100 transition-colors"
                      >
                        重命名
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
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

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, FileUp, Plus, ChevronRight, Trash2, Edit2, Check, X } from 'lucide-react';
import { Toast, Dialog } from 'react-vant';
import { templateService, ReportTemplate } from '../services/templateService';
import { questionService } from '../services/questionService';
import RenameModal from '../components/RenameModal';
import ConfirmModal from '../components/ConfirmModal';
import { TemplateTypeMap, TemplateTypeEnum, TemplateInfo } from '../types';

const TemplateReason: React.FC<{ 
  reason: string; 
  isExpanded: boolean; 
  onToggle: () => void;
}> = ({ reason, isExpanded, onToggle }) => {
  const [isOverflowing, setIsOverflowing] = React.useState(false);
  const textRef = React.useRef<HTMLParagraphElement>(null);

  React.useLayoutEffect(() => {
    const checkOverflow = () => {
      if (textRef.current) {
        const element = textRef.current;
        const isOverflow = element.scrollHeight > element.clientHeight;
        setIsOverflowing(isOverflow);
      }
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [reason]);

  return (
    <div 
      className="bg-[#FEF2F2] rounded-lg px-3 py-2 flex items-start gap-2 cursor-pointer transition-all active:bg-[#FEE2E2]"
      onClick={() => isOverflowing && onToggle()}
    >
       <p 
        ref={textRef}
        className={`text-[12px] text-[#EF4444] leading-relaxed flex-1 ${!isExpanded ? 'line-clamp-1' : ''}`}
       >
         未通过：{reason}
       </p>
       {isOverflowing && (
         <div className="text-[#EF4444] mt-[2px]">
           {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
         </div>
       )}
    </div>
  );
};

interface MyTemplatesPageProps {
  onBack?: () => void;
  onUpload: (templateData?: { id: string; name: string; fileUrl: string; fileName: string }) => void;
  onPreview?: (name: string, url: string, currentTab: 'templates' | 'questions') => void;
  initialTab?: 'templates' | 'questions';
}

const MyTemplatesPage: React.FC<MyTemplatesPageProps> = ({ onBack, onUpload, onPreview, initialTab = 'templates' }) => {
  const [activeTab, setActiveTab] = useState<'templates' | 'questions'>(initialTab);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [questions, setQuestions] = useState<any[]>([]); // 问题清单数据
  const [activeQuestion, setActiveQuestion] = useState<any>(null); // 当前选中的/正在编辑的问题清单
  const [loading, setLoading] = useState(false);
  const [expandedFailedId, setExpandedFailedId] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<any>(null); // 使用 any 规避多类型冲突
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  
  // 清单信息编辑状态
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [newQuestionName, setNewQuestionName] = useState('');
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  
  // 单个题目编辑弹窗状态
  const [isEditItemModalOpen, setIsEditItemModalOpen] = useState(false);
  const [editingItemValue, setEditingItemValue] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isSavingItem, setIsSavingItem] = useState(false);

  // 重命名弹框状态
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renamingTemplate, setRenamingTemplate] = useState<ReportTemplate | null>(null);

  // 新建清单弹窗状态
  const [isNewDialogVisible, setIsNewDialogVisible] = useState(false);
  const [newModalName, setNewModalName] = useState('');
  const [newModalDesc, setNewModalDesc] = useState('');

  // 修改清单信息弹窗状态
  const [isEditInfoModalVisible, setIsEditInfoModalVisible] = useState(false);
  
  // 删除确认弹框状态
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'standard' | 'question'>('standard');

  // 当前用户信息获取
  const userInfoStr = localStorage.getItem('zov-user-info');
  const currentUserObj = userInfoStr ? JSON.parse(userInfoStr) : null;
  const currentUserId = currentUserObj?.userId;

  // 权限检查
  const canModify = (q: any) => {
    // 根据 requirement: 必须是个人模板 (2), 且 createUser === 当前登录 userId
    return q.templateType === TemplateTypeEnum.PERSONAL && String(q.createUser) === String(currentUserId);
  };

  // 获取数据 - 统一根据 activeTab 刷新
  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'templates') {
        const [resList, resApprove] = await Promise.all([
          templateService.getTemplateList(),
          templateService.queryApproveReport()
        ]);

        let combined: any[] = [];
        
        // 1. 已通过模板
        if (resList.success && resList.data) {
          combined = [...resList.data.map(t => ({ ...t, _status: 'success' }))];
        }

        // 2. 审核中/未通过模板
        if (resApprove.success && resApprove.data) {
          const filterApprove = resApprove.data
            .filter((item: any) => item.approveReportStatus === '1' || item.approveReportStatus === '3')
            .map((item: any) => ({
              id: item.id,
              reportTemplateName: item.approveReportName,
              reportTemplateStatus: item.approveReportStatus,
              viewTemplateUrl: item.approveTemplateUrl,
              createDate: item.createDate,
              errorMsg: item.errorMsg,
              _status: item.approveReportStatus === '1' ? 'processing' : 'failed'
            }));
          combined = [...combined, ...filterApprove];
        }

        // 排序：时间倒序
        combined.sort((a, b) => {
          const dateA = new Date(a.createDate || 0).getTime();
          const dateB = new Date(b.createDate || 0).getTime();
          return dateB - dateA;
        });

        setTemplates(combined);
      } else {
        // 获取所有问题清单模板
        const res = await templateService.getQuestionTemplateList();
        if (res.success && res.data) {
          setQuestions(res.data);
          // 移除默认选中第一项的逻辑，用户需手动点击进入详情
          if (activeQuestion) {
            // 如果已有选中项（比如操作完刷新），才同步详情
              let latest = res.data.find((q: any) => q.id && q.id === activeQuestion.id);
              if (!latest && activeQuestion.templateName) {
                latest = res.data.find((q: any) => q.templateName === activeQuestion.templateName);
              }
              if (latest) {
                setEditingQuestion(latest);
                setActiveQuestion(latest);
              }


          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  // 切换标签
  const handleTabChange = (key: 'templates' | 'questions') => {
    setActiveTab(key);
    // 切换标签时，重置问题清单的编辑状态，回退到列表视图
    if (editingQuestion) {
      setEditingQuestion(null);
    }
    setIsCreatingNew(false);
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  const handleDelete = (id: string) => {
    setDeletingTemplateId(id);
    setIsDeleteModalOpen(true);
  };

  // 确认删除逻辑
  const handleConfirmDelete = async () => {
    if (!deletingTemplateId) return;
    try {
      let res;
      // 严格根据当前所属 Tab 或类型判断调用哪个接口
      if (deleteType === 'question' || activeTab === 'questions') {
        res = await templateService.deleteQuestionTemplate(deletingTemplateId);
      } else {
        res = await templateService.deleteTemplate(deletingTemplateId);
      }
        
      if (res.success) {
        Toast.info('删除成功');
        fetchData();
        setIsDeleteModalOpen(false);
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
      Toast.fail('删除失败');
    }
  };

  const handleConfirmRename = async (newName: string) => {
    if (!renamingTemplate) return;
    try {
      const res = await templateService.updateApproveReport({
        id: renamingTemplate.id,
        approveReportName: newName,
      });
      if (res.success) {
        fetchData();
        setIsRenameModalOpen(false);
      }
    } catch (error) {
      console.error('Failed to rename template:', error);
    }
  };

  // 处理清单信息保存（新增或更新）
  const handleUpdateTemplate = async () => {
    if (!editName.trim()) return;
    setIsUpdating(true);
    try {
      if (isCreatingNew) {
        // 执行新增逻辑
        const res = await templateService.addQuestionTemplate({
          templateName: editName,
          templateDesc: editDesc
        });
        if (res.success) {
          Toast.info('创建成功');
          // 重新获取数据并自动选中新建的项
          const freshListRes = await templateService.getQuestionTemplateList();
          if (freshListRes.success && freshListRes.data) {
            setQuestions(freshListRes.data);
            // 这里我们通过名称或找最后一个个人模板来匹配，或者直接根据返回数据匹配
            // 如果接口返回了id更准，这里假设后端返回了新创建的对象 res.data
            const newItem = res.data || freshListRes.data.find((item: any) => item.templateName === editName);
            if (newItem) {
              setActiveQuestion(newItem);
              setEditingQuestion(newItem);
            }
          }
          setIsCreatingNew(false);
        }
      } else if (editingQuestion) {
        // 执行更新逻辑
        const res = await templateService.updateQuestionTemplate({
          id: (editingQuestion as any).id,
          templateName: editName,
          templateDesc: editDesc
        });
        if (res.success) {
          Toast.info('更新成功');
          // 重新获取列表数据
          const freshListRes = await templateService.getQuestionTemplateList();
          if (freshListRes.success && freshListRes.data) {
            setQuestions(freshListRes.data);
            const updated = freshListRes.data.find((q: any) => q.id === (editingQuestion as any).id);
            if (updated) setEditingQuestion(updated);
          }
        }
      }
    } catch (error) {
      console.error('Failed to save template:', error);
      Toast.fail('操作失败');
    } finally {
      setIsUpdating(false);
    }
  };

  // 处理新增问题
  const handleAddQuestion = async () => {
    if (!editingQuestion || !newQuestionName.trim() || isCreatingNew) return;
    setIsAddingQuestion(true);
    try {
      const res = await questionService.addQuestion({
        templateId: editingQuestion.id,
        questionName: newQuestionName.trim()
      });
      if (res.success) {
        Toast.info('添加成功');
        setNewQuestionName('');
        // 刷新当前模板数据以拉取最新问题列表
        const freshListRes = await templateService.getQuestionTemplateList();
        if (freshListRes.success && freshListRes.data) {
          setQuestions(freshListRes.data);
          const updated = freshListRes.data.find((q: any) => q.id === editingQuestion.id);
          if (updated) setEditingQuestion(updated);
        }
      }
    } catch (error) {
      console.error('Failed to add question:', error);
      Toast.fail('添加失败');
    } finally {
      setIsAddingQuestion(false);
    }
  };

  // 处理删除单个问题
  const handleDeleteQuestion = (qId: string) => {
    Dialog.confirm({
      title: '确认删除',
      message: '确定要从当前清单中删除这个问题吗？',
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      onConfirm: async () => {
        try {
          const res = await questionService.deleteQuestion(qId);
          if (res.success) {
            Toast.info('删除成功');
            // 刷新当前模板数据
            const freshListRes = await templateService.getQuestionTemplateList();
            if (freshListRes.success && freshListRes.data) {
              setQuestions(freshListRes.data);
              const updated = freshListRes.data.find((q: any) => q.id === (editingQuestion as any).id);
              if (updated) setEditingQuestion(updated);
            }
          }
        } catch (error) {
          console.error('Failed to delete question:', error);
          Toast.fail('删除失败');
        }
      }
    });
  };

  // 处理打开编辑单项弹窗
  const handleOpenEditModal = (qItem: any) => {
    setEditingItemId(qItem.id);
    setEditingItemValue(qItem.questionName);
    setIsEditItemModalOpen(true);
  };

  // 提交单个题目的修改 (弹窗模式)
  const handleConfirmEditItem = async () => {
    if (!editingItemValue.trim() || !editingItemId) return;
    setIsSavingItem(true);
    try {
      const res = await questionService.updateQuestion({
        id: editingItemId,
        questionName: editingItemValue.trim()
      });
      if (res.success) {
        Toast.info('修改成功');
        setIsEditItemModalOpen(false);
        // 刷新列表数据
        const freshListRes = await templateService.getQuestionTemplateList();
        if (freshListRes.success && freshListRes.data) {
          setQuestions(freshListRes.data);
          const updated = freshListRes.data.find((q: any) => q.id === (editingQuestion as any).id);
          if (updated) setEditingQuestion(updated);
        }
      }
    } catch (error) {
      console.error('Failed to update question item:', error);
      Toast.fail('修改失败');
    } finally {
      setIsSavingItem(false);
    }
  };

  // 移除冗余的 ID 监听 useEffect，改为在数据变化点精准更新

  // 进入编辑模式或新建模式时初始化数据
  useEffect(() => {
    if (editingQuestion && !isCreatingNew) {
      const q = editingQuestion as any;
      setEditName(q.templateName || '');
      setEditDesc(q.templateDesc || '');
    } else if (isCreatingNew) {
      setEditName('');
      setEditDesc('');
    }
  }, [editingQuestion, isCreatingNew]);

  return (
    <div className="flex flex-col h-screen bg-[#F7F8FA] pb-20">
      {/* Header + Tool Bar */}
      <div className="bg-white px-4 flex items-center justify-between sticky top-0 z-30 shadow-sm border-b border-gray-50">
        {/* Tabs */}
        <div className="flex relative">
          {[
            { key: 'templates' as const, label: '我的模板' },
            { key: 'questions' as const, label: '问题清单' },
          ].map((tab, idx) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`py-3 pr-3 ${idx === 0 ? 'pl-0' : 'pl-3'} text-[13px] font-bold relative transition-colors`}
              >
                <span className={`relative ${isActive ? 'text-[#1E293B]' : 'text-[#94A3B8]'}`}>
                  {tab.label}
                  {isActive && (
                    <div className="absolute -bottom-[8px] left-0 right-0 h-[3px] bg-[#4B77F6] rounded-full transition-all duration-300" />
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* Action Button */}
        {activeTab === 'templates' && (
          <button 
            onClick={() => onUpload()}
            className="flex items-center gap-1 px-2.5 py-1 bg-white border border-gray-100 rounded-full shadow-sm active:scale-95 transition-all"
          >
            <FileUp size={14} className="text-[#1E293B]" />
            <span className="text-[12px] font-bold text-[#1E293B]">上传</span>
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-indigo-200 border-t-[#4B77F6] rounded-full animate-spin"></div>
            <p className="text-[#94A3B8] text-sm mt-4">加载中...</p>
          </div>
        ) : activeTab === 'templates' ? (
          <div className="space-y-3">
            {templates.length === 0 ? (
              <div className="text-center py-20 text-gray-400 text-sm">暂无数据</div>
            ) : (
              templates.map(template => {
                const temp = template as any;
                const isProcessing = temp._status === 'processing';
                const isFailed = temp._status === 'failed';
                const isSuccess = temp._status === 'success';

                return (
                  <div key={template.id} className="bg-white rounded-[16px] overflow-hidden border border-gray-100/50 shadow-sm p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-[#5c8fff] to-[#3B82F6] flex items-center justify-center flex-shrink-0 shadow-sm">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.4142 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" fill="white" fillOpacity="0.9" />
                          <text x="12" y="16" fontSize="8" fill="#4B77F6" fontWeight="800" textAnchor="middle">W</text>
                        </svg>
                      </div>
                      
                      <div className="flex-1 min-w-0 pr-1 flex items-center justify-between">
                        <h3 className="text-[15px] font-bold text-[#1E293B] truncate">{template.reportTemplateName}</h3>
                        {isSuccess && <span className="px-2 py-[2px] bg-[#E6F8F3] text-[#20C997] text-[11px] font-bold rounded">已就绪</span>}
                        {isProcessing && <span className="px-2 py-[2px] bg-[#FFF3E0] text-[#FF9800] text-[11px] font-bold rounded">处理中</span>}
                        {isFailed && <span className="px-2 py-[2px] bg-[#FEE2E2] text-[#EF4444] text-[11px] font-bold rounded">未通过</span>}
                      </div>
                    </div>

                    {isFailed && (
                      <div className="mt-3">
                        <TemplateReason reason={temp.errorMsg || '模板解析失败'} isExpanded={expandedFailedId === template.id} onToggle={() => setExpandedFailedId(prev => (prev === template.id ? null : template.id))} />
                      </div>
                    )}

                    <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between">
                      <span className="text-[12px] text-gray-400">
                        {isProcessing ? '预计2小时后完成' : (temp.createDate?.slice(5, 16) || '刚刚更新')}
                      </span>
                      <button 
                        onClick={() => onPreview?.(template.reportTemplateName, template.viewTemplateUrl || '', 'templates')}
                        className="px-4 py-1.5 border border-[#4B77F6] text-[#4B77F6] text-[13px] font-bold rounded-full bg-white active:bg-gray-50 flex items-center gap-1"
                      >
                        预览 <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {!editingQuestion ? (
              <>
                {/* Header: Title + Stats + New Button - More compact */}
                <div className="flex items-center justify-between mb-1 px-0.5">
                  <h2 className="text-[14px] font-bold text-[#1E293B]">全部清单</h2>
                  <div className="flex items-center gap-2">
                     <span className="px-2.5 py-0.5 bg-white rounded-full text-[10px] font-bold text-[#64748B] shadow-sm border border-gray-50">
                       共 <span className="text-[#3B82F6]">{questions.length}</span> 份
                     </span>
                     <button 
                       onClick={() => {
                         setIsNewDialogVisible(true);
                       }}
                       className="flex items-center gap-1 px-3 py-1 bg-[#4B77F6] text-white text-[12px] font-bold rounded-full shadow-md active:scale-95 transition-all"
                     >
                       <Plus size={14} strokeWidth={3} /> 新建
                     </button>
                  </div>
                </div>

                {/* Questions List Cards - Tightened paddings and spacing */}
                <div className="space-y-2">
                  {questions.map(item => {
                    const q = item as TemplateInfo; // 强制断言为问题清单类型数据
                    const isActive = activeQuestion?.id === q.id;
                    return (
                      <div 
                        key={q.id} 
                        onClick={() => {
                          setActiveQuestion(q);
                          setIsCreatingNew(false);
                          setEditingQuestion(q); // 点击进入编辑模式或查看模式
                        }} 
                        className={`relative rounded-[20px] p-3.5 transition-all cursor-pointer active:scale-[0.98] ${
                          isActive 
                            ? 'bg-[#EEF4FF] border border-[#CAD9FF] shadow-[0_4px_15px_rgba(75,119,246,0.06)]' 
                            : 'bg-white border border-transparent shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:border-gray-100'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden">
                                <h3 className="text-[15px] font-bold text-[#1E293B] truncate">{q.templateName}</h3>
                                {q.templateType && TemplateTypeMap[q.templateType as TemplateTypeEnum] && (
                                  <span className="px-1.5 py-[1px] bg-indigo-50 border border-indigo-100/50 text-indigo-500 text-[9px] font-bold rounded-md shrink-0 whitespace-nowrap">
                                    {TemplateTypeMap[q.templateType as TemplateTypeEnum]}
                                  </span>
                                )}
                                {isActive && (
                                  <span className="px-1.5 py-0.5 bg-[#4B77F6]/10 text-[#4B77F6] text-[9px] font-extrabold rounded-md shrink-0 whitespace-nowrap">
                                    当前编辑
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-[12px] text-[#64748B] leading-snug mb-2 line-clamp-1">
                              {q.templateDesc || "针对该场景的问卷建议，包含核心问题与风险排查。"}
                            </p>
                            <div className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              isActive ? 'bg-white text-[#4B77F6]' : 'bg-[#F8FAFF] text-[#94A3B8]'
                            }`}>
                              {q.questionList?.length || 0} 个问题
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-1.5 -mt-0.5 pr-0.5">
                            {canModify(q) && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteType('question');
                                  setDeletingTemplateId(q.id);
                                  setIsDeleteModalOpen(true);
                                }}
                                className="w-7 h-7 flex items-center justify-center text-[#CBD5E1] hover:text-red-500 active:scale-90 transition-all rounded-full hover:bg-gray-50/50"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                            {isActive ? (
                              <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-[#4B77F6] shadow-sm">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                              </div>
                            ) : (
                              <ChevronRight size={18} className="text-[#CBD5E1]" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              /* EDITOR VIEW: Show when a question template is selected for editing */
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                {/* Editor/Viewer Header - More compact */}
                <div className="flex items-center justify-between mb-2.5 px-0.5">
                  <h2 className="text-[14px] font-bold text-[#1E293B]">
                    {isCreatingNew ? '新建问题清单' : (canModify(editingQuestion) ? '编辑问题清单' : '查看问题清单')}
                  </h2>
                  <button 
                    onClick={() => setEditingQuestion(null)}
                    className="px-2.5 py-1 bg-white rounded-full text-[11px] font-bold text-[#64748B] shadow-sm border border-gray-100 active:scale-95 transition-all"
                  >
                    返回列表
                  </button>
                </div>

                {/* Detail Information Card - Ultra Refined & Compact */}
                <div className="bg-white rounded-[24px] p-4 shadow-sm border border-gray-100/50 mb-3">
                   <div className="flex justify-between items-start gap-2.5">
                      <div className="flex-1 min-w-0">
                         <div className="flex items-center gap-1.5 mb-1 flex-wrap text-wrap">
                            <h3 className="text-[16px] font-black text-slate-800 tracking-tight leading-tight">
                               {editingQuestion?.templateName || '未命名清单'}
                            </h3>
                            <div className="px-1.5 py-0.5 bg-indigo-50 text-[#4B77F6] text-[9px] font-extrabold rounded-md flex items-center justify-center shrink-0 origin-left scale-95">
                               {editingQuestion?.questionList?.length || 0} 个问题
                            </div>
                         </div>
                         <p className="text-[11px] leading-relaxed text-slate-400 font-medium line-clamp-2 pr-2">
                            {editingQuestion?.templateDesc || "暂无场景描述"}
                         </p>
                      </div>
                      
                      {canModify(editingQuestion) && (
                        <button 
                          onClick={() => {
                            setEditName(editingQuestion?.templateName || '');
                            setEditDesc(editingQuestion?.templateDesc || '');
                            setIsEditInfoModalVisible(true);
                          }}
                          className="flex-shrink-0 px-2.5 py-1 border border-slate-100 text-slate-400 font-bold text-[10px] rounded-full active:bg-slate-50 transition-all mt-0.5"
                        >
                           编辑信息
                        </button>
                      )}
                   </div>
                </div>

                {/* Add Question Card - Conditionally show when editable */}
                {canModify(editingQuestion) && (
                  <div className="bg-white rounded-[20px] p-3 shadow-sm border border-gray-50/50 mb-2">
                     <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-[#4B77F6] shadow-sm border border-blue-50">
                          <Plus size={16} strokeWidth={3} />
                        </div>
                        <span className="text-[15px] font-bold text-[#1E293B]">添加问题</span>
                     </div>

                     <div className="bg-[#F8F9FB] rounded-lg p-3">
                        <textarea 
                          value={newQuestionName}
                          onChange={(e) => setNewQuestionName(e.target.value)}
                          className="w-full h-14 bg-transparent border-none outline-none resize-none text-[13px] text-[#334155] font-medium placeholder:text-[#CBD5E1] leading-relaxed"
                          placeholder="请输入问题内容..."
                        />
                     </div>

                     <div className="flex justify-end mt-2">
                        <button 
                          onClick={handleAddQuestion}
                          disabled={isAddingQuestion || !newQuestionName.trim()}
                          className={`px-5 py-2 bg-[#4B77F6] text-white font-bold rounded-full text-[12px] shadow-md shadow-blue-50 transition-all ${
                            (isAddingQuestion || !newQuestionName.trim()) ? 'opacity-50 grayscale' : 'active:scale-95'
                          }`}
                        >
                          {isAddingQuestion ? '处理中...' : '加入当前清单'}
                        </button>
                     </div>
                  </div>
                )}

                {/* Question List Section - Hide when creating new */}
                {!isCreatingNew && (
                  <div className="mt-4 mb-3">
                    <h3 className="text-[15px] font-bold text-[#1E293B] mb-2 px-1">问题列表</h3>
                    <div className="space-y-2">
                      {editingQuestion?.questionList?.map((qItem: any, idx: number) => (
                        <div key={idx} className="bg-white rounded-[16px] p-3 shadow-[0_1px_4px_rgba(0,0,0,0.01)] border border-gray-50 flex items-start gap-2.5">
                          <div className="w-6 h-6 rounded-full bg-[#F0F5FF] flex items-center justify-center text-[#4B77F6] text-[11px] font-extrabold shrink-0 mt-0.5">
                            {idx + 1}
                          </div>
                          <p className="flex-1 text-[13px] font-bold text-[#334155] leading-snug pt-0.5 pr-2">
                            {qItem.questionName}
                          </p>
                          
                          {canModify(editingQuestion) && (
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => handleOpenEditModal(qItem)}
                                className="w-7 h-7 flex items-center justify-center text-[#94A3B8] hover:text-[#4B77F6] hover:bg-blue-50 rounded-full transition-all shrink-0"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button 
                                onClick={() => handleDeleteQuestion(qItem.id)}
                                className="w-7 h-7 flex items-center justify-center text-[#94A3B8] hover:text-red-500 hover:bg-red-50 rounded-full transition-all shrink-0"
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        <div className="h-20" />
      </div>

      <RenameModal
        isOpen={isRenameModalOpen}
        initialValue={renamingTemplate?.reportTemplateName || ''}
        onClose={() => { setIsRenameModalOpen(false); setRenamingTemplate(null); }}
        onConfirm={handleConfirmRename}
      />
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="确认删除"
        message="删除后将无法恢复，是否继续？"
        onClose={() => { setIsDeleteModalOpen(false); setDeletingTemplateId(null); }}
        onConfirm={handleConfirmDelete}
      />

      {/* 新建问题清单弹窗 - 移动端紧凑风格 */}
      {isNewDialogVisible && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[2px] px-6">
          <div 
             className="bg-white rounded-[28px] w-full max-w-[300px] overflow-hidden shadow-2xl relative animate-scaleIn"
             style={{ transform: 'translateY(-10%)' }}
          >
            {/* Modal Header - Tighter */}
            <div className="pt-5 px-5 pb-2 flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-[#1E293B]">新建问题清单</h3>
              <button 
                onClick={() => setIsNewDialogVisible(false)}
                className="w-7 h-7 flex items-center justify-center text-[#94A3B8] active:scale-90 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Area - Compact */}
            <div className="px-5 pb-5 space-y-3">
              <div className="space-y-1.5">
                <label className="block text-[12px] font-bold text-[#94A3B8] ml-1">清单名称</label>
                <div className="relative">
                   <input 
                      type="text"
                      className="w-full h-[44px] bg-[#F8FAFC] border-none rounded-[16px] px-4 text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-all placeholder:text-[#CBD5E1]"
                      placeholder="核心业务尽调清单"
                      value={newModalName}
                      onChange={(e) => setNewModalName(e.target.value)}
                   />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[12px] font-bold text-[#94A3B8] ml-1">适用场景</label>
                <div className="relative">
                   <textarea 
                      className="w-full h-[90px] bg-[#F8FAFC] border-none rounded-[16px] p-4 text-[14px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-all resize-none placeholder:text-[#CBD5E1] leading-relaxed"
                      placeholder="例如：初次沟通..."
                      value={newModalDesc}
                      onChange={(e) => setNewModalDesc(e.target.value)}
                   />
                </div>
              </div>

              {/* Action Buttons - Smaller height */}
              <div className="flex gap-2.5 pt-1.5">
                <button 
                  onClick={() => setIsNewDialogVisible(false)}
                  className="flex-1 h-[44px] bg-[#F1F5F9] text-[#64748B] font-bold text-[14px] rounded-full active:scale-95 transition-all"
                >
                  取消
                </button>
                <button 
                  disabled={!newModalName.trim() || !newModalDesc.trim() || isUpdating}
                  onClick={async () => {
                     try {
                       setIsUpdating(true);
                       Toast.loading({ message: '创建中...', duration: 0 });
                       const res = await templateService.addQuestionTemplate({
                         templateName: newModalName.trim(),
                         templateDesc: newModalDesc.trim()
                       });
                        if (res.success) {
                          Toast.success('创建成功');
                          setIsNewDialogVisible(false);
                          const savedName = newModalName.trim();
                          const savedDesc = newModalDesc.trim();
                           setNewModalName('');
                           setNewModalDesc('');
                          setIsCreatingNew(false);
                          
                          // 直接调用列表接口获取含真实 ID 的新模板
                          const freshRes = await templateService.getQuestionTemplateList();
                          if (freshRes.success && freshRes.data) {
                            setQuestions(freshRes.data);
                            const created = freshRes.data.find((q: any) => q.templateName === savedName);
                            if (created) {
                              setEditingQuestion(created);
                              setActiveQuestion(created);
                            }
                          }
                       } else {
                         Toast.fail(res.message || '创建失败');
                       }
                     } catch (e: any) {
                       Toast.fail(e.message || '网络错误');
                     } finally {
                       setIsUpdating(false);
                     }
                  }}
                  className={`flex-1 h-[44px] font-bold text-[14px] rounded-full shadow-lg active:scale-95 transition-all ${
                     (!newModalName.trim() || !newModalDesc.trim() || isUpdating)
                     ? 'bg-[#CBD5E1] text-white shadow-none cursor-not-allowed'
                     : 'bg-[#3B82F6] text-white shadow-blue-500/10 active:bg-[#2563EB]'
                  }`}
                >
                  新建清单
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 修改问题内容弹窗 */}
      <Dialog
        visible={isEditItemModalOpen}
        title="修改问题内容"
        showCancelButton
        confirmButtonText={isSavingItem ? '保存中...' : '确定'}
        onConfirm={handleConfirmEditItem}
        onCancel={() => setIsEditItemModalOpen(false)}
      >
        <div className="p-4">
          <div className="bg-[#F8F9FB] rounded-xl p-3 border border-gray-50">
            <textarea
              autoFocus
              value={editingItemValue}
              onChange={(e) => setEditingItemValue(e.target.value)}
              placeholder="请输入问题内容..."
              className="w-full h-32 bg-transparent border-none outline-none resize-none text-[14px] text-[#334155] font-medium placeholder:text-[#CBD5E1] leading-relaxed"
            />
          </div>
        </div>
      </Dialog>
      {/* 编辑清单信息弹窗 - 尺寸对齐新建弹窗 */}
      {isEditInfoModalVisible && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[2px] px-6">
          <div className="bg-white rounded-[28px] w-full max-w-[300px] overflow-hidden shadow-2xl relative animate-scaleIn" style={{ transform: 'translateY(-10%)' }}>
            <div className="pt-5 px-5 pb-2 flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-[#1E293B]">编辑清单信息</h3>
              <button 
                onClick={() => setIsEditInfoModalVisible(false)} 
                className="w-7 h-7 flex items-center justify-center text-[#94A3B8] active:scale-90 transition-all"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-5 pb-5 space-y-3">
              <div className="space-y-1.5">
                <label className="block text-[12px] font-bold text-[#94A3B8] ml-1">清单名称</label>
                <input 
                   type="text" 
                   className="w-full h-[44px] bg-[#F8FAFC] border-none rounded-[16px] px-4 text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-all placeholder:text-[#CBD5E1]" 
                   value={editName} 
                   onChange={(e) => setEditName(e.target.value)} 
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[12px] font-bold text-[#94A3B8] ml-1">适用场景</label>
                <textarea 
                   className="w-full h-[90px] bg-[#F8FAFC] border-none rounded-[16px] p-4 text-[14px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-all resize-none placeholder:text-[#CBD5E1] leading-relaxed" 
                   value={editDesc} 
                   onChange={(e) => setEditDesc(e.target.value)} 
                />
              </div>
              <div className="flex gap-2.5 pt-1.5">
                <button 
                   onClick={() => setIsEditInfoModalVisible(false)} 
                   className="flex-1 h-[44px] bg-[#F1F5F9] text-[#64748B] font-bold text-[14px] rounded-full active:scale-95 transition-all"
                >
                   取消
                </button>
                <button 
                  disabled={isUpdating || !editName.trim()} 
                  onClick={async () => {
                    await handleUpdateTemplate();
                    setIsEditInfoModalVisible(false);
                  }} 
                  className={`flex-1 h-[44px] font-bold text-[14px] rounded-full shadow-lg active:scale-95 transition-all ${isUpdating || !editName.trim() ? 'bg-gray-200 text-white shadow-none' : 'bg-[#3B82F6] text-white shadow-blue-500/10'}`}
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyTemplatesPage;

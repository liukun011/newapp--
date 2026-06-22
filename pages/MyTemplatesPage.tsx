import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronRight, ClipboardList, FileUp, Plus, Trash2, Edit2, UserCheck, X } from 'lucide-react';
import { Toast, Dialog } from 'react-vant';
import { templateService, ReportTemplate } from '../services/templateService';
import { questionService } from '../services/questionService';
import RenameModal from '../components/RenameModal';
import ConfirmModal from '../components/ConfirmModal';
import { TemplateTypeEnum, TemplateInfo, TemplateEnabledStatus } from '../types';
import { getCategoryTitle } from '../constants';

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

  // 轮询定时器：列表中有"解析中"的模板时，定时静默刷新列表
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 保持 templates 的最新引用，供 fetchData 闭包内比对使用，避免 useCallback 缓存导致比对基准陈旧
  const templatesRef = useRef(templates);
  templatesRef.current = templates;

  // 滚动容器 ref，用于在列表和详情切换时保存/恢复滚动位置
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const savedListScrollTopRef = useRef(0);

  const getQuestionTemplateTagLabel = (q: any) => {
    if (q.templateType === TemplateTypeEnum.PRESET) {
      return '内置';
    }

    if (q.templateType === TemplateTypeEnum.PERSONAL) {
      return String(q.createUser) === String(currentUserId) ? '个人' : '组织';
    }

    if (q.templateType === TemplateTypeEnum.DUE_DILIGENCE) {
      return '尽调';
    }

    return '';
  };

  // 权限检查
  const canModify = (q: any) => {
    // 根据 requirement: 必须是个人模板 (2), 且 createUser === 当前登录 userId
    return q.templateType === TemplateTypeEnum.PERSONAL && String(q.createUser) === String(currentUserId);
  };

  // 获取数据 - 统一根据 activeTab 刷新
  const fetchData = useCallback(async (opts?: { silent?: boolean }) => {
    // silent=true 时静默刷新，不显示 loading 动画，避免页面闪烁
    if (!opts?.silent) setLoading(true);
    try {
      if (activeTab === 'templates') {
        const resList = await templateService.getTemplateList();
        if (resList.success && resList.data) {
          // 静默轮询时比对新旧数据，仅当数据有变化时才更新列表，避免无意义的重渲染
          if (opts?.silent) {
            const newList = resList.data;
            const oldList = templatesRef.current;
            const hasChange =
              newList.length !== oldList.length ||
              newList.some((newItem) => {
                const oldItem = oldList.find((t) => t.id === newItem.id);
                // 新增项 或 isEnabled 状态发生变化
                return !oldItem || (oldItem as any).isEnabled !== (newItem as any).isEnabled;
              });
            if (hasChange) {
              setTemplates(newList);
            }
          } else {
            setTemplates(resList.data);
          }
        }
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
      if (!opts?.silent) setLoading(false);
    }
  }, [activeTab, activeQuestion, currentUserId]);

  // 切换标签
  const handleTabChange = (key: 'templates' | 'questions') => {
    setActiveTab(key);
    // 切换标签时，重置问题清单的编辑状态，回退到列表视图
    if (editingQuestion) {
      setEditingQuestion(null);
    }
    setActiveQuestion(null);
    setIsCreatingNew(false);
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  // 轮询：当模板列表中存在"解析中"的模板时，每 60 秒静默刷新列表，直到所有模板解析完成
  useEffect(() => {
    // 仅在模板 tab 下检查
    if (activeTab !== 'templates') return;

    const hasParsing = templates.some(
      (item) => ((item as any).isEnabled ?? TemplateEnabledStatus.ENABLED) === TemplateEnabledStatus.PARSING
    );

    // 每次 templates 变化时先清除上一次的定时器，防止多个定时器叠加
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    // 存在解析中的模板时，启动 60 秒轮询
    if (hasParsing) {
      pollTimerRef.current = setTimeout(() => fetchData({ silent: true }), 60000);
    }

    // 组件卸载或依赖变化时清除定时器
    return () => {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [templates, activeTab, fetchData]);

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

  // 滚动位置管理：进入详情时保存列表位置并回顶，返回列表时恢复
  useEffect(() => {
    if (editingQuestion) {
      // 进入详情：保存列表滚动位置，然后回顶
      if (scrollContainerRef.current) {
        savedListScrollTopRef.current = scrollContainerRef.current.scrollTop;
        scrollContainerRef.current.scrollTo(0, 0);
      }
    } else if (activeTab === 'questions') {
      // 返回列表：等 React 渲染完成后恢复之前的位置
      if (scrollContainerRef.current && savedListScrollTopRef.current > 0) {
        requestAnimationFrame(() => {
          scrollContainerRef.current?.scrollTo(0, savedListScrollTopRef.current);
        });
      }
    }
  }, [editingQuestion, activeTab]);

  return (
    <div className="flex flex-col h-screen bg-[#F7FAFE] pb-20">
      {/* Header + Tool Bar */}
      <div className="bg-[#FFFFFF] px-4 min-h-[52px] flex items-center justify-between sticky top-0 z-30 shadow-[0_3px_10px_rgba(15,40,72,0.04)] border-b border-[#E2EBF5]/50">
        {/* Tabs */}
        <div className="flex relative">
          {[
            { key: 'templates' as const, label: '报告模板' },
            { key: 'questions' as const, label: '问题清单' },
          ].map((tab, idx) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`py-3 pr-3 ${idx === 0 ? 'pl-0' : 'pl-3'} text-[13px] font-medium relative transition-colors min-h-[44px]`}
              >
                <span className={`relative ${isActive ? 'text-[#0F2848]' : 'text-[#8AA2BF]'}`}>
                  {tab.label}
                  {isActive && (
                    <div className="absolute -bottom-[8px] left-0 right-0 h-[3px] bg-[#2563EB] rounded-[999px] transition-all duration-300" />
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <div className="w-[1px]" />
      </div>

      {/* Main Content Area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-[#E2EBF5] border-t-[#2563EB] rounded-[999px] animate-spin"></div>
            <p className="text-[#8AA2BF] text-sm mt-4">加载中...</p>
          </div>
        ) : activeTab === 'templates' ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-1 px-0.5">
              <h2 className="text-[14px] font-medium text-[#0F2848]">全部模板</h2>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-[#FFFFFF] rounded-[999px] text-[10px] font-medium text-[#476285] shadow-[0_3px_10px_rgba(15,40,72,0.04)] border border-[#E2EBF5]/50">
                  共 <span className="text-[#2563EB]">{templates.length}</span> 份
                </span>
                <button
                  onClick={() => onUpload()}
                  className="flex items-center gap-1 px-3 py-1 bg-primary-gradient text-[#FFFFFF] text-[12px] font-medium rounded-[999px] shadow-md active:scale-95 transition-all"
                  aria-label="上传报告模板"
                >
                  <FileUp size={14} strokeWidth={2.6} /> 上传
                </button>
              </div>
            </div>
            {templates.length === 0 ? (
              <div className="text-center py-20 text-[#8AA2BF] text-sm">暂无数据</div>
            ) : (
              templates.map(template => {
                const isEnabledVal = (template as any).isEnabled ?? TemplateEnabledStatus.ENABLED;
                const isParsing = isEnabledVal === TemplateEnabledStatus.PARSING;
                const isEnabled = isEnabledVal === TemplateEnabledStatus.ENABLED;

                return (
                  <div key={template.id} className="bg-[#FFFFFF] rounded-[16px] overflow-hidden border border-[#E2EBF5]/60 shadow-[0_3px_10px_rgba(15,40,72,0.04)] p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-[12px] bg-[#2563EB1A] border border-[#E2EBF5] flex items-center justify-center flex-shrink-0 shadow-[0_8px_18px_rgba(37, 99, 235,0.08)]">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.4142 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" fill="#2563EB" fillOpacity="0.14" />
                          <path d="M14 2V8H20" stroke="#2563EB" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                          <text x="12" y="16" fontSize="8" fill="#2563EB" fontWeight="700" textAnchor="middle">W</text>
                        </svg>
                      </div>

                      <div className="flex-1 min-w-0 pr-1 flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-[15px] font-medium text-[#0F2848] truncate">{template.reportTemplateName}</h3>
                          {template.businessType ? (
                            <span className="inline-flex items-center rounded-[999px] border border-[#E2EBF5] bg-[#2563EB1A] text-[#2563EB] px-1.5 py-px text-[10px] font-medium mt-0.5">
                              {getCategoryTitle(template.businessType)}
                            </span>
                          ) : null}
                        </div>
                        <span className={`shrink-0 rounded-[999px] border px-2.5 py-1 text-[11px] font-medium inline-flex items-center gap-1 ${
                          isParsing
                            ? 'border-[#E2EBF5] bg-[#2563EB1A] text-[#2563EB]'
                            : isEnabled
                            ? 'border-green-100 bg-green-50 text-green-600'
                            : 'border-[#E2EBF5] bg-[#FFFFFF] text-[#476285]'
                        }`}>
                          {isParsing && (
                            <span className="w-3.5 h-3.5 border-2 border-[#E2EBF5] border-t-[#2563EB] rounded-[999px] animate-spin"></span>
                          )}
                          {isParsing ? '解析中' : isEnabled ? '已启用' : '已禁用'}
                        </span>
                      </div>
                    </div>

                    <p className="mt-3 text-[11px] leading-relaxed line-clamp-1 text-[#8AA2BF]">
                      {template.reportTemplateDesc || '暂无描述'}
                    </p>

                    <div className="mt-4 pt-3 border-t border-[#E2EBF5]/50 flex items-center justify-between">
                      <span className="text-[12px] text-[#8AA2BF]">
                        {(template as any).lastModifiedDate?.slice(5, 16) || '刚刚更新'}
                      </span>
                      {!isParsing && (
                        <button
                          onClick={() => onPreview?.(template.reportTemplateName, template.viewTemplateUrl || '', 'templates')}
                          className="px-3 py-1.5 rounded-[999px] text-xs font-medium text-white shadow-[0_3px_10px_rgba(15,40,72,0.04)] bg-[#2563EB] active:scale-95 transition-all"
                        >
                          预览
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            </div>
        ) : !editingQuestion ? (
          <div className="space-y-3">
              <div className="flex items-center justify-between mb-1 px-0.5">
                <h2 className="text-[14px] font-medium text-[#0F2848]">全部清单</h2>
                <div className="flex items-center gap-2">
                   <span className="px-2.5 py-0.5 bg-[#FFFFFF] rounded-[999px] text-[10px] font-medium text-[#476285] shadow-[0_3px_10px_rgba(15,40,72,0.04)] border border-[#E2EBF5]/50">
                     共 <span className="text-[#2563EB]">{questions.length}</span> 份
                   </span>
                   <button
                     onClick={() => {
                       setIsNewDialogVisible(true);
                     }}
                     className="flex items-center gap-1 px-3 py-1 bg-primary-gradient text-[#FFFFFF] text-[12px] font-medium rounded-[999px] shadow-md active:scale-95 transition-all"
                   >
                     <Plus size={14} strokeWidth={3} /> 新建
                   </button>
                </div>
              </div>

              <div className="space-y-2">
                {questions.map(item => {
                  const q = item as TemplateInfo;
                  const tagLabel = getQuestionTemplateTagLabel(q);
                  const isPersonalQuestion = q.templateType === TemplateTypeEnum.PERSONAL;
                  const QuestionIcon = isPersonalQuestion ? UserCheck : ClipboardList;
                  return (
                    <div
                      key={q.id}
                      onClick={() => {
                        setActiveQuestion(q);
                        setIsCreatingNew(false);
                        setEditingQuestion(q);
                      }}
                      className="relative rounded-[20px] p-3.5 transition-all cursor-pointer active:scale-[0.98] bg-[#FFFFFF] border border-transparent shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:border-[#E2EBF5]/60"
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="w-10 h-10 rounded-[14px] bg-[#2563EB1A] border border-[#E2EBF5] text-[#2563EB] flex items-center justify-center shrink-0 mt-0.5">
                          <QuestionIcon size={18} strokeWidth={2} />
                        </div>
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden">
                              <h3 className="text-[15px] font-medium text-[#0F2848] truncate">{q.templateName}</h3>
                              {tagLabel && (
                                <span className="px-1.5 py-[1px] bg-[#2563EB1A] border border-[#E2EBF5]/50 text-[#2563EB] text-[9px] font-medium rounded-md shrink-0 whitespace-nowrap">
                                  {tagLabel}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-[12px] text-[#476285] leading-snug mb-2 line-clamp-1">
                            {q.templateDesc || "针对该场景的问卷建议，包含核心问题与风险排查。"}
                          </p>
                          <div className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#2563EB1A] text-[#2563EB]">
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
                              className="w-7 h-7 flex items-center justify-center text-[#8AA2BF] hover:text-red-500 active:scale-90 transition-all rounded-[999px] hover:bg-[#F7FAFE]/50"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                          <ChevronRight size={18} className="text-[#8AA2BF]" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between mb-2.5 px-0.5">
                <h2 className="text-[14px] font-medium text-[#0F2848]">
                  {isCreatingNew ? '新建问题清单' : (canModify(editingQuestion) ? '编辑问题清单' : '查看问题清单')}
                </h2>
                <button
                  onClick={() => setEditingQuestion(null)}
                  className="px-2.5 py-1 bg-[#FFFFFF] rounded-[999px] text-[11px] font-medium text-[#476285] shadow-[0_3px_10px_rgba(15,40,72,0.04)] border border-[#E2EBF5]/60 active:scale-95 transition-all"
                >
                  返回列表
                </button>
              </div>

              <div className="bg-[#FFFFFF] rounded-[24px] p-4 shadow-[0_3px_10px_rgba(15,40,72,0.04)] border border-[#E2EBF5]/60 mb-3">
                 <div className="flex justify-between items-start gap-2.5">
                    <div className="flex-1 min-w-0">
                       <div className="flex items-center gap-1.5 mb-1 flex-wrap text-wrap">
                          <h3 className="text-[16px] font-semibold text-[#0F2848] tracking-tight leading-tight">
                             {editingQuestion?.templateName || '未命名清单'}
                          </h3>
                          <div className="px-1.5 py-0.5 bg-[#2563EB1A] text-[#2563EB] text-[9px] font-semibold rounded-md flex items-center justify-center shrink-0 origin-left scale-95">
                             {editingQuestion?.questionList?.length || 0} 个问题
                          </div>
                       </div>
                       <p className="text-[11px] leading-relaxed text-[#8AA2BF] font-medium line-clamp-2 pr-2">
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
                        className="flex-shrink-0 px-2.5 py-1 border border-[#E2EBF5]/70 text-[#8AA2BF] font-medium text-[10px] rounded-[999px] active:bg-[#F7FAFE] transition-all mt-0.5"
                      >
                         编辑信息
                      </button>
                    )}
                 </div>
              </div>

              {canModify(editingQuestion) && (
                <div className="bg-[#FFFFFF] rounded-[20px] p-3 shadow-[0_3px_10px_rgba(15,40,72,0.04)] border border-[#E2EBF5]/60 mb-2">
                   <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-[#FFFFFF] rounded-lg flex items-center justify-center text-[#2563EB] shadow-[0_3px_10px_rgba(15,40,72,0.04)] border border-[#2563EB1A]">
                        <Plus size={16} strokeWidth={3} />
                      </div>
                      <span className="text-[15px] font-medium text-[#0F2848]">添加问题</span>
                   </div>

                   <div className="bg-[#F8F9FB] rounded-lg p-3">
                      <textarea
                        value={newQuestionName}
                        onChange={(e) => setNewQuestionName(e.target.value)}
                        className="w-full h-14 bg-transparent border-none outline-none resize-none text-[13px] text-[#0F2848] font-medium placeholder:text-[#8AA2BF] leading-relaxed"
                        placeholder="请输入问题内容..."
                      />
                   </div>

                   <div className="flex justify-end mt-2">
                      <button
                        onClick={handleAddQuestion}
                        disabled={isAddingQuestion || !newQuestionName.trim()}
                        className={`px-5 py-2 bg-primary-gradient text-[#FFFFFF] font-medium rounded-[999px] text-[12px] shadow-[0_5px_12px_rgba(37, 99, 235,0.10)] transition-all ${
                          (isAddingQuestion || !newQuestionName.trim()) ? 'opacity-50 grayscale' : 'active:scale-95'
                        }`}
                      >
                        {isAddingQuestion ? '处理中...' : '加入当前清单'}
                      </button>
                   </div>
                </div>
              )}

              {!isCreatingNew && (
                <div className="mt-4 mb-3">
                  <h3 className="text-[15px] font-medium text-[#0F2848] mb-2 px-1">问题列表</h3>
                  <div className="space-y-2">
                    {editingQuestion?.questionList?.map((qItem: any, idx: number) => (
                      <div key={idx} className="bg-[#FFFFFF] rounded-[16px] p-3 shadow-[0_1px_4px_rgba(0,0,0,0.01)] border border-[#E2EBF5]/50 flex items-start gap-2.5">
                        <div className="w-6 h-6 rounded-[999px] bg-[#2563EB1A] flex items-center justify-center text-[#2563EB] text-[11px] font-semibold shrink-0 mt-0.5">
                          {idx + 1}
                        </div>
                        <p className="flex-1 text-[13px] font-medium text-[#0F2848] leading-snug pt-0.5 pr-2">
                          {qItem.questionName}
                        </p>

                        {canModify(editingQuestion) && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEditModal(qItem)}
                              className="w-7 h-7 flex items-center justify-center text-[#8AA2BF] hover:text-[#2563EB] hover:bg-[#2563EB1A] rounded-[999px] transition-all shrink-0"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteQuestion(qItem.id)}
                              className="w-7 h-7 flex items-center justify-center text-[#8AA2BF] hover:text-red-500 hover:bg-red-50 rounded-[999px] transition-all shrink-0"
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
             className="bg-[#FFFFFF] rounded-[28px] w-full max-w-[300px] overflow-hidden shadow-[0_18px_44px_rgba(15,40,72,0.16)] relative animate-scaleIn"
             style={{ transform: 'translateY(-10%)' }}
          >
            {/* Modal Header - Tighter */}
            <div className="pt-5 px-5 pb-2 flex items-center justify-between">
              <h3 className="text-[16px] font-medium text-[#0F2848]">新建问题清单</h3>
              <button 
                onClick={() => setIsNewDialogVisible(false)}
                className="w-7 h-7 flex items-center justify-center text-[#8AA2BF] active:scale-90 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Area - Compact */}
            <div className="px-5 pb-5 space-y-3">
              <div className="space-y-1.5">
                <label className="block text-[12px] font-medium text-[#8AA2BF] ml-1">
                  清单名称<span className="text-[#DC2626] ml-0.5">*</span>
                </label>
                <div className="relative">
                   <input 
                      type="text"
                      className="w-full h-[44px] bg-[#FFFFFF] border-none rounded-[16px] px-4 text-[14px] font-medium text-[#0F2848] outline-none focus:ring-2 focus:ring-[#2563EB]/20 transition-all placeholder:text-[#8AA2BF]"
                      placeholder="核心业务尽调清单"
                      value={newModalName}
                      onChange={(e) => setNewModalName(e.target.value)}
                   />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[12px] font-medium text-[#8AA2BF] ml-1">描述</label>
                <div className="relative">
                   <textarea 
                      className="w-full h-[90px] bg-[#FFFFFF] border-none rounded-[16px] p-4 text-[14px] font-medium text-[#476285] outline-none focus:ring-2 focus:ring-[#2563EB]/20 transition-all resize-none placeholder:text-[#8AA2BF] leading-relaxed"
                      placeholder="请输入描述"
                      value={newModalDesc}
                      onChange={(e) => setNewModalDesc(e.target.value)}
                   />
                </div>
              </div>

              {/* Action Buttons - Smaller height */}
              <div className="flex gap-2.5 pt-1.5">
                <button 
                  onClick={() => setIsNewDialogVisible(false)}
                  className="flex-1 h-[44px] bg-[#F7FAFE] text-[#476285] font-medium text-[14px] rounded-[999px] active:scale-95 transition-all"
                >
                  取消
                </button>
                <button 
                  disabled={!newModalName.trim() || isUpdating}
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
                  className={`flex-1 h-[44px] font-medium text-[14px] rounded-[999px] shadow-lg active:scale-95 transition-all ${
                     (!newModalName.trim() || isUpdating)
                     ? 'bg-[#CBD7E5] text-white shadow-none cursor-not-allowed'
                     : 'bg-primary-gradient text-[#FFFFFF] shadow-[rgba(37, 99, 235,0.12)] active:bg-[#2563EB]'
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
          <div className="bg-[#F8F9FB] rounded-[14px] p-3 border border-[#E2EBF5]/50">
            <textarea
              autoFocus
              value={editingItemValue}
              onChange={(e) => setEditingItemValue(e.target.value)}
              placeholder="请输入问题内容..."
              className="w-full h-32 bg-transparent border-none outline-none resize-none text-[14px] text-[#0F2848] font-medium placeholder:text-[#8AA2BF] leading-relaxed"
            />
          </div>
        </div>
      </Dialog>
      {/* 编辑清单信息弹窗 - 尺寸对齐新建弹窗 */}
      {isEditInfoModalVisible && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[2px] px-6">
          <div className="bg-[#FFFFFF] rounded-[28px] w-full max-w-[300px] overflow-hidden shadow-[0_18px_44px_rgba(15,40,72,0.16)] relative animate-scaleIn" style={{ transform: 'translateY(-10%)' }}>
            <div className="pt-5 px-5 pb-2 flex items-center justify-between">
              <h3 className="text-[16px] font-medium text-[#0F2848]">编辑清单信息</h3>
              <button 
                onClick={() => setIsEditInfoModalVisible(false)} 
                className="w-7 h-7 flex items-center justify-center text-[#8AA2BF] active:scale-90 transition-all"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-5 pb-5 space-y-3">
              <div className="space-y-1.5">
                <label className="block text-[12px] font-medium text-[#8AA2BF] ml-1">
                  清单名称<span className="text-[#DC2626] ml-0.5">*</span>
                </label>
                <input 
                   type="text" 
                   className="w-full h-[44px] bg-[#FFFFFF] border-none rounded-[16px] px-4 text-[14px] font-medium text-[#0F2848] outline-none focus:ring-2 focus:ring-[#2563EB]/20 transition-all placeholder:text-[#8AA2BF]" 
                   value={editName} 
                   onChange={(e) => setEditName(e.target.value)} 
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[12px] font-medium text-[#8AA2BF] ml-1">描述</label>
                <textarea 
                   className="w-full h-[90px] bg-[#FFFFFF] border-none rounded-[16px] p-4 text-[14px] font-medium text-[#476285] outline-none focus:ring-2 focus:ring-[#2563EB]/20 transition-all resize-none placeholder:text-[#8AA2BF] leading-relaxed"
                   placeholder="请输入描述"
                   value={editDesc} 
                   onChange={(e) => setEditDesc(e.target.value)} 
                />
              </div>
              <div className="flex gap-2.5 pt-1.5">
                <button 
                   onClick={() => setIsEditInfoModalVisible(false)} 
                   className="flex-1 h-[44px] bg-[#F7FAFE] text-[#476285] font-medium text-[14px] rounded-[999px] active:scale-95 transition-all"
                >
                   取消
                </button>
                <button 
                  disabled={isUpdating || !editName.trim()} 
                  onClick={async () => {
                    await handleUpdateTemplate();
                    setIsEditInfoModalVisible(false);
                  }} 
                  className={`flex-1 h-[44px] font-medium text-[14px] rounded-[999px] shadow-lg active:scale-95 transition-all ${isUpdating || !editName.trim() ? 'bg-gray-200 text-white shadow-none' : 'bg-primary-gradient text-[#FFFFFF] shadow-[rgba(37, 99, 235,0.12)]'}`}
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

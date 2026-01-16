import React, { useState, useEffect } from 'react';
import { ArrowLeft, Pencil, Camera, Image as ImageIcon, FileText, Mic, Sparkles, Check, FileSpreadsheet, Eye, RefreshCw, MinusCircle, Trash2, Plus } from 'lucide-react';
import { Toast, Dialog } from 'react-vant';
import Button from '../components/Button';
import VoiceInputModal from '../components/VoiceInputModal';
import { DealRecord, Resource, QuestionInfo } from '../types';
import { dealService } from '../services/dealService';
import { templateService, ReportTemplate } from '../services/templateService';
import { questionService, TemplateInfo } from '../services/questionService';

interface MaterialUploadPageProps {
  deal: DealRecord | null;
  onBack: () => void;
  onStartInterview: () => void;
  onGenerateAI: () => void;
  onEditInfo?: () => void;
  onChangeTemplate?: () => void;
  onPreviewTemplate?: (name: string, url: string) => void;
  initialTab?: string; // 初始激活的标签页
  onTabChange?: (tab: string) => void; // 标签页切换时的回调
}

const MaterialUploadPage: React.FC<MaterialUploadPageProps> = ({ 
  deal,
  onBack, 
  onStartInterview, 
  onGenerateAI,
  onEditInfo,
  onChangeTemplate,
  onPreviewTemplate,
  initialTab = 'upload',
  onTabChange
}) => {
  const basePath = import.meta.env.BASE_URL || '/';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<ReportTemplate | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [questions, setQuestions] = useState<QuestionInfo[]>([]);
  
  // 模板分类列表和选中的分类
  const [templateCategories, setTemplateCategories] = useState<TemplateInfo[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  
  // 标记各个 tab 的数据是否已加载
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set());
  
  // 重命名弹框状态
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Resource | null>(null);
  const [newFileName, setNewFileName] = useState('');
  
  // 问题编辑弹框状态
  const [questionEditModalVisible, setQuestionEditModalVisible] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionInfo | null>(null);
  const [editedQuestionName, setEditedQuestionName] = useState('');
  
  // 问题删除确认弹框状态
  const [questionDeleteModalVisible, setQuestionDeleteModalVisible] = useState(false);
  const [deletingQuestion, setDeletingQuestion] = useState<QuestionInfo | null>(null);

  // 新增问题弹框状态
  const [questionAddModalVisible, setQuestionAddModalVisible] = useState(false);
  const [newQuestionName, setNewQuestionName] = useState('');
  
  // 引用隐藏的 input 元素
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const galleryInputRef = React.useRef<HTMLInputElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // 获取尽调详情（包括资源列表）
  const fetchDealDetail = async () => {
    if (!deal?.id) return;
    
    try {
      const res = await dealService.getDealInstDetail(deal.id);
      if (res.success && res.data) {
        setResources(res.data.resources || []);
      }
    } catch (error) {
      console.error('Failed to fetch deal detail:', error);
    }
  };

  // 获取问题列表
  const fetchQuestions = async () => {
    // 优先使用当前模板的 questionId，否则使用 deal 的 questionId
    const questionIdToUse = currentTemplate?.questionId 
      ? String(currentTemplate.questionId) 
      : deal?.questionId;
    
    if (!questionIdToUse) {
      setQuestions([]);
      setTemplateCategories([]);
      return;
    }
    
    try {
      // 调用接口，传入 questionId
      const categoriesRes = await questionService.queryTemplateCategories(questionIdToUse);
      if (categoriesRes.success && categoriesRes.data) {
        setTemplateCategories(categoriesRes.data);
        
        // 在 templateInfoVos 中查找 id === questionId 的分类
        const matchedCategory = categoriesRes.data.find(c => c.id === questionIdToUse);
        
        if (matchedCategory) {
          // 找到匹配的分类，选中它并显示其问题列表
          setSelectedCategoryId(matchedCategory.id);
          setQuestions(matchedCategory.questionList || []);
        } else if (categoriesRes.data.length > 0) {
          // 如果没找到匹配的，默认选中第一个
          const firstCategory = categoriesRes.data[0];
          setSelectedCategoryId(firstCategory.id);
          setQuestions(firstCategory.questionList || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch questions:', error);
    }
  };

  // 获取模板详情
  const fetchTemplateDetail = async () => {
    if (!deal?.templateId) {
      setCurrentTemplate(null);
      return;
    }
    
    try {
      const res = await templateService.getTemplateDetail(deal.templateId);
      if (res.success && res.data) {
        setCurrentTemplate(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch template detail:', error);
    }
  };

  // 当 activeTab 变化时，懒加载对应 tab 的数据
  useEffect(() => {
    const loadTabData = async () => {
      // 如果该 tab 的数据已加载过，跳过
      if (loadedTabs.has(activeTab)) return;
      
      switch (activeTab) {
        case 'upload':
          await fetchDealDetail();
          break;
        case 'template':
          await fetchTemplateDetail();
          break;
        case 'questions':
          await fetchQuestions();
          break;
      }
      
      // 标记该 tab 已加载
      setLoadedTabs(prev => new Set(prev).add(activeTab));
    };
    
    loadTabData();
  }, [activeTab, deal?.id, deal?.templateId, deal?.questionId]);

  // 当模板的 questionId 变化时，清除问题列表的加载标记
  useEffect(() => {
    if (currentTemplate?.questionId) {
      setLoadedTabs(prev => {
        const newSet = new Set(prev);
        newSet.delete('questions');
        return newSet;
      });
    }
  }, [currentTemplate?.questionId]);

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
        // 刷新资源列表
        await fetchDealDetail();
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
    if (!deal?.id) {
      Toast.fail('未找到尽调实例');
      return;
    }

    try {
      Toast.loading({ message: '删除中...', duration: 0 });
      const res = await dealService.deleteDealMaterial(deal.id, resourceId);
      Toast.clear();

      if (res.success) {
        Toast.success('删除成功');
        // 刷新资源列表
        await fetchDealDetail();
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
        // 刷新资源列表
        await fetchDealDetail();
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
  const getFileIconSrc = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (['xlsx', 'xls', 'csv'].includes(ext)) {
      return `${basePath}assets/excel.png`;
    } else if (['doc', 'docx'].includes(ext)) {
      return `${basePath}assets/word.png`;
    } else if (['pdf'].includes(ext)) {
      return `${basePath}assets/pdf.png`;
    } else if (['txt', 'text'].includes(ext)) {
      return `${basePath}assets/txt.png`;
    } else if (['ppt', 'pptx'].includes(ext)) {
      return `${basePath}assets/ppt.png`;
    } else if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) {
      return `${basePath}assets/image.png`;
    }
    // 默认使用 txt 图标
    return `${basePath}assets/txt.png`;
  };

  const uploadOptions = [
    { id: 'camera', label: '相机', icon: Camera },
    { id: 'gallery', label: '相册', icon: ImageIcon },
    { id: 'file', label: '文件', icon: FileText },
    { id: 'voice', label: '语音录入', icon: Mic },
  ];

  return (
    <div className="flex flex-col h-full bg-white relative">
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
              onClick={() => {
                setActiveTab(tabId);
                onTabChange?.(tabId);
              }}
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
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-[#F7F8FA]">
        
        {/* Tab 1: Upload */}
        {activeTab === 'upload' && (
          <div className="space-y-4">
            {/* Upload Grid */}
            <div className="sticky top-0 z-30 px-4 pt-4 pb-2 bg-[#F7F8FA]">
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
            </div>

            {/* AI Analysis Card */}
            <div className="mx-4 rounded-2xl p-4 flex items-center justify-between relative overflow-hidden shadow-sm"
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

            {/* Uploaded Files List */}
            {/* Uploaded Files List */}
            {resources.length > 0 && (
              <div className="mx-4 bg-white rounded-2xl shadow-sm pb-4">
                <div className="sticky top-[154px] z-20 bg-white px-4 py-4 rounded-t-2xl border-b border-gray-100">
                  <h3 className="text-sm font-bold text-slate-800">已上传资料 ({resources.length})</h3>
                </div>
                <div className="px-4 divide-y divide-gray-100">
                  {resources.map((resource) => {
                    const iconSrc = getFileIconSrc(resource.fileName);
                    return (
                      <div 
                        key={resource.id} 
                        className="flex items-center py-3 gap-3"
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
            )}
          </div>
        )}

        {/* Tab 2: Templates */}
        {activeTab === 'template' && (
          <div className="space-y-3 p-4">
             {currentTemplate ? (
               <div key={currentTemplate.id} className="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-4">
                  {/* Card Header */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#E8F8F0] flex items-center justify-center flex-shrink-0 text-[#07C160]">
                       <FileSpreadsheet size={24} strokeWidth={1.5} />
                    </div>
                    <h3 className="text-[15px] font-bold text-slate-800 leading-snug pt-1">
                      {currentTemplate.reportTemplateName}
                    </h3>
                  </div>
                  
                  {/* Card Footer */}
                  <div className="flex items-center justify-between pt-1">
                     <div className="px-2 py-1 rounded-md text-[10px] font-medium bg-gray-100 text-gray-500">
                       默认使用
                     </div>
                     
                     <div className="flex gap-3">
                        <Button 
                          variant="secondary" 
                          size="small" 
                          className="!h-8 !px-4 !border-gray-200 !text-gray-600 !rounded-full !font-normal"
                          onClick={() => {
                            if (onPreviewTemplate && currentTemplate) {
                              onPreviewTemplate(currentTemplate.reportTemplateName, currentTemplate.outTemplateUrl);
                            }
                          }}
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
             ) : (
               <div className="py-12 text-center text-gray-400 text-sm">
                 暂无模板信息
               </div>
             )}
          </div>
        )}
        
        {/* Tab 3: Questions */}
        {activeTab === 'questions' && (
          <div className="flex flex-col h-full p-4 pb-2 overflow-hidden relative">
            {/* Category Selector and Refresh Button */}
            <div className="flex items-center gap-3">
              {/* Category Dropdown */}
              <div className="flex-1 relative">
                <select
                  value={selectedCategoryId}
                  onChange={(e) => {
                    const newCategoryId = e.target.value;
                    
                    Dialog.confirm({
                      title: '切换确认',
                      message: '切换模板分类将重置之前新增或修改的问题，是否确认切换？',
                    })
                    .then(() => {
                      setSelectedCategoryId(newCategoryId);
                      
                      // 查找对应的分类并更新问题列表
                      const category = templateCategories.find(c => c.id === newCategoryId);
                      if (category) {
                        setQuestions(category.questionList || []);
                      }
                    })
                    .catch(() => {
                      // 取消切换
                    });
                  }}
                  className="w-full h-12 px-4 pr-10 bg-white text-slate-800 text-sm rounded-xl border border-gray-200 appearance-none focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                >
                  {templateCategories.length === 0 && <option value="">请选择分类</option>}
                  {templateCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.templateName}
                    </option>
                  ))}
                </select>
                {/* Dropdown Arrow */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Refresh Button */}
              <button
                onClick={async () => {
                  // 清除问题列表缓存并重新加载
                  setLoadedTabs(prev => {
                    const newSet = new Set(prev);
                    newSet.delete('questions');
                    return newSet;
                  });
                  await fetchQuestions();
                }}
                className="w-12 h-12 flex items-center justify-center bg-white rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 active:scale-95 transition-all"
              >
                <RefreshCw size={20} />
              </button>
            </div>

            {/* Questions List */}
            {questions.length > 0 ? (
              <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm overflow-hidden mt-3">
                {/* Fixed Header */}
                <div className="p-4 border-b border-gray-100 flex-shrink-0">
                  <h3 className="text-sm font-bold text-slate-800">问题列表 ({questions.length})</h3>
                </div>
                
                {/* Scrollable Questions Content */}
                <div className="flex-1 overflow-y-auto pb-20">
                  <div className="divide-y divide-gray-100">
                    {questions.map((question) => (
                      <div 
                        key={question.id}
                        className="flex items-center py-3 px-4 gap-2"
                      >
                        {/* Question Index */}
                        <span className="text-sm font-medium text-indigo-600 flex-shrink-0 w-6">
                          {question.questionIndex}.
                        </span>
                        
                        {/* Question Name */}
                        <span className="flex-1 text-sm text-slate-800">
                          {question.questionName}
                        </span>
                        
                        {/* Action Buttons */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {/* 编辑按钮 */}
                          <button 
                            onClick={() => {
                              setEditingQuestion(question);
                              setEditedQuestionName(question.questionName);
                              setQuestionEditModalVisible(true);
                            }}
                            className="p-2 text-gray-300 hover:text-indigo-500 transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                          {/* 删除按钮 */}
                          <button 
                            onClick={() => {
                              setDeletingQuestion(question);
                              setQuestionDeleteModalVisible(true);
                            }}
                            className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 mt-3">
                <FileText size={48} className="mb-4 opacity-20" />
                <p className="text-sm">暂无问题</p>
              </div>
            )}
            
            {/* Add Question Button */}
            <button 
              onClick={() => {
                setNewQuestionName('');
                setQuestionAddModalVisible(true);
              }}
              className="absolute right-6 bottom-6 w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-white transition-transform active:scale-95"
              style={{ background: 'linear-gradient(135deg, #4E3EF8 0%, #6B5EFF 100%)' }}
            >
              <Plus size={24} />
            </button>
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

      {/* Question Edit Modal */}
      {questionEditModalVisible && editingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setQuestionEditModalVisible(false)}
          />
          <div className="relative bg-white rounded-2xl w-[85%] max-w-[340px] shadow-xl animate-fadeIn">
            <div className="pt-5 pb-3 text-center">
              <h3 className="text-lg font-semibold text-slate-800">编辑问题</h3>
            </div>
            <div className="px-5 pb-5">
              <textarea
                value={editedQuestionName}
                onChange={(e) => setEditedQuestionName(e.target.value)}
                className="w-full min-h-[120px] p-4 text-base text-slate-700 bg-gray-50 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none resize-none transition-all"
                placeholder="请输入问题内容"
              />
            </div>
            <div className="flex border-t border-gray-100">
              <button
                onClick={() => setQuestionEditModalVisible(false)}
                className="flex-1 py-4 text-center text-slate-600 font-medium hover:bg-gray-50 rounded-bl-2xl transition-colors"
              >
                取消
              </button>
              <button
                onClick={async () => {
                  if (editedQuestionName.trim() && editingQuestion) {
                    const updatedList = questions.map(q => 
                      q.id === editingQuestion.id 
                        ? { ...q, questionName: editedQuestionName.trim() } 
                        : q
                    );
                    
                    if (deal?.id) {
                      Toast.loading({ message: '修改中...', duration: 0 });
                      try {
                        const res = await dealService.createOrUpdateDealInst({
                          id: deal.id,
                          questionId: deal.questionId,
                          questionInfoList: updatedList
                        });
                        Toast.clear();
                        if (res.success) {
                          setQuestions(updatedList);
                          Toast.success('修改成功');
                        } else {
                          Toast.fail(res.message || '修改失败');
                          return;
                        }
                      } catch (error) {
                        Toast.clear();
                        Toast.fail('修改失败');
                        return;
                      }
                    } else {
                      setQuestions(updatedList);
                      Toast.success('修改成功');
                    }
                  }
                  setQuestionEditModalVisible(false);
                }}
                className="flex-1 py-4 text-center text-white font-medium rounded-br-2xl transition-colors"
                style={{ background: 'linear-gradient(135deg, #4E3EF8 0%, #6B5EFF 100%)' }}
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Question Delete Confirm Modal */}
      {questionDeleteModalVisible && deletingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setQuestionDeleteModalVisible(false)}
          />
          <div className="relative bg-white rounded-2xl w-[85%] max-w-[320px] shadow-xl animate-fadeIn overflow-hidden">
            <div className="pt-6 pb-4 px-6 text-center">
              <div className="w-14 h-14 mx-auto mb-4 bg-red-50 rounded-full flex items-center justify-center">
                <Trash2 size={24} className="text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">删除问题</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                确定要删除该问题吗？删除后无法恢复。
              </p>
            </div>
            <div className="flex border-t border-gray-100">
              <button
                onClick={() => setQuestionDeleteModalVisible(false)}
                className="flex-1 py-4 text-center text-slate-600 font-medium hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={async () => {
                  if (deletingQuestion) {
                    const updatedList = questions.filter(q => q.id !== deletingQuestion.id);
                    
                    if (deal?.id) {
                      Toast.loading({ message: '删除中...', duration: 0 });
                      try {
                        const res = await dealService.createOrUpdateDealInst({
                          id: deal.id,
                          questionId: deal.questionId,
                          questionInfoList: updatedList
                        });
                        Toast.clear();
                        if (res.success) {
                          setQuestions(updatedList);
                          Toast.success('删除成功');
                        } else {
                          Toast.fail(res.message || '删除失败');
                          return;
                        }
                      } catch (error) {
                        Toast.clear();
                        Toast.fail('删除失败');
                        return;
                      }
                    } else {
                      setQuestions(updatedList);
                      Toast.success('删除成功');
                    }
                  }
                  setQuestionDeleteModalVisible(false);
                }}
                className="flex-1 py-4 text-center text-white font-medium bg-red-500 hover:bg-red-600 transition-colors"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Question Add Modal */}
      {questionAddModalVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setQuestionAddModalVisible(false)}
          />
          <div className="relative bg-white rounded-2xl w-[85%] max-w-[340px] shadow-xl animate-fadeIn">
            <div className="pt-5 pb-3 text-center">
              <h3 className="text-lg font-semibold text-slate-800">新增问题</h3>
            </div>
            <div className="px-5 pb-5">
              <textarea
                value={newQuestionName}
                onChange={(e) => setNewQuestionName(e.target.value)}
                className="w-full min-h-[120px] p-4 text-base text-slate-700 bg-gray-50 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none resize-none transition-all"
                placeholder="请输入问题内容"
              />
            </div>
            <div className="flex border-t border-gray-100">
              <button
                onClick={() => setQuestionAddModalVisible(false)}
                className="flex-1 py-4 text-center text-slate-600 font-medium hover:bg-gray-50 rounded-bl-2xl transition-colors"
              >
                取消
              </button>
              <button
                onClick={async () => {
                  if (newQuestionName.trim()) {
                    const newQuestion: QuestionInfo = {
                      // id: `temp_${Date.now()}`,
                      questionName: newQuestionName.trim(),
                      questionIndex: questions.length + 1,
                      recStatus: '1',
                      questionAnswer: null,
                      questionAnswerTime: null,
                      questionStatus: '0',
                      templateId: '',
                      agencyId: '',
                      CHECKED: false,
                    };
                    
                    const updatedList = [...questions, newQuestion];
                    
                    if (deal?.id) {
                      Toast.loading({ message: '添加中...', duration: 0 });
                      try {
                        const res = await dealService.createOrUpdateDealInst({
                          id: deal.id,
                          questionId: deal.questionId,
                          questionInfoList: updatedList
                        });
                        Toast.clear();
                        if (res.success) {
                          setQuestions(updatedList);
                          Toast.success('添加成功');
                        } else {
                          Toast.fail(res.message || '添加失败');
                          return;
                        }
                      } catch (error) {
                        Toast.clear();
                        console.error('Update questions failed:', error);
                        Toast.fail('添加失败');
                        return;
                      }
                    } else {
                      setQuestions(updatedList);
                      Toast.success('添加成功');
                    }
                  }
                  setQuestionAddModalVisible(false);
                }}
                className="flex-1 py-4 text-center text-white font-medium rounded-br-2xl transition-colors"
                style={{ background: 'linear-gradient(135deg, #4E3EF8 0%, #6B5EFF 100%)' }}
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

export default MaterialUploadPage;
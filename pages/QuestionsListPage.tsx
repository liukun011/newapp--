import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ArrowLeft, FileText, Pencil, Plus, Trash2, Cpu, MessageSquareMore, ChevronDown, ChevronUp } from 'lucide-react';
import { Toast } from 'react-vant';
import { QuestionInfo } from '../types';
import { dealService } from '../services/dealService';

// AI 问题结构
export interface AiInsightQuestion {
  id: string;
  questionContent: string;
  createDate?: string;
  isAdded?: boolean;
}

interface QuestionsListPageProps {
  dealId?: string;
  dealName?: string;
  dealLogo?: string;
  questionInfoList?: QuestionInfo[];
  aiInsightList?: AiInsightQuestion[];
  onBack: () => void;
  onUpdateQuestion?: (question: QuestionInfo) => void;
  onDeleteQuestion?: (questionId: string) => void;
  onAddQuestion?: (questionName: string) => void;
  onSave?: (questions: QuestionInfo[]) => Promise<void>;
  isArchived?: boolean;
}

type TabType = 'ALL' | 'PENDING' | 'ADDED';

const QuestionsListPage: React.FC<QuestionsListPageProps> = ({
  dealId,
  dealName = '尽调详情',
  dealLogo,
  questionInfoList = [],
  aiInsightList = [],
  onBack,
  onSave,
  isArchived = false,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<TabType>('ALL');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionInfo | null>(null);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletingQuestion, setDeletingQuestion] = useState<QuestionInfo | null>(null);
  
  const [localQuestions, setLocalQuestions] = useState<QuestionInfo[]>(questionInfoList);
  const [internalAiInsightList, setInternalAiInsightList] = useState<AiInsightQuestion[]>(aiInsightList);
  const [acceptedAiQuestions, setAcceptedAiQuestions] = useState<AiInsightQuestion[]>([]);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const pendingAiQuestionsRef = useRef<AiInsightQuestion[]>([]);
  const isDirtyRef = useRef(false);

  useEffect(() => { if (!isDirtyRef.current) setLocalQuestions(questionInfoList); }, [questionInfoList]);

  useEffect(() => {
    if (dealId) {
        dealService.getAiInsight(dealId, false).then(res => {
            if (res.success && res.data) setInternalAiInsightList(res.data);
        });
    }
  }, [dealId]);

  useEffect(() => {
    if (aiInsightList?.length) setInternalAiInsightList(aiInsightList);
  }, [aiInsightList]);

  const handleBack = async () => {
    const questionsToAccept = pendingAiQuestionsRef.current;
    console.log('[QuestionsList] handleBack triggered', { isDirty: isDirtyRef.current, accepted: questionsToAccept.length });
    
    if ((isDirtyRef.current || questionsToAccept.length > 0) && onSave) {
        Toast.loading({ message: '保存中...', duration: 0 });
        try { 
            // 采纳 AI 问题同步到后端
            if (dealId && questionsToAccept.length > 0) {
              console.log('[QuestionsList] Syncing accepted AI questions:', questionsToAccept);
              await dealService.acceptAiInsight(dealId, questionsToAccept);
            }

            // 清洗数据：剔除临时生成的 ID (temp_...)，否则后端可能会因找不到对应实例而报错
            const cleanedQuestions = localQuestions.map(q => {
               if (q.id && String(q.id).startsWith('temp_')) {
                   const { id, ...rest } = q;
                   return rest as QuestionInfo;
               }
               return q;
            });
            await onSave(cleanedQuestions); 
            Toast.clear(); 
        } catch(e) { 
            console.error('[QuestionsList] Save error:', e);
            Toast.clear(); 
        }
    }
    onBack();
  };

  const filteredQuestions = useMemo(() => {
    if (activeTab === 'ALL') return localQuestions;
    const aiList = internalAiInsightList || [];
    if (activeTab === 'PENDING') return aiList.filter(aiQ => !localQuestions.some(lq => lq.questionName === aiQ.questionContent));
    if (activeTab === 'ADDED') return aiList.filter(aiQ => localQuestions.some(lq => lq.questionName === aiQ.questionContent));
    return [];
  }, [activeTab, localQuestions, internalAiInsightList]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddAiQuestion = (aiItem: AiInsightQuestion) => {
    const name = aiItem.questionContent;
    const newQ: QuestionInfo = { 
        id: `temp_ai_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        questionName: name.trim(), 
        questionIndex: localQuestions.length + 1, 
        recStatus: '1', 
        questionAnswer: null, 
        questionAnswerTime: null, 
        questionStatus: '0', 
        templateId: '', 
        agencyId: '', 
        CHECKED: false 
    };
    setLocalQuestions(p => [...p, newQ]);
    setAcceptedAiQuestions(p => [...p, aiItem]); // 记录接纳的原始内容
    pendingAiQuestionsRef.current.push(aiItem); // 同时存入 Ref 确保 handleBack 能即时拿到
    isDirtyRef.current = true;
    Toast.success('已加入清单');
  };

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFF]">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-slate-50 shrink-0 z-10">
        <button onClick={handleBack} className="p-2 -ml-2 text-slate-600 active:bg-slate-50 rounded-full"><ArrowLeft size={24} /></button>
        <h1 className="text-[18px] font-bold text-slate-800">问题集合</h1>
        <div className="w-8" />
      </div>

      {/* Modern Tabs */}
      <div className="px-4 py-3 flex items-center gap-2 shrink-0 overflow-x-auto scrollbar-hide">
        {(['ALL', 'PENDING', 'ADDED'] as const).map((tab) => {
            const isActive = activeTab === tab;
            const labels = { ALL: '全部', PENDING: 'AI 建议', ADDED: '已采纳' };
            const counts = { 
                ALL: localQuestions.length, 
                PENDING: internalAiInsightList.length - internalAiInsightList.filter(ai => localQuestions.some(lq => lq.questionName === ai.questionContent)).length,
                ADDED: internalAiInsightList.filter(ai => localQuestions.some(lq => lq.questionName === ai.questionContent)).length
            };
            return (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 rounded-2xl text-[12px] font-bold transition-all flex items-center gap-1.5 shrink-0 ${isActive ? 'bg-[#4B42F5] text-white shadow-[0_4px_12px_rgba(75,66,245,0.2)]' : 'bg-white text-slate-400 border border-slate-50'}`}
                >
                  {tab === 'PENDING' && <Cpu size={12} />}
                  {labels[tab]}
                  <span className={`px-1 py-0.5 rounded-md text-[9px] ${isActive ? 'bg-white/20' : 'bg-slate-100 text-slate-400'}`}>{counts[tab]}</span>
                </button>
            );
        })}
      </div>

      {/* List Content */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 pb-28">
        <div className="space-y-2">
          {filteredQuestions.map((item: any, index) => {
            const isAiRaw = activeTab === 'PENDING' || activeTab === 'ADDED';
            const qName = isAiRaw ? item.questionContent : item.questionName;
            const isChecked = !isAiRaw && item.CHECKED;
            const isAiSource = isAiRaw || internalAiInsightList.some(ai => ai.questionContent === qName);
            
            return (
              <div 
                key={item.id || index}
                className="bg-white rounded-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.015)] border border-slate-50 relative group transition-all overflow-hidden"
              >
                <div 
                  className="flex-1 p-3 flex flex-col gap-1.5 cursor-pointer active:bg-slate-50/50"
                  onClick={() => !isAiRaw && item.questionAnswer && toggleExpand(item.id)}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex-1">
                       <div className="flex items-center gap-1.5 mb-1">
                         <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${isAiSource ? 'bg-indigo-50 text-indigo-500' : 'bg-blue-50 text-blue-500'}`}>
                           {isAiSource ? 'AI 洞察' : '基础问题'}
                         </span>
                         {!isAiRaw && isChecked && <span className="text-[9px] font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded">已访谈</span>}
                       </div>
                       
                       <div className="flex items-start gap-1.5">
                         {activeTab === 'ALL' && <span className="text-[14px] font-bold text-indigo-500 mt-[1px]">{index + 1}.</span>}
                         <p className={`flex-1 text-[14px] font-bold leading-[1.5] ${isChecked ? 'text-indigo-600' : 'text-slate-700'}`}>
                           {qName}
                         </p>
                         {!isAiRaw && item.questionAnswer && (
                            <div className="shrink-0 text-indigo-400 mt-0.5">
                              {expandedIds[item.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                         )}
                       </div>
                    </div>
                    
                    {activeTab === 'PENDING' ? (
                       <button 
                         onClick={(e) => { e.stopPropagation(); handleAddAiQuestion(item); }}
                         className="shrink-0 bg-[#4B42F5] text-white px-3 py-1.5 rounded-lg text-[11px] font-bold active:scale-95 transition-all"
                       >
                         加入
                       </button>
                    ) : (
                       <div className="flex flex-col gap-1 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity">
                         <button onClick={(e) => { e.stopPropagation(); setEditingQuestion(item); setEditModalVisible(true);}} className="p-1.5 bg-slate-50 text-slate-400 rounded-lg hover:bg-indigo-50 hover:text-indigo-500 transition-colors"><Pencil size={12} /></button>
                         <button onClick={(e) => { e.stopPropagation(); setDeletingQuestion(item); setDeleteModalVisible(true);}} className="p-1.5 bg-slate-50 text-slate-400 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
                       </div>
                    )}
                  </div>

                  {/* 展示答复内容 - 更加紧凑 */}
                  {!isAiRaw && item.questionAnswer && expandedIds[item.id] && (
                    <div className="mt-1.5 p-3 bg-[#F5F7FF] rounded-[12px] border-none animate-scaleIn">
                       <div className="text-[14px] font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                          <div className="w-1 h-3.5 bg-[#5C66FF] rounded-full" /> 参考回答：
                       </div>
                       <p className="text-[13px] text-slate-600 leading-normal">
                          {item.questionAnswer}
                       </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
          {filteredQuestions.length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center gap-4 grayscale opacity-40">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-inner">
                <FileText size={40} className="text-slate-300" />
              </div>
              <span className="text-[14px] font-bold text-slate-300">空空如也...</span>
            </div>
          )}
        </div>
      </div>

      {/* Floating Action */}
      {!isArchived && activeTab === 'ALL' && (
        <button 
          onClick={() => setAddModalVisible(true)}
          className="fixed right-4 bottom-10 w-12 h-12 bg-gradient-to-br from-[#4B42F5] to-[#6366F1] text-white rounded-[16px] shadow-[0_8px_20px_rgba(75,66,245,0.3)] flex items-center justify-center active:scale-90 transition-all z-50 group overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <Plus size={24} strokeWidth={2.5} />
        </button>
      )}

      {/* Modals with Premium Styling */}
      {addModalVisible && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/40">
            <div className="bg-white rounded-[16px] w-[320px] overflow-hidden animate-scaleIn shadow-2xl">
               <div className="pt-6 pb-4 text-center text-[18px] font-bold text-[#333333]">
                  新增问题
               </div>
               <div className="px-5 pb-6">
                 <textarea
                    autoFocus
                    className="w-full h-[130px] p-4 text-[15px] text-[#333333] bg-[#F8FAFF] rounded-[12px] border border-[#E5E7EB] outline-none focus:border-[#4B42F5] transition-all resize-none placeholder:text-[#9CA3AF]"
                    placeholder="请输入问题内容"
                    onChange={(e) => (window as any)._tmpQ = e.target.value}
                 />
               </div>
               <div className="flex border-t border-[#F3F4F6] h-[55px]">
                  <button onClick={() => setAddModalVisible(false)} className="flex-1 text-[#4B5563] font-medium text-[16px] bg-white active:bg-[#F9FAFB] transition-colors border-r border-[#F3F4F6]">取消</button>
                  <button onClick={() => {
                    const name = (window as any)._tmpQ;
                    if (name) {
                        const newQ: QuestionInfo = { 
                          id: `temp_m_${Date.now()}`, questionName: name.trim(), questionIndex: localQuestions.length + 1, recStatus: '1', questionAnswer: null, questionAnswerTime: null, questionStatus: '0', templateId: '', agencyId: '', CHECKED: false 
                        };
                        setLocalQuestions(p => [...p, newQ]);
                        isDirtyRef.current = true;
                        setAddModalVisible(false);
                        (window as any)._tmpQ = '';
                    }
                  }} className="flex-1 bg-[#5C66FF] text-white font-medium text-[16px] active:bg-[#4B52F5] transition-colors">确认</button>
               </div>
            </div>
        </div>
      )}

      {editModalVisible && editingQuestion && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/40">
            <div className="bg-white rounded-[16px] w-[320px] overflow-hidden animate-scaleIn shadow-2xl">
               <div className="pt-6 pb-4 text-center text-[18px] font-bold text-[#333333]">
                  编辑问题
               </div>
               <div className="px-5 pb-6">
                 <textarea
                    defaultValue={editingQuestion.questionName}
                    className="w-full h-[130px] p-4 text-[15px] text-[#333333] bg-[#F8FAFF] rounded-[12px] border border-[#E5E7EB] outline-none focus:border-[#4B42F5] transition-all resize-none placeholder:text-[#9CA3AF]"
                    onChange={(e) => (window as any)._tmpEditQ = e.target.value}
                 />
               </div>
               <div className="flex border-t border-[#F3F4F6] h-[55px]">
                  <button onClick={() => setEditModalVisible(false)} className="flex-1 text-[#4B5563] font-medium text-[16px] bg-white active:bg-[#F9FAFB] transition-colors border-r border-[#F3F4F6]">取消</button>
                  <button onClick={() => {
                    const name = (window as any)._tmpEditQ || editingQuestion.questionName;
                    setLocalQuestions(p => p.map(q => q.id === editingQuestion.id ? { ...q, questionName: name } : q));
                    isDirtyRef.current = true;
                    setEditModalVisible(false);
                    (window as any)._tmpEditQ = '';
                  }} className="flex-1 bg-[#5C66FF] text-white font-medium text-[16px] active:bg-[#4B52F5] transition-colors">确认</button>
               </div>
            </div>
        </div>
      )}

      {deleteModalVisible && deletingQuestion && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/40">
            <div className="bg-white rounded-[16px] w-[290px] overflow-hidden animate-scaleIn shadow-2xl pt-6">
               <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Trash2 size={22} />
               </div>
               <h3 className="text-[17px] font-bold text-center text-[#333333] mb-1">确认移除？</h3>
               <p className="text-[13px] text-slate-400 mb-5 px-6 text-center leading-relaxed">确定要从清单中删除此问题吗？此操作不可撤销。</p>
               
               <div className="flex border-t border-[#F3F4F6] h-[50px]">
                  <button onClick={() => setDeleteModalVisible(false)} className="flex-1 text-[#4B5563] font-medium text-[15px] bg-white active:bg-[#F9FAFB] transition-colors border-r border-[#F3F4F6]">取消</button>
                  <button onClick={() => {
                    setLocalQuestions(p => p.filter(q => q.id !== deletingQuestion.id));
                    isDirtyRef.current = true;
                    setDeleteModalVisible(false);
                  }} className="flex-1 bg-red-500 text-white font-medium text-[15px] active:bg-red-600 transition-colors">确认删除</button>
               </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default QuestionsListPage;

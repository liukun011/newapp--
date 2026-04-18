import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ArrowLeft, Cpu, ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from 'lucide-react';
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
  onBack: () => void;
  onSave?: (questions: QuestionInfo[]) => Promise<void>;
  isArchived?: boolean;
}

type TabType = 'ALL' | 'PENDING';

const QuestionsListPage: React.FC<QuestionsListPageProps> = ({
  dealId,
  dealName = '尽调详情',
  dealLogo,
  questionInfoList = [],
  onBack,
  onSave,
  isArchived = false,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<TabType>('ALL');
  const [localAiInsights, setLocalAiInsights] = useState<AiInsightQuestion[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);
  const [localQuestions, _setLocalQuestions] = useState<QuestionInfo[]>(questionInfoList);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  
  // 使用 Ref 实时记录最新数据，解决闭包导致的保存数据不完整问题
  const questionsRef = useRef<QuestionInfo[]>(questionInfoList);
  const isDirtyRef = useRef(false);
  const hasCalledSaveRef = useRef(false);

  // 统一的状态更新方法
  const setLocalQuestions = (val: QuestionInfo[] | ((p: QuestionInfo[]) => QuestionInfo[])) => {
    if (typeof val === 'function') {
      const newVal = val(questionsRef.current);
      questionsRef.current = newVal;
      _setLocalQuestions(newVal);
    } else {
      questionsRef.current = val;
      _setLocalQuestions(val);
    }
  };

  useEffect(() => { 
    if (!isDirtyRef.current) setLocalQuestions(questionInfoList); 
  }, [questionInfoList]);

  // 内部保存逻辑封装
  const performSave = async (showToast = true) => {
    // 每次执行前读取 Ref，确保拿到的是最新点击“加入”后的列表
    const currentQuestions = questionsRef.current;
    
    // 获取本次新增的 AI 问题 (id 以 temp_ai_ 开头)
    const addedAiQuestions = currentQuestions.filter(q => q.id && String(q.id).startsWith('temp_ai_'));
    const isDirty = isDirtyRef.current || addedAiQuestions.length > 0;

    console.log('[QuestionsList] performSave check:', { isDirty, questionsCount: currentQuestions.length, addedAi: addedAiQuestions.length });

    if (!isDirty || !onSave || hasCalledSaveRef.current) return;

    hasCalledSaveRef.current = true;
    if (showToast) Toast.loading({ message: '保存中...', duration: 0 });
    
    try { 
        // 1. 同步采纳 AI 问题到后端
        if (dealId && addedAiQuestions.length > 0) {
          const aiInsightsToAccept = addedAiQuestions.map(q => ({
            questionContent: q.questionName
          }));
          await dealService.acceptAiInsight(dealId, aiInsightsToAccept);
        }

        // 2. 清洗数据并保存全量清单
        const cleanedQuestions = currentQuestions.map(q => {
           if (q.id && String(q.id).startsWith('temp_')) {
               const { id, ...rest } = q;
               return rest as QuestionInfo;
           }
           return q;
         });
         
        await onSave(cleanedQuestions); 
        isDirtyRef.current = false;
        if (showToast) Toast.clear(); 
    } catch(e) { 
        console.error('[QuestionsList] Save error:', e);
        if (showToast) Toast.clear(); 
        hasCalledSaveRef.current = false; 
    }
  };

  // 页面加载时拉取 AI 洞察结果
  useEffect(() => {
    if (dealId) {
      setLoadingAi(true);
      dealService.aiInsight(dealId, false)
        .then(res => {
          if (Array.isArray(res)) {
            setLocalAiInsights(res);
          } else if ((res as any)?.success && Array.isArray((res as any)?.data)) {
            setLocalAiInsights((res as any).data);
          }
        })
        .catch(err => {
          console.error('Failed to fetch AI insights:', err);
        })
        .finally(() => {
          setLoadingAi(false);
        });
    }
  }, [dealId]);

  // 监听组件卸载（包含原生手势返回）
  useEffect(() => {
    return () => {
      // 卸载时由于 Toast 挂载受限，使用静默保存
      performSave(false);
    };
  }, []); // 仅在销毁时触发

  const handleBack = async () => {
    await performSave(true);
    onBack();
  };

  const filteredQuestions = useMemo(() => {
    if (activeTab === 'ALL') return localQuestions;
    if (activeTab === 'PENDING') return localAiInsights.filter(aiQ => !aiQ.isAdded && !localQuestions.some(lq => lq.questionName === aiQ.questionContent));
    return [];
  }, [activeTab, localQuestions, localAiInsights]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddAiQuestion = (aiQ: AiInsightQuestion) => {
    const isAlreadyInList = questionsRef.current.some(q => q.questionName === aiQ.questionContent);
    if (isAlreadyInList) {
      Toast.info('该问题已在清单中');
      return;
    }

    const newQ: QuestionInfo = { 
        id: `temp_ai_${Date.now()}`,
        questionName: aiQ.questionContent.trim(), 
        questionIndex: questionsRef.current.length + 1, 
        recStatus: '1', 
        questionAnswer: null, 
        questionAnswerTime: null, 
        questionStatus: '0', 
        questionType: '2',
        templateId: '', 
        agencyId: '', 
        CHECKED: false 
    };

    // 立即更新 Ref 和 State
    setLocalQuestions(p => [...p, newQ]);
    setLocalAiInsights(p => p.map(item => item.id === aiQ.id ? { ...item, isAdded: true } : item));
    
    // 明确标记为已脏
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
        {(['ALL', 'PENDING'] as const).map((tab) => {
            const isActive = activeTab === tab;
            const labels = { ALL: '全部问题', PENDING: 'AI 建议' };
            const counts = { 
                ALL: localQuestions.length, 
                PENDING: localAiInsights.filter(ai => !ai.isAdded && !localQuestions.some(lq => lq.questionName === ai.questionContent)).length,
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
        {loadingAi && activeTab === 'PENDING' ? (
          <div className="py-10 text-center text-slate-400 text-[13px]">加载 AI 建议中...</div>
        ) : filteredQuestions.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-[13px]">暂无问题数据</div>
        ) : (
          <div className="space-y-2">
            {filteredQuestions.map((item: any, index) => {
              const isAiRaw = activeTab === 'PENDING';
              const qName = isAiRaw ? item.questionContent : item.questionName;
              const isChecked = !isAiRaw && item.CHECKED;
              const isAiSource = isAiRaw || String(item.questionType) === '2' || localAiInsights.some(ai => ai.questionContent === qName);
              
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
                          {String(item.questionType) === '3' ? (
                            <span className="text-[9px] font-bold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded">
                              手动添加问题
                            </span>
                          ) : (
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${isAiSource ? 'bg-indigo-50 text-indigo-500' : 'bg-blue-50 text-blue-500'}`}>
                              {isAiSource ? 'AI 洞察问题' : '模板预设问题'}
                            </span>
                          )}
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
                      
                      {activeTab === 'PENDING' && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleAddAiQuestion(item); }}
                          className="shrink-0 bg-[#4B42F5] text-white px-3 py-1.5 rounded-lg text-[11px] font-bold active:scale-95 transition-all"
                        >
                          加入
                        </button>
                      )}
                    </div>

                    {!isAiRaw && expandedIds[item.id] && item.questionAnswer && (
                      <div className="mt-2.5 pt-2.5 border-t border-slate-50 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">访谈回答</span>
                        </div>
                        <p className="text-[13px] text-slate-600 leading-relaxed bg-slate-50/50 p-2.5 rounded-xl border border-white">
                          {item.questionAnswer}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionsListPage;

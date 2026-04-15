import React, { useState, useEffect, useRef } from 'react';
import { Popup, Toast } from 'react-vant';
import { X, Check, ChevronRight } from 'lucide-react';
import { TemplateInfo } from '../types';

interface TemplateSwitchModalProps {
  visible: boolean;
  onClose: () => void;
  dealId: string;
  templates: TemplateInfo[];
  currentQuestionId?: string;
  onSelect: (templateId: string) => Promise<void>;
}

const TemplateSwitchModal: React.FC<TemplateSwitchModalProps> = ({
  visible,
  onClose,
  dealId,
  templates,
  currentQuestionId,
  onSelect
}) => {
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visible && templates.length > 0 && currentQuestionId) {
      // 稍微延迟确保 DOM 已渲染
      const timer = setTimeout(() => {
        if (activeItemRef.current && listRef.current) {
          activeItemRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [visible, templates, currentQuestionId]);

  const handleSelect = async (id: string) => {
    if (id === currentQuestionId) return;
    try {
      setSwitchingId(id);
      await onSelect(id);
      onClose();
    } catch (e) {
      // 错误已在父级处理
    } finally {
      setSwitchingId(null);
    }
  };

  return (
    <Popup
      visible={visible}
      onClose={onClose}
      position="bottom"
      round
      style={{ height: '55%', background: '#FFFFFF' }}
    >
      <div className="flex flex-col h-full relative overflow-hidden">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute right-5 top-5 p-1.5 bg-slate-50 rounded-full text-slate-300 active:bg-slate-100 z-20 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Fixed Header */}
        <div className="px-5 pt-6 pb-3 shrink-0">
          <div className="px-1">
            <h2 className="text-[17px] font-bold text-slate-800">选择问题清单</h2>
          </div>
        </div>

        {/* Scrollable List container */}
        <div 
          ref={listRef}
          className="flex-1 overflow-y-auto px-5 pb-8 scroll-smooth"
        >
          <div className="space-y-1.5">
            {templates.map((tpl) => {
              const isSelected = String(tpl.id) === String(currentQuestionId);
              const isSwitching = switchingId === tpl.id;
              const questionCount = tpl.questionList?.length || 0;
              
              return (
                <div 
                  key={tpl.id}
                  ref={isSelected ? activeItemRef : null}
                  onClick={() => handleSelect(tpl.id)}
                  className={`
                    flex items-center justify-between
                    relative rounded-[16px] px-4 py-3 transition-all active:scale-[0.98] border
                    ${isSelected 
                      ? 'bg-[#F2F7FF] border-[#4B85EE]/60' 
                      : 'bg-white border-slate-100'}
                  `}
                >
                  <div className="flex-1 pr-2">
                    <h3 className={`text-[15px] font-bold mb-0.5 leading-tight ${isSelected ? 'text-[#3E73F2]' : 'text-slate-800'}`}>{tpl.templateName}</h3>
                    <p className="text-[12px] text-slate-400 font-medium">
                      {questionCount}个预制问题
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {isSelected && (
                      <div className="bg-[#2B6EFB] text-white text-[11px] px-2 py-0.5 rounded-md font-bold shadow-sm">
                        当前
                      </div>
                    )}
                    {isSwitching && (
                       <div className="w-5 h-5 border-2 border-[#2B6EFB] border-t-transparent animate-spin rounded-full" />
                    )}
                    <ChevronRight size={16} className="text-slate-200 ml-0.5" />
                  </div>
                </div>
              );
            })}

            {templates.length === 0 && (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                    <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent animate-spin rounded-full" />
                    <span className="text-[14px] text-slate-400 font-medium tracking-wide">暂无模板数据</span>
                </div>
            )}
          </div>
        </div>
      </div>
    </Popup>
  );
};

export default TemplateSwitchModal;

import React, { useState } from 'react';
import { Popup } from 'react-vant';
import { X, Check, Loader2 } from 'lucide-react';
import { dealService } from '../services/dealService';

interface QuestionListPickerProps {
  visible: boolean;
  onClose: () => void;
  dealId: string;
  onAdd: (ids: string[]) => Promise<void>;
}

const QuestionListPicker: React.FC<QuestionListPickerProps> = ({
  visible,
  onClose,
  dealId,
  onAdd
}) => {
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 每次打开时重新获取数据
  React.useEffect(() => {
    if (visible && dealId) {
      setTempSelectedIds([]);
      setLoading(true);
      dealService.getTemplateList(dealId).then(res => {
        if (res.success && res.data) {
          setTemplates(res.data);
        }
      }).catch(err => {
        console.error('Failed to fetch question list templates:', err);
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [visible, dealId]);

  const toggle = (id: string) => {
    setTempSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onAdd(tempSelectedIds);
      onClose();
    } catch (e) {
      // 错误已在父级处理
    } finally {
      setSubmitting(false);
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
            <h2 className="text-[17px] font-bold text-slate-800">添加问题清单</h2>
          </div>
        </div>

        {/* Scrollable List container */}
        <div className="flex-1 overflow-y-auto px-5 pb-8 scroll-smooth">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 size={24} className="text-indigo-500 animate-spin" />
              <span className="text-[14px] text-slate-400 font-medium tracking-wide">加载中...</span>
            </div>
          ) : templates.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <span className="text-[14px] text-slate-400 font-medium tracking-wide">暂无清单数据</span>
            </div>
          ) : (
            <div className="space-y-1.5">
              {templates.map((tpl) => {
                const isChecked = tempSelectedIds.includes(tpl.id);
                const questionCount = tpl.questionList?.length || 0;

                return (
                  <div
                    key={tpl.id}
                    onClick={() => toggle(tpl.id)}
                    className={`
                      flex items-center justify-between
                      relative rounded-[16px] px-4 py-4 transition-all border cursor-pointer active:scale-[0.98] active:bg-slate-50
                      ${isChecked
                        ? 'bg-[#F5F9FF] border-[#ADC8FF]'
                        : 'bg-white border-slate-100'}
                    `}
                  >
                    <div className="flex-1 pr-2">
                      <h3 className={`text-[15px] font-bold mb-1 leading-tight ${isChecked ? 'text-indigo-600' : 'text-slate-800'}`}>
                        {tpl.templateName}
                      </h3>
                      <p className="text-[12px] font-medium text-slate-400">
                        {questionCount} 个预制问题
                      </p>
                    </div>

                    {/* Checkbox */}
                    <div className={`w-5 h-5 rounded-[4px] flex items-center justify-center transition-all ${
                      isChecked
                        ? 'bg-[#4B42F5] border-[#4B42F5]'
                        : 'border-2 border-slate-300 bg-white'
                    }`}>
                      {isChecked && <Check size={12} className="text-white" strokeWidth={3} />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Fixed Bottom Bar */}
        <div className="shrink-0 px-5 pb-6 pt-2 border-t border-slate-100">
          <button
            onClick={handleConfirm}
            disabled={submitting || tempSelectedIds.length === 0}
            className={`
              w-full h-11 rounded-full font-bold text-[15px] flex items-center justify-center gap-2 transition-all
              ${submitting || tempSelectedIds.length === 0
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-[#4B42F5] text-white active:scale-95 shadow-lg shadow-indigo-500/25'}
            `}
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Check size={16} strokeWidth={3} />
                确认添加{tempSelectedIds.length > 0 ? `（已选 ${tempSelectedIds.length} 个）` : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </Popup>
  );
};

export default QuestionListPicker;

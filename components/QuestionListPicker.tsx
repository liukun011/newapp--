import React, { useState } from 'react';
import { Popup } from 'react-vant';
import { X, Check, Loader2 } from 'lucide-react';
import { dealService } from '../services/dealService';

interface QuestionListPickerProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (ids: string[]) => Promise<void>;
}

const QuestionListPicker: React.FC<QuestionListPickerProps> = ({
  visible,
  onClose,
  onAdd
}) => {
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 每次打开时重新获取数据
  React.useEffect(() => {
    if (visible) {
      setTempSelectedIds([]);
      setLoadFailed(false);
      setLoading(true);
      dealService.getTemplateList().then(res => {
        if (res.success && res.data) {
          setTemplates(res.data);
        } else {
          setLoadFailed(true);
        }
      }).catch(err => {
        console.error('Failed to fetch question list templates:', err);
        setLoadFailed(true);
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [visible]);

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
      style={{ height: '55%', background: '#fffefa' }}
    >
      <div className="flex flex-col h-full relative overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 w-9 h-9 flex items-center justify-center bg-[#fff8e6] border border-[#eadfca] rounded-[12px] text-[#8b641d] active:bg-[#fff3cf] z-20 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Fixed Header */}
        <div className="px-5 pt-6 pb-3 shrink-0">
          <div className="px-1">
            <h2 className="text-[17px] font-semibold text-[#1f2024]">添加问题清单</h2>
          </div>
        </div>

        {/* Scrollable List container */}
        <div className="flex-1 overflow-y-auto px-5 pb-8 scroll-smooth">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 size={24} className="text-[#8b641d] animate-spin" />
              <span className="text-[14px] text-[#a49a8d] font-medium tracking-wide">加载中...</span>
            </div>
          ) : templates.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <span className="text-[14px] text-[#a49a8d] font-medium tracking-wide">
                {loadFailed ? '加载失败，请重试' : '暂无清单数据'}
              </span>
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
                      relative rounded-[14px] px-4 py-3.5 transition-all border cursor-pointer active:scale-[0.98] active:bg-[#fff8e6]
                      ${isChecked
                        ? 'bg-[#fff8e6] border-[#dfcda9]'
                        : 'bg-[#fffefa] border-[#eadfca]/70'}
                    `}
                  >
                    <div className="flex-1 pr-2">
                      <h3 className={`text-[14.5px] font-medium mb-1 leading-tight ${isChecked ? 'text-[#8b641d]' : 'text-[#1f2024]'}`}>
                        {tpl.templateName}
                      </h3>
                      <p className="text-[12px] font-medium text-[#7d7467]">
                        {questionCount} 个预制问题
                      </p>
                    </div>

                    {/* Checkbox */}
                    <div className={`w-5 h-5 rounded-[4px] flex items-center justify-center transition-all ${
                      isChecked
                        ? 'bg-[#C99A3A] border-[#C99A3A]'
                        : 'border-2 border-[#dfcda9] bg-[#fffefa]'
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
        <div className="shrink-0 px-5 pb-6 pt-2 border-t border-[#eadfca]">
          <button
            onClick={handleConfirm}
            disabled={submitting || tempSelectedIds.length === 0}
            className={`
              w-full h-11 rounded-full font-medium text-[15px] flex items-center justify-center gap-2 transition-all
              ${submitting || tempSelectedIds.length === 0
                ? 'bg-[#f0eadf] text-[#a49a8d] cursor-not-allowed'
                : 'bg-primary-gradient text-[#151515] active:scale-95 shadow-[0_6px_14px_rgba(201,154,58,0.14)]'}
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

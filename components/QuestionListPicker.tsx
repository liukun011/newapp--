import React, { useState } from 'react';
import { Popup } from 'react-vant';
import { X, Check, Loader2 } from 'lucide-react';
import { templateService } from '../services/templateService';

interface QuestionListPickerProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (ids: string[], selectedTemplates?: any[]) => Promise<void>;
  title?: string;
  confirmText?: string;
  singleSelect?: boolean;
}

const QuestionListPicker: React.FC<QuestionListPickerProps> = ({
  visible,
  onClose,
  onAdd,
  title = '添加问题清单',
  confirmText = '确认添加',
  singleSelect = false,
}) => {
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const normalizeTemplates = (data: any): any[] => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.records)) return data.records;
    if (Array.isArray(data?.list)) return data.list;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.templateInfoVos)) return data.templateInfoVos;
    return [];
  };

  // 每次打开时重新获取数据
  React.useEffect(() => {
    if (visible) {
      setTempSelectedIds([]);
      setLoadFailed(false);
      setLoading(true);
      templateService.getQuestionTemplateList().then(res => {
        if (res.success && res.data) {
          setTemplates(normalizeTemplates(res.data));
        } else {
          setTemplates([]);
          setLoadFailed(true);
        }
      }).catch(err => {
        console.error('Failed to fetch question list templates:', err);
        setTemplates([]);
        setLoadFailed(true);
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [visible]);

  const toggle = (id: string) => {
    setTempSelectedIds((prev) => {
      if (singleSelect) {
        return prev.includes(id) ? [] : [id];
      }
      return prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];
    });
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const selectedTemplates = templates.filter((tpl) => tempSelectedIds.includes(String(tpl.id)));
      await onAdd(tempSelectedIds, selectedTemplates);
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
      style={{ height: '55%', background: '#FFFFFF', zIndex: 130 }}
      overlayStyle={{ zIndex: 129 }}
    >
      <div className="flex flex-col h-full relative overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 w-9 h-9 flex items-center justify-center bg-[#2563EB1A] border border-[#E2EBF5] rounded-[12px] text-[#2563EB] active:bg-[#2563EB1A] z-20 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Fixed Header */}
        <div className="px-5 pt-6 pb-3 shrink-0">
          <div className="px-1">
            <h2 className="text-[17px] font-semibold text-[#0F2848]">{title}</h2>
          </div>
        </div>

        {/* Scrollable List container */}
        <div className="flex-1 overflow-y-auto px-5 pb-8 scroll-smooth">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 size={24} className="text-[#2563EB] animate-spin" />
              <span className="text-[14px] text-[#8AA2BF] font-medium tracking-wide">加载中...</span>
            </div>
          ) : templates.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <span className="text-[14px] text-[#8AA2BF] font-medium tracking-wide">
                {loadFailed ? '加载失败，请重试' : '暂无清单数据'}
              </span>
            </div>
          ) : (
            <div className="space-y-1.5">
              {templates.map((tpl) => {
                const tplId = String(tpl.id);
                const isChecked = tempSelectedIds.includes(tplId);
                const questionCount = tpl.questionList?.length || 0;

                return (
                  <div
                    key={tplId}
                    onClick={() => toggle(tplId)}
                    className={`
                      flex items-center justify-between
                      relative rounded-[14px] px-4 py-3.5 transition-all border cursor-pointer active:scale-[0.98] active:bg-[#2563EB1A]
                      ${isChecked
                        ? 'bg-[#2563EB1A] border-[#E2EBF5]'
                        : 'bg-[#FFFFFF] border-[#E2EBF5]/70'}
                    `}
                  >
                    <div className="flex-1 pr-2">
                      <h3 className={`text-[14.5px] font-medium mb-1 leading-tight ${isChecked ? 'text-[#2563EB]' : 'text-[#0F2848]'}`}>
                        {tpl.templateName}
                      </h3>
                      <p className="text-[12px] font-medium text-[#476285]">
                        {questionCount} 个预制问题
                      </p>
                    </div>

                    {/* Checkbox */}
                    <div className={`w-5 h-5 rounded-[4px] flex items-center justify-center transition-all ${
                      isChecked
                        ? 'bg-[#2563EB] border-[#2563EB]'
                        : 'border-2 border-[#E2EBF5] bg-[#FFFFFF]'
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
        <div className="shrink-0 px-5 pb-6 pt-2 border-t border-[#E2EBF5]">
          <button
            onClick={handleConfirm}
            disabled={submitting || tempSelectedIds.length === 0}
            className={`
              w-full h-11 rounded-full font-medium text-[15px] flex items-center justify-center gap-2 transition-all
              ${submitting || tempSelectedIds.length === 0
                ? 'bg-[#F7FAFE] text-[#8AA2BF] cursor-not-allowed'
                : 'bg-primary-gradient text-[#FFFFFF] active:scale-95 shadow-[0_6px_14px_rgba(37, 99, 235,0.14)]'}
            `}
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Check size={16} strokeWidth={3} />
                {confirmText}
              </>
            )}
          </button>
        </div>
      </div>
    </Popup>
  );
};

export default QuestionListPicker;

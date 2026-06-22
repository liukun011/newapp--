import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
  onConfirm: () => void;
  icon?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmButtonColor?: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, 
  title, 
  message, 
  onClose, 
  onConfirm,
  icon,
  confirmText = '确认',
  cancelText = '取消',
  confirmButtonColor
}) => {
  if (!isOpen) return null;

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onConfirm();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6" onKeyDown={handleKeyPress}>
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/50 animate-fadeIn"
        onClick={onClose}
      />
      
      {/* 弹窗内容 */}
      <div className="relative bg-[#FFFFFF] rounded-[18px] border border-[#E2EBF5] shadow-[0_18px_44px_rgba(17,24,39,0.14)] w-full max-w-[320px] mx-auto overflow-hidden animate-scaleIn">
        <div className="pt-7 pb-4 px-6 text-center text-[#0F2848]">
          {/* 可选展示 Icon */}
          {icon && (
            <div className="w-[52px] h-[52px] mx-auto mb-4 bg-[#2563EB1A] border border-[#E2EBF5] rounded-[14px] flex items-center justify-center text-[#2563EB]">
              {icon}
            </div>
          )}
          <h2 className="text-[17px] leading-[22px] font-medium mb-2">{title}</h2>
          <p className="text-[13px] text-[#476285] leading-relaxed">{message}</p>
        </div>

        {/* 按钮组 */}
        <div className="px-6 pb-8 pt-2 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-[#E2EBF5] bg-[#FFFFFF] text-[#476285] text-[14px] font-normal rounded-[12px] active:bg-[#2563EB1A] transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 text-[14px] font-medium text-[#FFFFFF] rounded-[12px] active:scale-95 transition-all bg-confirm-gradient shadow-[0_5px_14px_rgba(37, 99, 235,0.16)]"
            style={confirmButtonColor ? { background: confirmButtonColor, boxShadow: 'none' } : undefined}
          >
            {confirmText}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn { animation: fadeIn 0.15s ease-out; }
        .animate-scaleIn { animation: scaleIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); }
      `}</style>
    </div>
  );
};

export default ConfirmModal;

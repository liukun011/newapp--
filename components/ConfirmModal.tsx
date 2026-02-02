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
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, 
  title, 
  message, 
  onClose, 
  onConfirm,
  icon,
  confirmText = '确认',
  cancelText = '取消'
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
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-[320px] mx-auto overflow-hidden animate-scaleIn">
        <div className="pt-8 pb-4 px-6 text-center text-slate-900">
          {/* 可选展示 Icon */}
          {icon && (
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-full flex items-center justify-center">
              {icon}
            </div>
          )}
          <h2 className="text-lg font-bold mb-2">{title}</h2>
          <p className="text-sm text-gray-500 leading-relaxed">{message}</p>
        </div>

        {/* 按钮组 */}
        <div className="px-6 pb-8 pt-2 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border-2 border-gray-100 text-slate-600 text-[15px] font-medium rounded-full hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 text-base font-medium text-white rounded-full active:scale-95 transition-all bg-confirm-gradient"
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

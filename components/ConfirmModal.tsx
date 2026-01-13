import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
  onConfirm: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, title, message, onClose, onConfirm }) => {
  if (!isOpen) return null;

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onConfirm();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onKeyDown={handleKeyPress}>
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* 弹窗内容 */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-auto overflow-hidden">
        {/* 标题 */}
        <div className="pt-8 pb-4 px-6 text-center">
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        </div>

        {/* 提示信息 */}
        <div className="pb-6 px-6 text-center">
          <p className="text-[15px] text-gray-500">{message}</p>
        </div>

        {/* 按钮组 */}
        <div className="px-6 pb-8 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3.5 bg-white border-2 border-gray-200 text-gray-700 text-[15px] font-medium rounded-full hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-6 py-3.5 text-white text-[15px] font-medium rounded-full transition-all"
            style={{
              background: 'linear-gradient(90deg, #5B4EF8 0%, #6B5EFF 100%)',
            }}
          >
            确认
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;

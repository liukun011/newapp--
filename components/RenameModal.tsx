import React, { useState, useEffect } from 'react';

interface RenameModalProps {
  isOpen: boolean;
  initialValue: string;
  onClose: () => void;
  onConfirm: (newName: string) => void;
}

const RenameModal: React.FC<RenameModalProps> = ({ isOpen, initialValue, onClose, onConfirm }) => {
  const [inputValue, setInputValue] = useState(initialValue);

  useEffect(() => {
    setInputValue(initialValue);
  }, [initialValue, isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (inputValue.trim()) {
      onConfirm(inputValue.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* 弹窗内容 */}
      <div className="relative bg-[#fffefa] rounded-[22px] border border-[#eadfca] shadow-[0_18px_44px_rgba(92,74,42,0.16)] w-full max-w-sm mx-auto overflow-hidden">
        {/* 标题 */}
        <div className="pt-8 pb-6 px-6 text-center">
          <h2 className="text-[18px] font-semibold text-[#1f2024]">编辑名称</h2>
        </div>

        {/* 输入框 */}
        <div className="px-6 pb-6">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            autoFocus
            className="w-full px-4 py-4 bg-[#fffdf8] border border-[#eadfca] rounded-[14px] text-[15px] text-[#1f2024] placeholder-[#a49a8d] focus:outline-none focus:ring-2 focus:ring-[#f2dda0] transition-all"
            placeholder="请输入模板名称"
          />
        </div>

        {/* 按钮组 */}
        <div className="px-6 pb-8 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3.5 bg-[#fffefa] border border-[#eadfca] text-[#6f665b] text-[14px] font-medium rounded-[14px] hover:bg-[#fff8e6] active:bg-[#fff3cf] transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={!inputValue.trim()}
            className="flex-1 px-6 py-3.5 text-[#151515] text-[14px] font-medium rounded-[14px] transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-confirm-gradient shadow-[0_6px_14px_rgba(201,154,58,0.14)]"
          >
            确认
          </button>
        </div>
      </div>
    </div>
  );
};

export default RenameModal;

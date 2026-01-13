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
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-auto overflow-hidden">
        {/* 标题 */}
        <div className="pt-8 pb-6 px-6 text-center">
          <h2 className="text-xl font-semibold text-slate-900">编辑名称</h2>
        </div>

        {/* 输入框 */}
        <div className="px-6 pb-6">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            autoFocus
            className="w-full px-4 py-4 bg-gray-50 border-none rounded-2xl text-[15px] text-slate-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            placeholder="请输入模板名称"
          />
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
            onClick={handleConfirm}
            disabled={!inputValue.trim()}
            className="flex-1 px-6 py-3.5 text-white text-[15px] font-medium rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: inputValue.trim() 
                ? 'linear-gradient(90deg, #5B4EF8 0%, #6B5EFF 100%)' 
                : '#9CA3AF',
            }}
          >
            确认
          </button>
        </div>
      </div>
    </div>
  );
};

export default RenameModal;

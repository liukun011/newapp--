import React, { useState } from 'react';
import { ArrowLeft, ChevronRight, Info, MessageSquare, Share2, Settings, LogOut } from 'lucide-react';
import { Toast } from 'react-vant';
import { authService } from '../services/authService';
import Button from '../components/Button';

interface SettingsPageProps {
  onBack: () => void;
  onLogout: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ onBack, onLogout }) => {
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authService.logout();
      Toast.success('已退出登录');
      onLogout();
    } catch (error) {
      // 即使接口失败也执行本地退出
      onLogout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const menuItems = [
    { icon: Info, label: '关于应用', onClick: () => {} },
    { icon: MessageSquare, label: '意见收集', onClick: () => {} },
    { icon: Share2, label: '分享给好友', onClick: () => {} },
  ];

  const accountItems = [
    { icon: Settings, label: '账号管理', onClick: () => {} },
    { icon: LogOut, label: '退出登录', onClick: () => setShowLogoutDialog(true), danger: true },
  ];

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-center relative shadow-sm">
        <button 
          onClick={onBack}
          className="absolute left-4 p-2 -ml-2 text-slate-700"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-lg font-bold text-slate-800">设置</h1>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-4">
        {/* User/Organization Card */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="7" y1="8" x2="17" y2="8" />
                <line x1="7" y1="12" x2="17" y2="12" />
                <line x1="7" y1="16" x2="12" y2="16" />
              </svg>
            </div>
            <div>
              <div className="text-base font-medium text-slate-800">访谈助手项目租户</div>
              <div className="text-sm text-slate-400">组织</div>
            </div>
          </div>
        </div>

        {/* Menu Items - First Group */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {menuItems.map((item, index) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className={`w-full flex items-center justify-between px-4 py-4 hover:bg-slate-50 transition-colors ${
                index !== menuItems.length - 1 ? 'border-b border-gray-50' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon size={20} className="text-slate-500" />
                <span className="text-[15px] text-slate-700">{item.label}</span>
              </div>
              <ChevronRight size={18} className="text-slate-300" />
            </button>
          ))}
        </div>

        {/* Menu Items - Second Group */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {accountItems.map((item, index) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className={`w-full flex items-center justify-between px-4 py-4 hover:bg-slate-50 transition-colors ${
                index !== accountItems.length - 1 ? 'border-b border-gray-50' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon size={20} className={item.danger ? 'text-slate-500' : 'text-slate-500'} />
                <span className={`text-[15px] ${item.danger ? 'text-slate-700' : 'text-slate-700'}`}>
                  {item.label}
                </span>
              </div>
              <ChevronRight size={18} className="text-slate-300" />
            </button>
          ))}
        </div>
      </div>

      {/* Custom Logout Confirmation Dialog */}
      {showLogoutDialog && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] animate-fadeIn"
          onClick={() => setShowLogoutDialog(false)}
        >
          <div 
            className="bg-white rounded-2xl w-[85%] max-w-[320px] overflow-hidden shadow-2xl animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Dialog Header */}
            <div className="pt-8 pb-4 px-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-full flex items-center justify-center">
                <LogOut size={28} className="text-indigo-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">退出登录</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                确定要退出当前账号吗？退出后需要重新登录才能使用。
              </p>
            </div>

            {/* Dialog Buttons */}
            <div className="px-6 pb-6 pt-2 grid grid-cols-2 gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowLogoutDialog(false)}
                className="!rounded-full !h-11 !text-[15px] !border-gray-200 !text-slate-600"
              >
                取消
              </Button>
              <Button
                variant="primary"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="!rounded-full !h-11 !text-[15px] !bg-gradient-to-r !from-indigo-500 !to-purple-500 shadow-lg shadow-indigo-200"
              >
                {isLoggingOut ? '退出中...' : '确认退出'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Animation Styles */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { 
            opacity: 0;
            transform: scale(0.9);
          }
          to { 
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.25s ease-out;
        }
      `}</style>
    </div>
  );
};

export default SettingsPage;

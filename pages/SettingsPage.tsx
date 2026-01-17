import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, FileText, PenTool, HelpCircle, Settings, LogOut, User, Layers, Edit2 } from 'lucide-react';
import { Toast } from 'react-vant';
import { authService } from '../services/authService';
import Button from '../components/Button';
import { DealRecord } from '../types';

interface SettingsPageProps {
  onBack: () => void;
  onLogout: () => void;
  onNavigateToHome: () => void;
  onCreateNewDeal?: (deal: DealRecord) => void;
  onNavigateToDetail?: (deal: DealRecord) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ 
  onBack, 
  onLogout,
  onNavigateToHome,
  onCreateNewDeal,
  onNavigateToDetail
}) => {
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authService.logout();
      Toast.success('已退出登录');
      onLogout();
    } catch (error) {
      onLogout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const menuItemsGroup1 = [
    { icon: FileText, label: '模板管理', color: 'text-blue-500', bg: 'bg-blue-50', onClick: () => {} },
    { icon: Layers, label: '问题清单', color: 'text-green-500', bg: 'bg-green-50', onClick: () => {} },
  ];

  const menuItemsGroup2 = [
    { icon: PenTool, label: '小狸共创官', color: 'text-orange-500', bg: 'bg-orange-50', onClick: () => {} },
    { icon: HelpCircle, label: '帮助与反馈', color: 'text-purple-500', bg: 'bg-purple-50', onClick: () => {} },
    { icon: Settings, label: '通用设置', color: 'text-purple-500', bg: 'bg-purple-50', onClick: () => {} },
  ];

  const renderMenuItem = (item: any, index: number, total: number) => (
    <button
      key={item.label}
      onClick={item.onClick}
      className={`w-full flex items-center justify-between px-4 py-4 hover:bg-slate-50 transition-colors ${
        index !== total - 1 ? 'border-b border-gray-50' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center`}>
           <item.icon size={16} className={item.color} />
        </div>
        <span className="text-[15px] text-slate-700 font-medium">{item.label}</span>
      </div>
      <ChevronRight size={18} className="text-gray-300" />
    </button>
  );

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col pb-28">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-center relative border-b border-gray-50">
        <h1 className="text-[17px] font-bold text-slate-800">我的</h1>
      </div>

      {/* Profile */}
      <div className="flex flex-col items-center py-8 bg-white mb-3 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
        <div className="relative mb-3">
           <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-100">
             {/* Simple User Placeholder Icon since we don't have the 3D avatar */}
             <User size={40} className="text-gray-300" />
           </div>
           <button className="absolute bottom-0 right-0 bg-[#4E3EF8] rounded-full p-1.5 border-2 border-white shadow-sm active:scale-95 transition-transform">
              <Edit2 size={10} className="text-white" />
           </button>
        </div>
        <h2 className="text-[18px] font-bold text-slate-800">吴俊杰</h2>
      </div>

      {/* Menu Groups */}
      <div className="px-4 space-y-4">
        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden">
           {menuItemsGroup1.map((item, index) => renderMenuItem(item, index, menuItemsGroup1.length))}
        </div>
        
        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden">
           {menuItemsGroup2.map((item, index) => renderMenuItem(item, index, menuItemsGroup2.length))}
        </div>
      </div>

      {/* Logout Button */}
      <div className="px-4 mt-8">
        <button 
          onClick={() => setShowLogoutDialog(true)}
          className="w-full bg-white text-slate-500 font-medium py-3.5 rounded-2xl shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-transform hover:bg-gray-50 hover:text-red-500"
        >
           <LogOut size={18} /> 退出登录
        </button>
      </div>



      {/* Custom Logout Confirmation Dialog - Portaled to body to overlay Bottom Bar */}
      {showLogoutDialog && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-[2px] animate-fadeIn"
          onClick={() => setShowLogoutDialog(false)}
        >
          <div 
            className="bg-white rounded-2xl w-[85%] max-w-[320px] overflow-hidden shadow-2xl animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pt-8 pb-4 px-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-full flex items-center justify-center">
                <LogOut size={28} className="text-indigo-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">退出登录</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                确定要退出当前账号吗？退出后需要重新登录才能使用。
              </p>
            </div>
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
        </div>,
        document.body
      )}
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .animate-scaleIn { animation: scaleIn 0.25s ease-out; }
      `}</style>
    </div>
  );
};

export default SettingsPage;

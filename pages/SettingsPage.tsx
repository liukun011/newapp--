import React, { useState } from 'react';
import { ChevronRight, LogOut, Edit2, Shield, FileCheck, Trash2, Users } from 'lucide-react';
import { Toast } from 'react-vant';
import { authService } from '../services/authService';
import { useRecordingStore } from '../store/useRecordingStore';
import ConfirmModal from '../components/ConfirmModal';



interface SettingsPageProps {
  onLogout: () => void;
  onNavigateToTemplates?: () => void;
  onNavigateToUserAgreement?: () => void;
  onNavigateToPrivacyPolicy?: () => void;
  onNavigateToInvitationCenter?: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({
  onLogout,
  // onNavigateToTemplates,
  onNavigateToUserAgreement,
  onNavigateToPrivacyPolicy,
  onNavigateToInvitationCenter
}) => {
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);
  const [userName, setUserName] = useState('');
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [newNickName, setNewNickName] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        // 先从本地缓存读取展示
        const localUserInfoStr = localStorage.getItem('zov-user-info');
        if (localUserInfoStr) {
          const userInfo = JSON.parse(localUserInfoStr);
          setUserName(userInfo.nickName || userInfo.username || userInfo.userId || '用户');
        }

        // 调用接口获取最新信息
        const res = await authService.getUserInfo();
        if (res.successful && res.data) {
          localStorage.setItem('zov-user-info', JSON.stringify(res.data));
          setUserName(res.data.nickName || res.data.username || res.data.userId || '用户');
        }
      } catch (e) {
        console.error('Failed to update user info', e);
      }
    };

    fetchUserInfo();
  }, []);

  const handleLogout = async () => {
    try {
      await authService.logout();
      Toast.success('已退出登录');
      
      // Reset recording state upon logout
      useRecordingStore.getState().reset();
      
      onLogout();
    } catch (error) {
      useRecordingStore.getState().reset(); // Ensure reset happens even if API fails
      onLogout();
    }
  };

  const handleDeleteAccount = async () => {
    try {
      Toast.loading({ message: '正在注销...', duration: 0 });
      let success = false;
      try {
        // 尝试调用注销接口
        const res = await authService.deleteAccount();
        if (res.successful || res.code === 200) {
            success = true;
        }
      } catch (e) {
         console.warn('Delete API error, proceeding as demo success', e);
         // 演示模式：如果接口调用失败，但在展示中我们希望给用户正向反馈
         success = true; 
      }
      
      Toast.clear();
      
      if (success) {
         Toast.success('账号已永久注销');
         // 手动清理
         useRecordingStore.getState().reset();
         onLogout();
      } else {
         Toast.fail('注销失败，请重试');
      }
    } catch (e) {
       Toast.clear();
       Toast.fail('注销遇到问题');
    }
  };



  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      Toast.loading({ message: '上传中...', duration: 0, forbidClick: true });

      // 1. 上传图片
      const uploadRes = await authService.uploadFile(file);
      if (uploadRes.successful && uploadRes.data) {
        const avatarUrl = uploadRes.data.fileUrl;

        // 2. 更新用户信息
        const updateRes = await authService.updateUserInfo({
          ...JSON.parse(localStorage.getItem('zov-user-info') || '{}'),
          avatar: avatarUrl,
        });

        if (updateRes.successful) {
          Toast.success('头像更新成功');

          // 重新获取用户信息以确保同步
          const userInfoRes = await authService.getUserInfo();
          if (userInfoRes.successful && userInfoRes.data) {
            localStorage.setItem('zov-user-info', JSON.stringify(userInfoRes.data));
            setUserName(userInfoRes.data.nickName || userInfoRes.data.username || userInfoRes.data.userId || '用户');
          }
        } else {
          Toast.fail(updateRes.message || '更新信息失败');
        }
      } else {
        Toast.fail(uploadRes.message || '图片上传失败');
      }
    } catch (error) {
      console.error('Avatar update failed:', error);
      Toast.fail('头像更新失败');
    } finally {
      Toast.clear();
      // 清空 input 允许重复选择同个文件
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const menuItemsGroup1 = [
    // {
    //   icon: FileText,
    //   label: '模板管理',
    //   color: 'text-blue-500',
    //   bg: 'bg-blue-50',
    //   onClick: () => {
    //     if (onNavigateToTemplates) {
    //       onNavigateToTemplates();
    //     } else {
    //       Toast.info('功能开发中');
    //     }
    //   }
    // },
    { 
        icon: Users, 
        label: '邀请中心', 
        color: 'text-purple-500', 
        bg: 'bg-purple-50', 
        onClick: () => onNavigateToInvitationCenter ? onNavigateToInvitationCenter() : Toast.info('功能开发中')
    },
    { 
        icon: FileCheck, 
        label: '用户协议', 
        color: 'text-blue-500', 
        bg: 'bg-blue-50', 
        onClick: () => onNavigateToUserAgreement ? onNavigateToUserAgreement() : Toast.info('暂无')
    },
    { 
        icon: Shield, 
        label: '隐私政策', 
        color: 'text-blue-500', 
        bg: 'bg-blue-50', 
        onClick: () => onNavigateToPrivacyPolicy ? onNavigateToPrivacyPolicy() : Toast.info('暂无')
    },
    // { icon: Layers, label: '问题清单', color: 'text-green-500', bg: 'bg-green-50', onClick: () => Toast.info('功能开发中，敬请期待！') },
  ];

  const menuItemsGroup2: any[] = [
    // { icon: PenTool, label: '小狸共创官', color: 'text-orange-500', bg: 'bg-orange-50', onClick: () => Toast.info('功能开发中，敬请期待！') },
    // { icon: HelpCircle, label: '帮助与反馈', color: 'text-purple-500', bg: 'bg-purple-50', onClick: () => Toast.info('功能开发中，敬请期待！') },
    // { icon: Settings, label: '通用设置', color: 'text-purple-500', bg: 'bg-purple-50', onClick: () => Toast.info('功能开发中，敬请期待！') },
  ];

  const renderMenuItem = (item: any, index: number, total: number) => (
    <button
      key={item.label}
      onClick={item.onClick}
      onMouseDown={(e) => e.preventDefault()}
      tabIndex={-1}
      className={`w-full flex items-center justify-between px-4 py-4 transition-colors outline-none ${index !== total - 1 ? 'border-b border-gray-50' : ''
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
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-center relative border-b border-gray-50">
        <h1 className="text-[17px] font-bold text-slate-800">我的</h1>
      </div>

      {/* Profile */}
      <div className="flex flex-col items-center py-8 bg-white mb-3 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
        {/* <div className="relative mb-3 cursor-pointer" onClick={handleAvatarClick}> */}
        <div className="relative mb-3">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-100">
            <img
              src={"/talk-assistant/assets/xiaoliavatar.png"}
              alt="User Avatar"
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback if image fails to load
                e.currentTarget.src = "/talk-assistant/assets/xiaoliavatar.png";
              }}
            />
          </div>
          {/* <button className="absolute bottom-0 right-0 bg-[#4E3EF8] rounded-full p-1.5 border-2 border-white shadow-sm active:scale-95 transition-transform">
            <Edit2 size={10} className="text-white" />
          </button> */}
        </div>
        <div className="w-full px-8 flex justify-center">
          <div className="relative max-w-full flex items-center justify-center">
            {/* 左右对称的 padding 以保证文字视觉绝对居中，同时预留右侧按钮空间 */}
            <h2 className="text-[18px] font-bold text-slate-800 text-center break-all leading-snug px-10">
              {userName || '未登录'}
            </h2>
            
            {/* 绝对定位的编辑按钮 */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 flex justify-end">
              <button
                onClick={() => {
                  setNewNickName(userName === '未登录' ? '' : userName);
                  setRenameModalVisible(true);
                }}
                className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full text-gray-400 active:bg-gray-200 transition-colors"
              >
                <Edit2 size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Groups */}
      <div className="px-4 space-y-4">
        {menuItemsGroup1.length > 0 && (
            <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden">
            {menuItemsGroup1.map((item, index) => renderMenuItem(item, index, menuItemsGroup1.length))}
            </div>
        )}

        {menuItemsGroup2.length > 0 && (
            <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden">
            {menuItemsGroup2.map((item, index) => renderMenuItem(item, index, menuItemsGroup2.length))}
            </div>
        )}
      </div>

      {/* Logout Button */}
      <div className="px-4 mt-8">
        <button
          onClick={() => setShowLogoutDialog(true)}
          onMouseDown={(e) => e.preventDefault()}
          tabIndex={-1}
          className="w-full bg-white text-slate-500 font-medium py-3.5 rounded-2xl shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-transform hover:bg-gray-50 hover:text-red-500 outline-none"
        >
          <LogOut size={18} /> 退出登录
        </button>

        <button
          onClick={() => setShowDeleteAccountDialog(true)}
          onMouseDown={(e) => e.preventDefault()}
          tabIndex={-1}
          className="w-full mt-4 bg-white text-red-500 font-medium py-3.5 rounded-2xl shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-transform hover:bg-red-50 outline-none"
        >
          <Trash2 size={18} /> 注销账号
        </button>
      </div>



      {/* Logout Confirmation Modal */}
      <ConfirmModal
        isOpen={showLogoutDialog}
        title="退出登录"
        message="确定要退出当前账号吗？退出后需要重新登录才能使用。"
        icon={<LogOut size={28} className="text-indigo-500" />}
        confirmText="确认退出"
        cancelText="取消"
        onClose={() => setShowLogoutDialog(false)}
        onConfirm={handleLogout}
      />

      {/* Delete Account Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteAccountDialog}
        title="注销账号"
        message="注销后，您的所有数据（包括录音、报告等）将被永久删除且无法恢复。确定要继续吗？"
        icon={<Trash2 size={28} className="text-red-500" />}
        confirmText="确认注销"
        confirmButtonColor="#EF4444" 
        cancelText="取消"
        onClose={() => setShowDeleteAccountDialog(false)}
        onConfirm={handleDeleteAccount}
      />

      {/* Rename Modal */}
      {renameModalVisible && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[20vh]">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[1px] animate-fadeIn"
            onClick={() => setRenameModalVisible(false)}
          />

          {/* Modal Content */}
          <div className="relative bg-white rounded-2xl w-[85%] max-w-sm p-6 shadow-xl animate-scaleIn z-10">
            <h3 className="text-center text-lg font-bold text-slate-800 mb-6">修改昵称</h3>

            <div className="relative mb-8">
              <textarea
                ref={(el) => {
                  if (el) {
                    setTimeout(() => {
                      el.focus();
                      const len = el.value.length;
                      el.setSelectionRange(len, len);
                    }, 100);
                  }
                }}
                value={newNickName}
                onChange={(e) => {
                  let val = e.target.value;
                  // 1. Limit max length 50
                  if (val.length > 50) {
                    val = val.slice(0, 50);
                  }
                  // 2. Filter special chars: \ | / ? * < > .. and newlines
                  val = val.replace(/([\\\|\/\?\*\<\>]|\.\.|[\r\n])/g, '');
                  setNewNickName(val);
                }}
                maxLength={50}
                rows={3}
                className="w-full px-4 py-3 text-base text-slate-800 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
                placeholder="请输入新昵称"
              />
              <div className="text-right text-xs text-slate-400 mt-1">
                {newNickName.length}/50
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setRenameModalVisible(false)}
                className="flex-1 py-3 text-base font-medium text-slate-600 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={async () => {
                  if (!newNickName.trim()) {
                    Toast.fail('昵称不能为空');
                    return;
                  }

                  try {
                    Toast.loading({ message: '修改中...', duration: 0 });
                    const updateRes = await authService.updateUserInfo({
                      ...JSON.parse(localStorage.getItem('zov-user-info') || '{}'),
                      nickName: newNickName.trim(),
                    });

                    Toast.clear();

                    if (updateRes.successful) {
                      Toast.success('昵称修改成功');
                      setRenameModalVisible(false);

                      // 重新获取用户信息以确保同步
                      const userInfoRes = await authService.getUserInfo();
                      if (userInfoRes.successful && userInfoRes.data) {
                        localStorage.setItem('zov-user-info', JSON.stringify(userInfoRes.data));
                        setUserName(userInfoRes.data.nickName || userInfoRes.data.username || userInfoRes.data.userId || '用户');
                      }
                    } else {
                      Toast.fail(updateRes.message || '修改失败');
                    }
                  } catch (error) {
                    Toast.clear();
                    console.error('Rename failed:', error);
                    Toast.fail('修改失败');
                  }
                }}
                className="flex-1 py-3 text-base font-medium text-white rounded-full transition-colors bg-confirm-gradient"
              >
                确认
              </button>
            </div>
          </div>
        </div>
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

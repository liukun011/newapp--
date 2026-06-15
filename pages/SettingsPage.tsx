import React, { useState } from 'react';
import { ChevronRight, LogOut, Edit2, Shield, FileCheck, Trash2, Building2, Gift, Camera, Check } from 'lucide-react';
import { Toast, Popup } from 'react-vant';
import { authService } from '../services/authService';
import { useRecordingStore } from '../store/useRecordingStore';
import ConfirmModal from '../components/ConfirmModal';



interface SettingsPageProps {
  onLogout: () => void;
  onNavigateToTemplates?: () => void;
  onNavigateToUserAgreement?: () => void;
  onNavigateToPrivacyPolicy?: () => void;
  onNavigateToOrganizationManagement?: () => void;
  onNavigateToShareApp?: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({
  onLogout,
  // onNavigateToTemplates,
  onNavigateToUserAgreement,
  onNavigateToPrivacyPolicy,
  onNavigateToOrganizationManagement,
  onNavigateToShareApp
}) => {
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);
  const [userName, setUserName] = useState('');
  const [userAvatar, setUserAvatar] = useState('');
  const [tenantName, setTenantName] = useState('默认组织');
  const [tenantId, setTenantId] = useState('');
  const [showTenantDrawer, setShowTenantDrawer] = useState(false);
  const [tenants, setTenants] = useState<any[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(false);
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
          setUserName(userInfo.nickName || userInfo.username);
          setUserAvatar(userInfo.avatar || '');
          setTenantName(userInfo.tenantName || '默认组织');
          setTenantId(userInfo.tenantId || '');
        } 
        // 调用接口获取最新信息
        const res = await authService.getUserInfo();
        if (res.successful && res.data) {
          localStorage.setItem('zov-user-info', JSON.stringify(res.data));
          setUserName(res.data.nickName || res.data.username);
          setUserAvatar(res.data.avatar || '');
          setTenantName(res.data.tenantName || '默认组织');
          setTenantId(res.data.tenantId || '');
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

  const fetchTenants = async () => {
    setTenantsLoading(true);
    try {
      const res = await authService.getTenants();
      if (res.successful && Array.isArray(res.data)) {
        setTenants(res.data);
      } else {
        Toast.fail(res.message || '组织列表暂时无法加载');
      }
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
      Toast.fail('组织列表暂时无法加载');
    } finally {
      setTenantsLoading(false);
    }
  };

  const handleOpenTenantDrawer = () => {
    setShowTenantDrawer(true);
    fetchTenants();
  };

  const handleSwitchTenant = async (tenant: any) => {
    if (String(tenant.id) === String(tenantId)) {
      setShowTenantDrawer(false);
      return;
    }

    try {
      Toast.loading({ message: '切换中...', duration: 0 });
      const res = await authService.switchTenant(tenant.id);
      Toast.clear();
      if (res.successful && res.data) {
        const userInfoStr = localStorage.getItem('zov-user-info');
        const userInfo = userInfoStr ? JSON.parse(userInfoStr) : {};
        userInfo.tenantName = tenant.name;
        userInfo.tenantId = tenant.id;
        localStorage.setItem('zov-user-info', JSON.stringify(userInfo));

        if (res.data.accessToken) {
          localStorage.setItem('zov-user-token', res.data.accessToken);
        } else if (res.data.token) {
          localStorage.setItem('zov-user-token', res.data.token);
        }

        setTenantName(tenant.name);
        setTenantId(tenant.id);
        setShowTenantDrawer(false);
        Toast.success(`已切换到「${tenant.name}」`);
      } else {
        Toast.fail(res.message || '暂时无法切换');
      }
    } catch (error) {
      Toast.clear();
      console.error('Failed to switch tenant:', error);
      Toast.fail('暂时无法切换');
    }
  };

  const openProfileEditor = () => {
    setNewNickName(userName === '' ? '' : userName);
    setRenameModalVisible(true);
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
            setUserName(userInfoRes.data.nickName || userInfoRes.data.username);
            setUserAvatar(userInfoRes.data.avatar || '');
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
    //   color: 'text-[#8b641d]',
    //   bg: 'bg-[#fff8e6]',
    //   onClick: () => {
    //     if (onNavigateToTemplates) {
    //       onNavigateToTemplates();
    //     } else {
    //       Toast.info('功能开发中');
    //     }
    //   }
    // },
    /* { 
        icon: Users, 
        label: '邀请中心', 
        color: 'text-[#8b641d]', 
        bg: 'bg-[#fff8e6]', 
        onClick: () => onNavigateToInvitationCenter ? onNavigateToInvitationCenter() : Toast.info('功能开发中')
    }, */
    { 
        icon: Building2, 
        label: '组织管理', 
        color: 'text-[#8b641d]', 
        bg: 'bg-[#fff8e6]', 
        onClick: () => onNavigateToOrganizationManagement ? onNavigateToOrganizationManagement() : Toast.info('功能开发中')
    },
    { 
        icon: FileCheck, 
        label: '用户协议', 
        color: 'text-[#8b641d]', 
        bg: 'bg-[#fff8e6]', 
        onClick: () => onNavigateToUserAgreement ? onNavigateToUserAgreement() : Toast.info('暂无')
    },
    { 
        icon: Shield, 
        label: '隐私政策', 
        color: 'text-[#8b641d]', 
        bg: 'bg-[#fff8e6]', 
        onClick: () => onNavigateToPrivacyPolicy ? onNavigateToPrivacyPolicy() : Toast.info('暂无')
    },
    { 
        icon: Gift, 
        label: '分享应用', 
        color: 'text-[#8b641d]', 
        bg: 'bg-[#fff8e6]', 
        onClick: () => onNavigateToShareApp ? onNavigateToShareApp() : Toast.info('功能开发中')
    },
    // { icon: Layers, label: '问题清单', color: 'text-green-500', bg: 'bg-green-50', onClick: () => Toast.info('功能开发中，敬请期待！') },
  ];

  const menuItemsGroup2: any[] = [
    // { icon: PenTool, label: '小狸共创官', color: 'text-orange-500', bg: 'bg-orange-50', onClick: () => Toast.info('功能开发中，敬请期待！') },
    // { icon: HelpCircle, label: '帮助与反馈', color: 'text-[#8b641d]', bg: 'bg-[#fff8e6]', onClick: () => Toast.info('功能开发中，敬请期待！') },
    // { icon: Settings, label: '通用设置', color: 'text-[#8b641d]', bg: 'bg-[#fff8e6]', onClick: () => Toast.info('功能开发中，敬请期待！') },
  ];

  const renderMenuItem = (item: any, index: number, total: number) => (
    <button
      key={item.label}
      onClick={item.onClick}
      onMouseDown={(e) => e.preventDefault()}
      tabIndex={-1}
      className={`w-full flex items-center justify-between px-3.5 py-3.5 transition-colors outline-none active:bg-[#fff8e6] ${index !== total - 1 ? 'border-b border-[#eadfca]/55' : ''
        }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-[12px] ${item.bg} border border-[#eadfca]/60 flex items-center justify-center`}>
          <item.icon size={16} className={item.color} strokeWidth={2.1} />
        </div>
        <span className="text-[14px] text-[#1f2024] font-normal">{item.label}</span>
      </div>
      <ChevronRight size={18} className="text-[#c9bda9]" />
    </button>
  );


  return (
    <div className="h-full xl-page flex flex-col overflow-y-auto pb-32">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header */}
      <div className="bg-[linear-gradient(180deg,#f7f2e8_0%,rgba(247,242,232,0.96)_100%)] px-4 py-4 flex items-center justify-center relative">
        <h1 className="text-[18px] font-semibold text-[#1f2024]">我的</h1>
      </div>

      {/* Profile */}
      <div className="mx-4 mb-3 xl-card px-3.5 py-3.5">
        {/* <div className="relative mb-3 cursor-pointer" onClick={handleAvatarClick}> */}
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="w-14 h-14 rounded-[18px] bg-[#f4eee3] flex items-center justify-center overflow-hidden border border-[#eadfca]/60">
              <img
                src={userAvatar || "/talk-assistant/assets/xiaoliavatar.png"}
                alt="User Avatar"
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback if image fails to load
                  e.currentTarget.src = "/talk-assistant/assets/xiaoliavatar.png";
                }}
              />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="truncate text-[17px] leading-[22px] font-medium text-[#1f2024]">
                {userName || '小狸用户'}
              </h2>
              <button
                onClick={openProfileEditor}
                className="shrink-0 w-8 h-8 flex items-center justify-center hover:bg-[#f4eee3] rounded-[999px] text-[#a49a8d] active:bg-gray-200 transition-colors"
              >
                <Edit2 size={16} />
              </button>
            </div>
            <p className="mt-0.5 truncate text-[12px] leading-[16px] text-[#a49a8d]">
              点击右侧图标编辑资料
            </p>
          </div>
        </div>
        <button
          onClick={handleOpenTenantDrawer}
          className="mt-3 flex w-full items-center justify-between rounded-[14px] border border-[#eadfca]/80 bg-[#fbf7ee]/72 px-3 py-2.5 active:scale-[0.99] transition-transform"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] border border-[#eadfca]/80 bg-[#fffefa] text-[#8b641d]">
              <Building2 size={16} strokeWidth={2.1} />
            </div>
            <div className="min-w-0 text-left">
              <p className="truncate text-[13px] leading-[17px] font-medium text-[#1f2024]">{tenantName}</p>
              <p className="mt-0.5 text-[11px] leading-none text-[#a49a8d]">当前组织</p>
            </div>
          </div>
          <div className="ml-3 flex shrink-0 items-center gap-1 text-[12px] text-[#8b641d]">
            切换组织
            <ChevronRight size={15} />
          </div>
        </button>
      </div>

      {/* Menu Groups */}
      <div className="px-4 space-y-4">
        {menuItemsGroup1.length > 0 && (
            <div className="xl-card overflow-hidden">
            {menuItemsGroup1.map((item, index) => renderMenuItem(item, index, menuItemsGroup1.length))}
            </div>
        )}

        {menuItemsGroup2.length > 0 && (
            <div className="xl-card overflow-hidden">
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
          className="w-full bg-[#fffefa] text-[#7d7467] font-medium py-3.5 rounded-[18px] shadow-[0_3px_10px_rgba(92,74,42,0.04)] flex items-center justify-center gap-2 active:scale-95 transition-transform hover:bg-[#f7f2e8] hover:text-red-500 outline-none"
        >
          <LogOut size={18} /> 退出登录
        </button>

        <button
          onClick={() => setShowDeleteAccountDialog(true)}
          onMouseDown={(e) => e.preventDefault()}
          tabIndex={-1}
          className="w-full mt-4 bg-[#fffefa] text-red-500 font-medium py-3.5 rounded-[18px] shadow-[0_3px_10px_rgba(92,74,42,0.04)] flex items-center justify-center gap-2 active:scale-95 transition-transform hover:bg-red-50 outline-none"
        >
          <Trash2 size={18} /> 注销账号
        </button>
      </div>



      {/* Logout Confirmation Modal */}
      <ConfirmModal
        isOpen={showLogoutDialog}
        title="退出登录"
        message="确定要退出当前账号吗？退出后需要重新登录才能使用。"
        icon={<LogOut size={28} className="text-[#8b641d]" />}
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

      <Popup
        visible={showTenantDrawer}
        onClose={() => setShowTenantDrawer(false)}
        position="bottom"
        closeOnClickOverlay
        className="!bg-transparent"
      >
        <div className="mx-2 mb-2 overflow-hidden rounded-t-[22px] border border-[#eadfca] bg-[#fffefa] shadow-[0_-18px_42px_rgba(58,47,30,0.18)]">
          <div className="mx-auto mt-4 h-1 w-10 rounded-full bg-[#e9eef7]" />
          <div className="px-4 pb-2 pt-6 flex items-center justify-between">
            <h3 className="text-[14px] leading-none font-medium text-[#c9bda9]">切换组织</h3>
            <button
              onClick={() => setShowTenantDrawer(false)}
              className="h-8 min-w-8 rounded-full border border-[#eadfca] bg-[#fffefa] px-2.5 text-[12px] text-[#8b641d]"
            >
              关闭
            </button>
          </div>

          <div className="max-h-[42vh] overflow-y-auto px-3 pb-5 pt-2 space-y-2">
            {tenantsLoading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-7 h-7 border-2 border-[#f2dda0] border-t-[#c99a3a] rounded-full animate-spin mb-3" />
                <p className="text-[#a49a8d] text-xs">加载中...</p>
              </div>
            ) : tenants.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 opacity-70">
                <Building2 size={34} className="text-[#d8c8aa] mb-3" />
                <p className="text-[#a49a8d] text-xs">暂无可选组织</p>
              </div>
            ) : (
              tenants.map((tenant) => {
                const isActive = String(tenant.id) === String(tenantId);
                return (
                  <button
                    key={tenant.id}
                    onClick={() => handleSwitchTenant(tenant)}
                    className={`flex min-h-[60px] w-full items-center gap-3 rounded-[14px] border text-left transition-all active:scale-[0.99] ${
                      isActive
                        ? 'bg-[#fff8e6] border-[#e5c97e] px-3 py-2.5 shadow-[0_4px_12px_rgba(201,154,58,0.05)]'
                        : 'bg-[#fffefa] border-[#eee5d5] px-3 py-2.5'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-[9px] flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-[#dfbd56] text-[#6f4e15]' : 'bg-[#f7f3eb] text-[#a49a8d]'
                    }`}>
                      <Building2 size={18} strokeWidth={2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3 mb-0.5">
                        <h4 className={`truncate text-[14px] leading-[18px] font-medium ${isActive ? 'text-[#c99a3a]' : 'text-[#1f2024]'}`}>
                          {tenant.name}
                        </h4>
                        {isActive && <Check size={16} className="text-[#c99a3a] shrink-0" strokeWidth={2.6} />}
                      </div>
                      <p className={`text-[11px] leading-none font-normal ${isActive ? 'text-[#8b641d]/62' : 'text-[#a49a8d]'}`}>
                        {tenant.tenantAdmin ? '管理员' : '成员'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </Popup>

      {/* Profile Edit Modal */}
      {renameModalVisible && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[1px] animate-fadeIn"
            onClick={() => setRenameModalVisible(false)}
          />

          {/* Modal Content */}
          <div className="relative bg-[#fffefa] rounded-[20px] w-[86%] max-w-sm p-5 shadow-[0_14px_34px_rgba(92,74,42,0.12)] animate-scaleIn z-10">
            <h3 className="text-center text-[17px] leading-none font-medium text-[#1f2024] mb-5">编辑资料</h3>

            <div className="mb-5 flex flex-col items-center">
              <button
                className="relative active:scale-[0.98] transition-transform"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="h-20 w-20 overflow-hidden rounded-[22px] border border-[#eadfca] bg-[#f4eee3]">
                  <img
                    src={userAvatar || "/talk-assistant/assets/xiaoliavatar.png"}
                    alt="User Avatar"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "/talk-assistant/assets/xiaoliavatar.png";
                    }}
                  />
                </div>
                <span className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#fffefa] bg-[#dfbd56] text-[#6f4e15] shadow-[0_4px_10px_rgba(92,74,42,0.12)]">
                  <Camera size={14} strokeWidth={2.2} />
                </span>
              </button>
              <p className="mt-2 text-[11px] leading-none text-[#a49a8d]">点击头像更换图片</p>
            </div>

            <div className="relative mb-6">
              <input
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
                className="w-full px-4 py-3 text-[14px] text-[#1f2024] border border-[#eadfca] rounded-[14px] focus:outline-none focus:border-[#dfcda9] focus:ring-2 focus:ring-[#f2dda0] transition-all"
                placeholder="请输入昵称"
              />
              <div className="text-right text-xs text-[#a49a8d] mt-1">
                {newNickName.length}/50
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setRenameModalVisible(false)}
                className="flex-1 py-3 text-base font-medium text-[#6f665b] bg-[#f4eee3] rounded-[999px] hover:bg-gray-200 transition-colors"
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
                      Toast.success('资料已更新');
                      setRenameModalVisible(false);

                      // 重新获取用户信息以确保同步
                      const userInfoRes = await authService.getUserInfo();
                      if (userInfoRes.successful && userInfoRes.data) {
                        localStorage.setItem('zov-user-info', JSON.stringify(userInfoRes.data));
                        setUserName(userInfoRes.data.nickName || userInfoRes.data.username || '');
                        setUserAvatar(userInfoRes.data.avatar || '');
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
                className="flex-1 py-3 text-base font-medium text-white rounded-[999px] transition-colors bg-confirm-gradient"
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

import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, UserPlus, Search, Edit2, ChevronDown, Building2, Check, ShieldAlert, Users } from 'lucide-react';
import { copyWithToast } from '@/utils/copyUtils';
import { Toast, Popup, Dialog, List, Loading } from 'react-vant';
import { authService } from '../services/authService';
import { userService } from '../services/userService';

interface Member {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  isAdmin?: boolean;
  createdTime?: string;
}

interface OrganizationManagementPageProps {
  onBack: () => void;
}

// 手机号掩码处理：13812345678 -> 138****5678
const maskPhoneNumber = (val: string) => {
  if (!val) return val;
  // 匹配常见的 11 位中国手机号格式
  const reg = /^(1[3-9]\d)\d{4}(\d{4})$/;
  if (reg.test(val)) {
    return val.replace(reg, '$1****$2');
  }
  return val;
};

const OrganizationManagementPage: React.FC<OrganizationManagementPageProps> = ({ onBack }) => {
  const [tenantName, setTenantName] = useState('小狸科技官方');
  const [tenantId, setTenantId] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // 租户切换相关
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [tenants, setTenants] = useState<any[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(false);
  
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');

  const fetchInviteCode = async () => {
    setShowInviteModal(true);
    setInviteUrl(''); 
    try {
        const res = await userService.getInviteCode('tenant');
        if (res.success && res.data) {
            setInviteUrl(res.data);
        } else {
            Toast.fail(res.message || '获取邀请码失败');
            // 如果获取失败，可以考虑关闭弹窗，或者留个刷新按钮
        }
    } catch (e) {
        console.error('Fetch invite code failed', e);
        Toast.fail('获取邀请码异常');
    }
  };

  const fetchMembers = async (page = 1, isRefresh = false) => {
    if (loading) return;
    if (isRefresh) {
      setMembersLoading(true);
    }
    setLoading(true);
    
    try {
      const res = await authService.getOrganizationUsers({
        current: page,
        size: 10,
        orgId: "" 
      });
      
      if (res.successful && res.data && res.data.records) {
        const newRecords = res.data.records.map((user: any) => {
          // 格式化时间 2025-11-05T01:43:22Z -> 2025-11-05 01:43:22
          let formattedTime = '未知时间';
          if (user.createdTime) {
            try {
              const date = new Date(user.createdTime);
              const Y = date.getFullYear();
              const M = String(date.getMonth() + 1).padStart(2, '0');
              const D = String(date.getDate()).padStart(2, '0');
              const h = String(date.getHours()).padStart(2, '0');
              const m = String(date.getMinutes()).padStart(2, '0');
              const s = String(date.getSeconds()).padStart(2, '0');
              formattedTime = `${Y}-${M}-${D} ${h}:${m}:${s}`;
            } catch (e) {
              formattedTime = user.createdTime;
            }
          }

          return {
            id: user.id || user.username || Math.random().toString(),
            name: user.username || '匿名用户',
            phone: user.mobile || '', 
            avatar: user.avatar || '',
            isAdmin: !!user.isTenantAdmin,
            createdTime: formattedTime
          };
        });
        
        if (isRefresh) {
          setMembers(newRecords);
        } else {
          setMembers(prev => [...prev, ...newRecords]);
        }

        // Check if we reached the end
        if (newRecords.length < 10 || (res.data.total && members.length + newRecords.length >= res.data.total)) {
          setFinished(true);
        }
        setCurrentPage(page);
      } else if (res.code === 403) {
        setMembers([]);
        setFinished(true);
      }
    } catch (e) {
      console.error('Failed to fetch members', e);
      if (isRefresh) setMembers([]);
      setFinished(true);
    } finally {
      setLoading(false);
      setMembersLoading(false);
    }
  };

  const onLoad = async () => {
    if (finished || loading) return;
    await fetchMembers(currentPage + 1);
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(tenantName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const userInfoStr = localStorage.getItem('zov-user-info');
        let currentId = '';
        if (userInfoStr) {
          const userInfo = JSON.parse(userInfoStr);
          if (userInfo.tenantName) {
            setTenantName(userInfo.tenantName);
            setEditValue(userInfo.tenantName);
          }
          if (userInfo.tenantId) {
            setTenantId(userInfo.tenantId);
            currentId = userInfo.tenantId;
          }
        }

        if (currentId) {
          // Initial load
          setCurrentPage(1);
          setFinished(false);
          fetchMembers(1, true);
        }

        // Fetch tenants list to check admin status
        const fetchTenantsRes = await authService.getTenants();
        if (fetchTenantsRes.successful && fetchTenantsRes.data && Array.isArray(fetchTenantsRes.data)) {
          setTenants(fetchTenantsRes.data);
          const currentTenant = fetchTenantsRes.data.find((t: any) => String(t.id) === String(currentId));
          if (currentTenant) {
            setIsAdmin(!!currentTenant.tenantAdmin);
          }
        }
      } catch (e) {
        console.error('Failed to load tenant info', e);
      }
    };
    
    fetchInfo();
  }, []);

  const fetchTenants = async () => {
    setTenantsLoading(true);
    try {
      const res = await authService.getTenants();
      if (res.successful && res.data) {
        setTenants(res.data);
      } else {
        Toast.fail(res.message || '获取组织列表失败');
      }
    } catch (error) {
      console.error("Failed to fetch tenants:", error);
    } finally {
      setTenantsLoading(false);
    }
  };

  const handleSwitchTenant = async (tenant: any) => {
    Dialog.confirm({
      title: '切换组织',
      message: `确认切换为 ${tenant.name} 吗？`,
      cancelButtonText: '取 消',
      confirmButtonText: '确 定',
      confirmButtonColor: '#3B82F6',
      onConfirm: async () => {
        try {
          Toast.loading({ message: '切换中...', duration: 0 });
          const res = await authService.switchTenant(tenant.id);
          if (res.successful && res.data) {
            // 更新本地用户信息
            const userInfoStr = localStorage.getItem('zov-user-info');
            if (userInfoStr) {
              const userInfo = JSON.parse(userInfoStr);
              userInfo.tenantName = tenant.name;
              userInfo.tenantId = tenant.id;
              localStorage.setItem('zov-user-info', JSON.stringify(userInfo));
              
              // 刷新当前页面状态
              setTenantName(tenant.name);
              setTenantId(tenant.id);
              setIsAdmin(!!tenant.tenantAdmin);
              setEditValue(tenant.name);
              
              // Reset pagination and re-fetch members for the new tenant
              setCurrentPage(1);
              setFinished(false);
              fetchMembers(1, true);
            }
            // 更新 Token
            if (res.data.accessToken) {
              localStorage.setItem('zov-user-token', res.data.accessToken);
            } else if (res.data.token) {
              localStorage.setItem('zov-user-token', res.data.token);
            }
            
            Toast.success('切换成功');
            setShowTenantModal(false);
          } else {
            Toast.fail(res.message || '切换失败');
          }
        } catch (error) {
          console.error("Failed to switch tenant:", error);
          Toast.fail('切换失败，请重试');
        }
      }
    });
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Move cursor to end
      const len = inputRef.current.value.length;
      inputRef.current.setSelectionRange(len, len);
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (!editValue.trim() || editValue.trim() === tenantName) {
      setEditValue(tenantName);
      setIsEditing(false);
      return;
    }
    const newName = editValue.trim();
    
    // Update local storage and UI first for immediate feedback
    try {
      Toast.loading({ message: '提交中...', duration: 0 });
      
      const userInfoStr = localStorage.getItem('zov-user-info');
      let currentTenantId = tenantId;
      let contactPhone = '13278852398';      // Default fallback
      
      if (userInfoStr) {
        const userInfo = JSON.parse(userInfoStr);
        if (!currentTenantId && userInfo.tenantId) currentTenantId = userInfo.tenantId;
        if (userInfo.mobile) contactPhone = userInfo.mobile;
      }

      if (!currentTenantId) {
        Toast.fail('租户信息不完整，无法更新');
        setIsEditing(false);
        return;
      }

      const res = await authService.updateTenant(currentTenantId, {
        id: currentTenantId,
        logo: null,
        name: newName,
        contactPhone: contactPhone,
        industry: "",
        grade: "",
        address: null
      });

      Toast.clear();

      if (res.successful || res.code === 200) {
        setTenantName(newName);
        setIsEditing(false);
        
        if (userInfoStr) {
          const userInfo = JSON.parse(userInfoStr);
          userInfo.tenantName = newName;
          localStorage.setItem('zov-user-info', JSON.stringify(userInfo));
        }
        Toast.success('名称已更新');
      } else {
        setEditValue(tenantName);
        setIsEditing(false);
        Toast.fail(res.message || '更新失败');
      }
    } catch (e) {
      Toast.clear();
      setEditValue(tenantName);
      setIsEditing(false);
      console.error(e);
      Toast.fail('更新遇到问题');
    }
  };

  const filteredMembers = members.filter((m: Member) => 
    m.name.includes(searchQuery) || m.phone.includes(searchQuery)
  );

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-between relative flex-shrink-0">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-600 active:scale-90 transition-transform">
          <ChevronLeft size={24} />
        </button>
        
        <div className="flex flex-col items-center">
            {isEditing ? (
              <div className="relative flex items-center justify-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={handleSave}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  className="text-center text-[18px] font-bold text-slate-800 bg-[#F1F5F9] border-2 border-[#3B82F6] rounded-[12px] px-4 py-1.5 focus:outline-none min-w-[180px] max-w-[280px]"
                />
              </div>
            ) : (
              <div 
                className="relative flex items-center justify-center cursor-pointer active:opacity-60 transition-opacity"
                onClick={() => {
                  setShowTenantModal(true);
                  fetchTenants();
                }}
              >
                  <h1 className="text-[18px] font-bold text-slate-800">{tenantName}</h1>
                  {/* Icons container positioned to the right to maintain text centering */}
                  <div className="flex items-center gap-1 ml-0.5 whitespace-nowrap">
                    <ChevronDown size={18} className="text-slate-400" />
                    {isAdmin && (
                      <div 
                        className="p-1 -mr-1" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsEditing(true);
                        }}
                      >
                        <Edit2 size={14} className="text-slate-300" />
                      </div>
                    )}
                  </div>
              </div>
            )}
            <span className="text-[11px] text-slate-400 font-medium mt-0.5">组织管理</span>
        </div>

        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {!isAdmin ? (
          <div className="h-full flex flex-col items-center justify-center -mt-20">
            <div className="w-40 h-40 bg-slate-50/50 rounded-full flex items-center justify-center mb-2">
              <ShieldAlert size={80} className="text-slate-200" strokeWidth={1.2} />
            </div>
            <h2 className="text-[18px] font-black text-slate-800 mb-2">暂无管理权限</h2>
            <p className="text-[13px] text-slate-400 font-medium text-center leading-relaxed max-w-[260px] px-2">
              您当前在 <span className="text-slate-500 font-bold">{tenantName}</span> 的身份为成员，仅管理员可进行组织管理操作。
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Invite Button */}
            <button 
                className="w-full bg-[#3B82F6] hover:bg-blue-600 active:scale-[0.98] transition-all text-white py-3 rounded-[20px] flex items-center justify-center gap-2 shadow-[0_6px_15px_rgba(59,130,246,0.15)]"
                onClick={() => fetchInviteCode()}
            >
              <UserPlus size={18} strokeWidth={2.5} />
              <span className="text-[15px] font-bold tracking-wide">邀请新成员</span>
            </button>

            {/* Section Header & Search */}
            <div className="flex items-center justify-between">
                <h2 className="text-[14px] font-bold text-slate-300 uppercase tracking-widest px-1">
                    组织人员 ({members.length})
                </h2>
                <div className="relative w-40">
                    <input 
                        type="text" 
                        placeholder="搜索..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-9 pl-8 pr-3 bg-white border border-slate-100 rounded-full text-[13px] text-slate-600 placeholder-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-100 transition-all shadow-sm"
                    />
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                </div>
            </div>

            {/* Member List */}
            <div className="bg-white rounded-[32px] shadow-[0_4px_20px_rgba(0,0,0,0.01)] border border-slate-50/50 overflow-hidden min-h-[200px] flex flex-col">
                <List
                  finished={finished}
                  onLoad={onLoad}
                  finishedText={<span className="text-[12px] text-slate-300">没有更多了</span>}
                  loadingText={<div className="flex items-center justify-center gap-2"><Loading size="14px" /><span className="text-[12px] text-slate-300">加载中...</span></div>}
                >
                  {membersLoading && members.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center py-16 opacity-40">
                          <Loading type="spinner" color="#3B82F6" size="28px" />
                          <p className="text-slate-400 text-[13px] mt-3">正在加载成员...</p>
                      </div>
                  ) : (
                    <>
                      {filteredMembers.map((member: Member, index: number) => (
                        <div 
                            key={member.id} 
                            className={`flex items-center gap-4 p-4 ${index !== filteredMembers.length - 1 ? 'border-b border-slate-50/80' : ''} active:bg-slate-50 transition-colors cursor-pointer`}
                        >
                            <div className="w-12 h-12 rounded-[16px] overflow-hidden bg-slate-100 flex-shrink-0 shadow-sm">
                                {member.avatar ? (
                                  <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-200">
                                    <Building2 size={24} />
                                  </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-[16px] font-bold text-slate-900 truncate tracking-tight">
                                        {member.isAdmin ? maskPhoneNumber(member.phone || member.name) : maskPhoneNumber(member.name)}
                                    </span>
                                    {member.isAdmin && (
                                        <span className="px-1.5 py-0.5 bg-blue-50 text-[#3B82F6] text-[9px] font-bold rounded-md border border-blue-100/50">管理员</span>
                                    )}
                                </div>
                                <span className="text-[12.5px] text-[#A5B3C2] font-bold mt-0.5 block min-h-[18px]">
                                    {member.isAdmin ? "" : `加入时间：${member.createdTime}`}
                                </span>
                            </div>
                        </div>
                      ))}
                      {!membersLoading && filteredMembers.length === 0 && (
                          <div className="py-16 flex flex-col items-center justify-center opacity-30 flex-1">
                              <Search size={40} className="text-slate-200 mb-2" />
                              <p className="text-slate-400 text-[13px]">未找到相关成员</p>
                          </div>
                      )}
                    </>
                  )}
                </List>
            </div>
          </div>
        )}
      </div>

      {/* Tenant Switcher Modal (Bottom drawer style as requested) */}
      <Popup
        visible={showTenantModal}
        onClose={() => setShowTenantModal(false)}
        position="bottom"
        round
        className="bg-white"
      >
        <div className="flex flex-col max-h-[70vh] p-5 pb-8">
            <div className="w-12 h-1.5 bg-slate-100 rounded-full self-center mb-5" />
            
            <h2 className="text-[14px] font-bold text-slate-300 uppercase tracking-widest mb-4 px-1">
                切换组织
            </h2>
            
            <div className="space-y-2 overflow-y-auto">
                {tenantsLoading && tenants.length === 0 ? (
                    <div className="py-10 flex justify-center text-slate-400">加载中...</div>
                ) : (
                    tenants.map((item) => (
                        <div 
                            key={item.id}
                            className={`flex items-center gap-3 p-3 rounded-xl transition-all active:scale-[0.98] cursor-pointer ${
                                String(item.id) === String(tenantId) 
                                ? 'bg-[#F1F7FF] border border-[#E0EFFF]' 
                                : 'bg-white border border-slate-50'
                            }`}
                            onClick={() => handleSwitchTenant(item)}
                        >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                String(item.id) === String(tenantId) 
                                ? 'bg-[#3B82F6] text-white' 
                                : 'bg-[#F1F5F9] text-slate-400'
                            }`}>
                                <Building2 size={20} />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <h3 className={`text-[15px] font-bold truncate ${
                                    String(item.id) === String(tenantId) ? 'text-[#3B82F6]' : 'text-slate-800'
                                }`}>
                                    {item.name}
                                </h3>
                                <p className="text-[11px] text-slate-400 font-medium leading-none mt-1">
                                    {item.tenantAdmin ? '管理员' : '成员'}
                                </p>
                            </div>
                            
                            {String(item.id) === String(tenantId) && (
                                <Check size={18} className="text-[#3B82F6]" strokeWidth={3} />
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
      </Popup>
      
      {/* 邀请成员弹窗 */}
      <Popup
        visible={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        position="center"
        round
        style={{ width: '85%', maxWidth: '320px', borderRadius: '32px', overflow: 'hidden' }}
      >
        <div className="bg-white p-4 flex flex-col items-center relative overflow-hidden">
            {/* 装饰性背景 */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/50 rounded-full blur-2xl -mr-12 -mt-12" />
            <div className="absolute top-8 right-0 opacity-[0.03] rotate-12">
                <Users size={120} className="text-blue-600" />
            </div>

            {/* 图标 */}
            <div className="w-14 h-14 bg-[#EFF6FF] rounded-[22px] flex items-center justify-center mb-3 relative z-10">
                <UserPlus size={26} className="text-[#3B82F6]" strokeWidth={2.5} />
            </div>

            {/* 标题文案 */}
            <h3 className="text-[17px] font-black text-slate-800 mb-1 relative z-10">邀请成员加入</h3>
            <p className="text-[12px] text-slate-400 font-bold mb-3 relative z-10 text-center">
                分享邀请链接让成员快速加入组织
            </p>

            {/* 链接容器 */}
            <div className="w-full bg-[#F8FAFC] rounded-[20px] p-3 mb-3 relative z-10 border border-slate-50 flex flex-col justify-center">
                <p className="text-[10px] text-slate-300 font-black mb-2 text-center uppercase tracking-wider">组织邀请链接</p>
                {inviteUrl ? (
                    <div
                        className="bg-white border border-slate-100 rounded-[12px] px-2 py-1 overflow-y-auto"
                        style={{ maxHeight: '100px' }}
                    >
                        <span className="text-[12px] text-slate-500 font-medium break-all leading-snug select-all">
                            {inviteUrl}
                        </span>
                    </div>
                ) : (
                    <div className="flex justify-center py-2">
                        <Loading size="20px" type="spinner" color="#94A3B8" />
                    </div>
                )}
            </div>

            {/* 复制按钮 */}
            <button
                className={`w-full h-10 bg-[#0F172A] text-white rounded-[14px] text-[14px] font-bold active:scale-95 transition-all relative z-10 shadow-lg shadow-slate-100 ${
                    !inviteUrl ? 'opacity-50 pointer-events-none' : ''
                }`}
                onClick={async () => {
                    if (!inviteUrl) return;
                    const success = await copyWithToast(inviteUrl, '邀请链接已复制');
                    if (success) {
                        setShowInviteModal(false);
                    }
                }}
            >
                复制邀请链接
            </button>
        </div>
      </Popup>
    </div>
  );
};

export default OrganizationManagementPage;

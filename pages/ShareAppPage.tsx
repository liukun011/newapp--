import React, { useState, useEffect } from 'react';
import { ChevronLeft, Copy, Users, CheckCircle2, Gift } from 'lucide-react';
import { Loading } from 'react-vant';
import { copyWithToast } from '@/utils/copyUtils';
import { userService } from '../services/userService';

interface InvitedFriend {
  id: string;
  name: string;
  joinDate: string;
  avatar: string;
  isConnected: boolean;
}

interface ShareAppPageProps {
  onBack: () => void;
}

const ShareAppPage: React.FC<ShareAppPageProps> = ({ onBack }) => {
  const [shareUrl, setShareUrl] = useState('');
  const [invitedFriends, setInvitedFriends] = useState<InvitedFriend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
        try {
            const res = await userService.getInviteCode('app');
            if (res.success && res.data) {
                setShareUrl(res.data);
            }
        } catch (e) {
            console.error('Failed to fetch app invite code', e);
        }
    };
    init();
  }, []);

  const fetchInvitedFriends = async () => {
    try {
      setLoading(true);
      // 改用新的 listRelations 接口
      const res = await userService.listRelations();

      // 根据用户提供的结构进行 mapping
      const listData = Array.isArray(res.data) ? res.data : (res.data?.records || (res.success && !res.data?.records && res.data ? [res.data] : []));

      if (Array.isArray(listData)) {
        const mapped = listData.map((item: any) => ({
          id: item.id || Math.random().toString(),
          name: item.inviteeUserName || '未知用户',
          // 格式化日期：2026-03-20T13:58:57 -> 2026-03-20
          joinDate: item.createDate ? item.createDate.split('T')[0] : '2024-03-10',
          avatar: '',
          isConnected: true,
        }));
        setInvitedFriends(mapped);
      }
    } catch (e) {
      console.error('Failed to fetch invited friends', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitedFriends();
  }, []);

  const handleCopy = () => {
    copyWithToast(shareUrl);
  };

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-between relative flex-shrink-0 border-b border-slate-50">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-600 active:scale-90 transition-transform">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-[18px] font-bold text-slate-800">分享应用</h1>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {/* Main Share Card */}
        <div className="relative bg-white rounded-[32px] p-4 shadow-[0_8px_30px_rgba(0,0,0,0.02)] border border-slate-50 flex flex-col items-center overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-50/50 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-50/30 rounded-full blur-3xl" />
            
            {/* Share Plan Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-50 rounded-full mb-1.5 mt-1 relative z-10">
                <Gift size={13} className="text-blue-500" />
                <span className="text-[11px] font-bold text-blue-500">分享计划</span>
            </div>

            {/* Title Text */}
            <div className="text-center mb-2 relative z-10">
                <h2 className="text-[22px] font-[900] text-slate-800 leading-tight mt-1">分享应用体验</h2>
                <h2 className="text-[22px] font-[900] text-slate-800 leading-tight mb-1">AI 报告新纪元</h2>
            </div>

            {/* Link Container */}
            <div className="w-full bg-[#F8FAFC] rounded-[16px] p-3 mb-3 relative z-10 border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] text-slate-400 font-bold">您的专属分享链接</p>
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-1 px-2 py-1 bg-white rounded-lg text-blue-500 shadow-sm border border-slate-100 active:scale-90 transition-transform"
                    >
                        <Copy size={13} />
                        <span className="text-[11px] font-bold">复制</span>
                    </button>
                </div>
                <div
                    className="bg-white border border-slate-100 rounded-[12px] px-2 py-1 overflow-y-auto"
                    style={{ maxHeight: '95px' }}
                >
                    <span className="text-[12px] text-slate-600 font-medium break-all leading-snug select-all">
                        {shareUrl || '获取链接中...'}
                    </span>
                </div>
            </div>

            {/* 立即分享按钮由于暂未接入系统原生分享，先下线处理
            <button
                className="w-full h-10 bg-[#2563EB] text-white rounded-[16px] flex items-center justify-center gap-2 shadow-[0_6px_16px_rgba(37,99,235,0.2)] active:scale-[0.98] transition-all relative z-10 overflow-hidden group"
                onClick={() => Toast.info('系统分享组件唤起中...')}
            >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Share2 size={18} className="relative z-10" />
                <span className="text-[15px] font-bold relative z-10">立即分享给好友</span>
            </button>
            */}
        </div>

        {/* Invited Friends Header */}
        <div className="flex items-center justify-between px-1 mt-1">
            <div className="flex items-center gap-2">
                <Users size={18} className="text-blue-500" />
                <h3 className="text-[14px] font-[800] text-slate-300 uppercase tracking-widest">已成功邀请的好友</h3>
            </div>
            <div className="bg-blue-50 text-blue-500 h-6 px-2.5 flex items-center justify-center rounded-full text-[12px] font-black">
                {invitedFriends.length}
            </div>
        </div>

        {/* Invited Friends List */}
        <div className="space-y-3 min-h-[200px]">
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loading size="24px" vertical>加载中...</Loading>
                </div>
            ) : invitedFriends.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-40">
                    <Users size={48} className="text-slate-200 mb-4" />
                    <p className="text-slate-400 text-sm">暂无好友入驻</p>
                </div>
            ) : (
                invitedFriends.map((friend) => (
                    <div 
                        key={friend.id}
                        className="bg-white p-4 rounded-[28px] shadow-[0_4px_20px_rgba(0,0,0,0.01)] border border-slate-50 flex items-center gap-4"
                    >
                        <div className="relative">
                            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100">
                                {friend.avatar ? (
                                    <img src={friend.avatar} alt={friend.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-400">
                                        <Users size={24} />
                                    </div>
                                )}
                            </div>
                            {friend.isConnected && (
                                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                                    <CheckCircle2 size={18} className="text-[#10B981]" fill="currentColor" />
                                    <div className="absolute inset-0 bg-white scale-[1.1] z-[-1] rounded-full" />
                                </div>
                            )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <h4 className="text-[16px] font-bold text-slate-800">{friend.name}</h4>
                            <p className="text-[12px] text-slate-400 font-bold mt-0.5">加入时间: {friend.joinDate}</p>
                        </div>

                        <div className="bg-[#F8FAFC] px-3 py-1.5 rounded-xl border border-slate-50 flex items-center justify-center">
                            <span className="text-[12px] text-slate-400 font-bold">已关联</span>
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>
    </div>
  );
};

export default ShareAppPage;

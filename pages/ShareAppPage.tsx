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
    <div className="flex flex-col h-screen bg-[#F7FAFE]">
      {/* Header */}
      <div className="bg-[#F7FAFE] px-4 py-3 flex items-center justify-between relative flex-shrink-0 border-b border-[#E2EBF5]/70">
        <button onClick={onBack} className="w-10 h-10 -ml-1 rounded-[14px] border border-[#E2EBF5] bg-[#FFFFFF] text-[#476285] flex items-center justify-center active:scale-95 transition-transform">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-[18px] font-medium text-[#0F2848]">分享应用</h1>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {/* Main Share Card */}
        <div className="relative bg-[#FFFFFF] rounded-[26px] p-4 shadow-[0_8px_24px_rgba(15,40,72,0.05)] border border-[#E2EBF5] flex flex-col items-center overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute -top-12 -right-12 w-44 h-44 bg-[#4C8BF5]/10 rounded-[999px] blur-3xl" />
            <div className="absolute -bottom-14 -left-12 w-44 h-44 bg-[#2563EB]/8 rounded-[999px] blur-3xl" />
            
            {/* Share Plan Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#2563EB1A] border border-[#E2EBF5] rounded-[999px] mb-1.5 mt-1 relative z-10">
                <Gift size={13} className="text-[#2563EB]" />
                <span className="text-[11px] font-medium text-[#2563EB]">分享计划</span>
            </div>

            {/* Title Text */}
            <div className="text-center mb-2 relative z-10">
                <h2 className="text-[21px] font-medium text-[#0F2848] leading-tight mt-1">分享应用体验</h2>
                <h2 className="text-[21px] font-medium text-[#0F2848] leading-tight mb-1">AI 报告新纪元</h2>
            </div>

            {/* Link Container */}
            <div className="w-full bg-[#F7FAFE] rounded-[18px] p-3 mb-3 relative z-10 border border-[#E2EBF5]">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] text-[#8AA2BF] font-medium">您的专属分享链接</p>
                    <button
                        onClick={handleCopy}
                        className="h-8 flex items-center gap-1.5 px-3 bg-[#FFFFFF] rounded-[11px] text-[#2563EB] shadow-[0_3px_10px_rgba(15,40,72,0.04)] border border-[#E2EBF5] active:scale-95 transition-transform"
                    >
                        <Copy size={13} />
                        <span className="text-[11px] font-medium">复制</span>
                    </button>
                </div>
                <div
                    className="bg-[#FFFFFF] border border-[#E2EBF5] rounded-[13px] px-2.5 py-2 overflow-y-auto"
                    style={{ maxHeight: '95px' }}
                >
                    <span className="text-[12px] text-[#476285] font-normal break-all leading-snug select-all">
                        {shareUrl || '获取链接中...'}
                    </span>
                </div>
            </div>

            {/* 立即分享按钮由于暂未接入系统原生分享，先下线处理
            <button
                className="w-full h-10 bg-[#2563EB] text-white rounded-[16px] flex items-center justify-center gap-2 shadow-[0_6px_16px_rgba(37, 99, 235,0.2)] active:scale-[0.98] transition-all relative z-10 overflow-hidden group"
                onClick={() => Toast.info('系统分享组件唤起中...')}
            >
                <div className="absolute inset-0 bg-[#2563EB] opacity-0 group-hover:opacity-100 transition-opacity" />
                <Share2 size={18} className="relative z-10" />
                <span className="text-[15px] font-medium relative z-10">立即分享给好友</span>
            </button>
            */}
        </div>

        {/* Invited Friends Header */}
        <div className="flex items-center justify-between px-1 mt-1">
            <div className="flex items-center gap-2">
                <Users size={18} className="text-[#2563EB]" />
                <h3 className="text-[14px] font-medium text-[#476285]">已成功邀请的好友</h3>
            </div>
            <div className="bg-[#FFFFFF] text-[#2563EB] h-6 px-2.5 flex items-center justify-center rounded-[999px] text-[12px] font-medium border border-[#E2EBF5]">
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
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-14 h-14 rounded-[18px] bg-[#FFFFFF] border border-[#E2EBF5] flex items-center justify-center mb-4">
                        <Users size={26} className="text-[#8AA2BF]" />
                    </div>
                    <p className="text-[#8AA2BF] text-sm">暂无好友入驻</p>
                </div>
            ) : (
                invitedFriends.map((friend) => (
                    <div 
                        key={friend.id}
                        className="bg-[#FFFFFF] p-4 rounded-[22px] shadow-[0_4px_16px_rgba(15,40,72,0.04)] border border-[#E2EBF5] flex items-center gap-4"
                    >
                        <div className="relative">
                            <div className="w-12 h-12 rounded-[16px] overflow-hidden bg-[#F7FAFE] border border-[#E2EBF5]">
                                {friend.avatar ? (
                                    <img src={friend.avatar} alt={friend.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-[#2563EB1A] text-[#2563EB]">
                                        <Users size={24} />
                                    </div>
                                )}
                            </div>
                            {friend.isConnected && (
                                <div className="absolute -bottom-1 -right-1 bg-[#FFFFFF] rounded-[999px] p-0.5 shadow-[0_3px_10px_rgba(15,40,72,0.04)]">
                                    <CheckCircle2 size={18} className="text-[#10B981]" fill="currentColor" />
                                    <div className="absolute inset-0 bg-[#FFFFFF] scale-[1.1] z-[-1] rounded-[999px]" />
                                </div>
                            )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <h4 className="text-[15px] font-medium text-[#0F2848]">{friend.name}</h4>
                            <p className="text-[12px] text-[#8AA2BF] font-normal mt-0.5">加入时间: {friend.joinDate}</p>
                        </div>

                        <div className="bg-[#ECFDF5] px-3 py-1.5 rounded-[14px] border border-[#E2EBF5] flex items-center justify-center">
                            <span className="text-[12px] text-[#10B981] font-medium">已关联</span>
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

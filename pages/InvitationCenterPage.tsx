import React, { useState, useEffect } from 'react';
import { ArrowLeft, Copy, Gift, UserCheck } from 'lucide-react';
import { Toast } from 'react-vant';
import { copyWithToast } from '@/utils/copyUtils';
import { userService } from '../services/userService';

interface InvitationCenterPageProps {
  onBack: () => void;
}

const InvitationCenterPage: React.FC<InvitationCenterPageProps> = ({ onBack }) => {
  const [inviteCode, setInviteCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [friendCode, setFriendCode] = useState('');

  const [isLoading, setIsLoading] = useState(false); // 首次查询 loading

  // 页面初始化：查询已有邀请码
  useEffect(() => {
    const fetchExistingCode = async () => {
      setIsLoading(true);
      try {
        const res = await userService.queryInviteCode();
        if (res.success && res.data) {
          setInviteCode(res.data);
        }
        // 查不到也不报错，让用户手动点生成
      } catch (error) {
        console.error('Query invite code failed', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchExistingCode();
  }, []);

  // 生成邀请码
  const generateInviteCode = async () => {
    if (inviteCode) return; // Already generated
    
    setIsGenerating(true);
    try {
      const res = await userService.getInviteCode('app');
      if (res.success && res.data) {
        setInviteCode(res.data);
      } else {
        Toast.fail(res.message || '获取失败');
      }
    } catch (error) {
      console.error('Fetch invite code failed', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // 复制邀请码
  const copyInviteCode = () => {
    if (!inviteCode) {
      Toast.info('请先生成邀请码');
      return;
    }
    copyWithToast(inviteCode, '已复制到剪贴板');
  };

  const handleConfirmFriendCode = async () => {
    const finalCode = friendCode.trim().toUpperCase();
    if (!finalCode) {
      Toast.info('请输入邀请码');
      return;
    }

    try {
      Toast.loading({ message: '提交中...', forbidClick: true });
      const res = await userService.importInviteCode(finalCode);
      Toast.clear();
      
      if (res.success) {
        Toast.success('关联成功');
        setFriendCode('');
      } else {
        Toast.fail(res.message || '关联失败');
      }
    } catch (error: any) {
      Toast.clear();
      const msg = error?.message || '关联失败，请稍后再试';
      Toast.fail(msg);
      console.error('Import invite code failed', error);
    }
  };

  const isComposing = React.useRef(false);

  return (
    <div 
      className="h-screen flex flex-col font-sans relative overflow-hidden"
      style={{
        backgroundImage: 'url(/talk-assistant/assets/invite.png)',
        backgroundSize: '100% 100%',
        backgroundPosition: 'top center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#F7FAFE'
      }}
    >

      {/* Header */}
      <div className="px-4 py-3 flex items-center relative z-50">
        <button 
          onClick={onBack} 
          className="p-2 -ml-2 text-slate-900 transition-colors active:bg-black/5 rounded-[999px]"
        >
          <ArrowLeft size={24} strokeWidth={2} />
        </button>
        <div className="flex-1 flex justify-center mr-6">
          <h1 className="text-[17px] font-medium text-slate-900">邀请中心</h1>
        </div>
      </div>

      {/* Scrollable Content Wrapper */}
      <div className="flex-1 w-full overflow-y-auto flex flex-col pt-0">
        {/* Header - Fixed to top contextually or scrolls with page based on preference. Here making it scroll contextually */}
      <div 
        className="pt-14 pb-6 pl-20 pr-8 my-3 flex flex-col items-start relative z-10 w-full whitespace-nowrap"
        style={{
          backgroundImage: 'url(/talk-assistant/assets/invitesvg.png)',
          backgroundSize: '100% 100%',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div 
          style={{
            fontFamily: "'Alibaba PuHuiTi 2.0', sans-serif",
            fontSize: '34px',
            fontWeight: 800,
            lineHeight: 'normal',
            letterSpacing: '0em',
            fontVariationSettings: '"opsz" auto',
            fontFeatureSettings: '"kern" on',
            color: '#004ACC',
          }}
          className="ml-4"
        >
          分享邀请码
        </div>
        <div 
          style={{
            fontFamily: "'Alibaba PuHuiTi 2.0', sans-serif",
            fontSize: '34px',
            fontWeight: 800,
            lineHeight: 'normal',
            letterSpacing: '0em',
            fontVariationSettings: '"opsz" auto',
            fontFeatureSettings: '"kern" on',
            color: '#000001',
          }}
          className="ml-2"
        >
          好友体验小狸报告
        </div>
      </div>

      {/* Main Content (Scrolls with the rest of the page) */}
      <div className="px-4 pb-2 space-y-4 pb-safe relative z-10">
        
        {/* Card 1: Share Code */}
        <div className="bg-[#FFFFFF] rounded-[20px] p-5 shadow-[0_3px_10px_rgba(15,40,72,0.04)] space-y-4">
          <h2 className="text-[15px] font-medium text-[#0F2848] tracking-wide">
            分享邀请码，邀请好友体验小狸报告
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-12 bg-[#F5F6F8] rounded-[14px] flex items-center px-4 overflow-hidden">
              <span className={`leading-none select-all truncate uppercase ${inviteCode ? 'text-[20px] text-[#004ACC] font-medium' : 'text-[14px] text-[#8AA2BF] font-normal'}`}>
                {isGenerating || isLoading ? '...' : (inviteCode || 'WAITING...')}
              </span>
            </div>
            <button
              onClick={inviteCode ? copyInviteCode : generateInviteCode}
              disabled={isLoading || isGenerating}
              className="h-12 px-5 bg-primary-gradient text-[#FFFFFF] text-[14px] font-medium rounded-[14px] active:scale-95 transition-transform disabled:opacity-80 flex-shrink-0"
            >
              {inviteCode ? '复制邀请码' : (isLoading || isGenerating ? '生成中...' : '生成邀请码')}
            </button>
          </div>
        </div>

        {/* Card 2: Steps */}
        <div className="bg-[#FFFFFF] rounded-[20px] p-5 shadow-[0_3px_10px_rgba(15,40,72,0.04)] space-y-5">
          <h2 className="text-[15px] font-medium text-[#0F2848] tracking-wide">
            邀请步骤
          </h2>
          <div className="pt-1 px-1">
            {[
              { icon: Copy, text: '复制您的专属邀请码并发送给好友' },
              { icon: Gift, text: '好友在下方填写您的邀请码并点击确定' },
              { icon: UserCheck, text: '好友分享，同触AI报告新体验' }
            ].map((step, idx, arr) => (
              <div key={idx} className="flex gap-4 relative">
                {/* Dotted Line */}
                {idx !== arr.length - 1 && (
                  <div className="absolute left-[5px] top-[20px] bottom-[-10px] w-0 border-l-[1.5px] border-dashed border-[#CCCEFF]" />
                )}
                
                {/* Dot */}
                <div className="relative z-10 flex-shrink-0 mt-1 w-[11px] h-[11px] rounded-[999px] border-[2.5px] border-[#CBD1FF] bg-[#FFFFFF] flex items-center justify-center">
                  <div className="w-[4px] h-[4px] bg-[#004ACC] rounded-[999px]" />
                </div>
                
                {/* Icon & Text */}
                <div className={`flex-1 flex gap-3.5 items-center ${idx !== arr.length - 1 ? 'pb-8' : ''}`}>
                  <step.icon size={20} className="text-[#476285] flex-shrink-0" strokeWidth={1.5} />
                  <span className="text-[14px] text-slate-600 leading-snug">
                    {step.text}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card 3: Fill Friend Code */}
        <div className="bg-[#FFFFFF] rounded-[20px] p-5 shadow-[0_3px_10px_rgba(15,40,72,0.04)] space-y-4">
          <h2 className="text-[15px] font-medium text-[#0F2848] tracking-wide">
            填写好友邀请码
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={friendCode}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!isComposing.current) {
                    const filtered = val.replace(/[^a-zA-Z0-9]/g, '');
                    setFriendCode(filtered);
                  } else {
                    setFriendCode(val);
                  }
                }}
                onCompositionStart={() => {
                  isComposing.current = true;
                }}
                onCompositionEnd={(e) => {
                  isComposing.current = false;
                  const val = (e.target as HTMLInputElement).value;
                  const filtered = val.replace(/[^a-zA-Z0-9]/g, '');
                  setFriendCode(filtered);
                }}
                placeholder="请输入邀请码"
                inputMode="email"
                maxLength={10}
                className="w-full h-12 bg-[#F5F6F8] border-none rounded-[14px] px-4 text-[15px] text-[#0F2848] placeholder:text-[#8AA2BF] focus:outline-none focus:ring-1 focus:ring-[#337DFF] uppercase"
              />
            </div>
            <button 
              onClick={handleConfirmFriendCode}
              disabled={!friendCode.trim()}
              className={`h-12 w-24 text-white text-[15px] font-medium rounded-[14px] active:scale-95 transition-all flex-shrink-0 ${
                friendCode.trim() ? 'bg-[#004ACC]' : 'bg-[#E2EBF5]'
              }`}
            >
              确定
            </button>
          </div>
        </div>



      </div>
      </div>
    </div>
  );
};

export default InvitationCenterPage;
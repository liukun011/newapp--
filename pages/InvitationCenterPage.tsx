import React, { useState, useEffect } from 'react';
import { ArrowLeft, Copy, Gift, UserCheck } from 'lucide-react';
import { Toast } from 'react-vant';
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
      const res = await userService.getInviteCode();
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
    
    const textToCopy = inviteCode;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        Toast.success('已复制到剪贴板');
      }).catch(() => {
        fallbackCopy(textToCopy);
      });
    } else {
      fallbackCopy(textToCopy);
    }
  };

  const fallbackCopy = (text: string) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      Toast.success('已复制到剪贴板');
    } catch (err) {
      Toast.fail('复制失败');
    }
    document.body.removeChild(textArea);
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
    <div className="h-screen bg-[#F7F8FA] flex flex-col font-sans relative overflow-hidden">
      {/* Header Background Gradient */}
      <div className="absolute top-0 left-0 right-0 h-[280px] bg-gradient-to-b from-[#EFEAFF] to-[#F7F8FA] pointer-events-none z-0" />

      {/* Header */}
      <div className="px-4 py-3 flex items-center relative z-50">
        <button 
          onClick={onBack} 
          className="p-2 -ml-2 text-slate-900 transition-colors active:bg-black/5 rounded-full"
        >
          <ArrowLeft size={24} strokeWidth={2} />
        </button>
        <div className="flex-1 flex justify-center mr-6">
          <h1 className="text-[17px] font-bold text-slate-900">邀请中心</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 py-2 space-y-4 overflow-y-auto pb-safe relative z-10">
        
        {/* Card 1: Share Code */}
        <div className="bg-white rounded-[20px] p-5 shadow-sm space-y-4">
          <h2 className="text-[15px] font-bold text-slate-800 tracking-wide">
            分享邀请码，邀请好友体验小狸报告
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-12 bg-[#F5F6F8] rounded-xl flex items-center px-4 overflow-hidden">
              <span className={`leading-none select-all truncate uppercase ${inviteCode ? 'text-[20px] text-[#4B40F6] font-medium' : 'text-[14px] text-gray-400 font-normal'}`}>
                {isGenerating || isLoading ? '...' : (inviteCode || 'WAITING...')}
              </span>
            </div>
            <button
              onClick={inviteCode ? copyInviteCode : generateInviteCode}
              disabled={isLoading || isGenerating}
              className="h-12 px-5 bg-[#4B40F6] text-white text-[14px] font-medium rounded-xl active:scale-95 transition-transform disabled:opacity-80 flex-shrink-0"
            >
              {inviteCode ? '复制邀请码' : (isLoading || isGenerating ? '生成中...' : '生成邀请码')}
            </button>
          </div>
        </div>

        {/* Card 2: Steps */}
        <div className="bg-white rounded-[20px] p-5 shadow-sm space-y-5">
          <h2 className="text-[15px] font-bold text-slate-800 tracking-wide">
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
                <div className="relative z-10 flex-shrink-0 mt-1 w-[11px] h-[11px] rounded-full border-[2.5px] border-[#CBD1FF] bg-white flex items-center justify-center">
                  <div className="w-[4px] h-[4px] bg-[#4B40F6] rounded-full" />
                </div>
                
                {/* Icon & Text */}
                <div className={`flex-1 flex gap-3.5 items-center ${idx !== arr.length - 1 ? 'pb-8' : ''}`}>
                  <step.icon size={20} className="text-slate-700 flex-shrink-0" strokeWidth={1.5} />
                  <span className="text-[14px] text-slate-600 leading-snug">
                    {step.text}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card 3: Fill Friend Code */}
        <div className="bg-white rounded-[20px] p-5 shadow-sm space-y-4">
          <h2 className="text-[15px] font-bold text-slate-800 tracking-wide">
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
                className="w-full h-12 bg-[#F5F6F8] border-none rounded-xl px-4 text-[15px] text-slate-800 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-100 uppercase"
              />
            </div>
            <button 
              onClick={handleConfirmFriendCode}
              disabled={!friendCode.trim()}
              className={`h-12 w-24 text-white text-[15px] font-medium rounded-xl active:scale-95 transition-all flex-shrink-0 ${
                friendCode.trim() ? 'bg-[#4B40F6]' : 'bg-[#AEA9F8]'
              }`}
            >
              确定
            </button>
          </div>
        </div>



      </div>
    </div>
  );
};

export default InvitationCenterPage;
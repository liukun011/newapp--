import React, { useState, useEffect } from 'react';
import { ArrowLeft, Zap, Copy } from 'lucide-react';
import { Toast } from 'react-vant';
import { motion } from 'framer-motion';
import { userService } from '../services/userService';

interface InvitationCenterPageProps {
  onBack: () => void;
}

const InvitationCenterPage: React.FC<InvitationCenterPageProps> = ({ onBack }) => {
  const [inviteCode, setInviteCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [friendCode, setFriendCode] = useState('');

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
      // axios 拦截器已经弹出了 Toast
    } finally {
      setIsGenerating(false);
    }
  };

  // 页面初始化时自动获取一次邀请码
  useEffect(() => {
    generateInviteCode();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (!friendCode.trim()) {
      Toast.info('请输入邀请码');
      return;
    }

    try {
      Toast.loading({ message: '提交中...', forbidClick: true });
      const res = await userService.importInviteCode(friendCode.trim());
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

  return (
    <div className="h-screen bg-[#F8FAFC] flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <div className="bg-white px-4 py-4 flex items-center sticky top-0 z-50">
        <button 
          onClick={onBack} 
          className="p-2 -ml-2 text-slate-900 transition-colors active:bg-gray-100 rounded-full"
        >
          <ArrowLeft size={24} strokeWidth={2.5} />
        </button>
        <div className="flex-1 flex justify-center mr-6">
          <h1 className="text-xl font-bold text-slate-900">邀请中心</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-5 py-6 space-y-8 overflow-y-auto pb-32">
        
        {/* Top Invitation Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[40px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden text-center border border-gray-50 mt-2"
        >
          {/* Subtle Background Decorations */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/30 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-50/20 rounded-full -ml-20 -mb-20 blur-3xl pointer-events-none" />
          
          <div className="relative z-10 space-y-5">
            <div className="space-y-1">
              <span className="text-[12px] font-black text-slate-400 tracking-[0.2em] uppercase">
                INVITATION PROGRAM
              </span>
              <h2 className="text-[17px] font-bold text-slate-600">
                分享邀请码，邀请好友体验小狸报告
              </h2>
            </div>

            {/* Code Area */}
            <div 
              onClick={copyInviteCode}
              className={`h-[90px] border border-[#CBDCFE] rounded-[24px] flex items-center justify-center transition-all cursor-pointer ${inviteCode ? 'bg-[#F2F7FF]' : 'bg-transparent'}`}
            >
              {inviteCode ? (
                <div className="flex flex-col items-center">
                  <span className="text-4xl font-black text-[#4337F1] tracking-[0.1em]">
                    {inviteCode}
                  </span>
                </div>
              ) : (
                <span className="text-2xl font-black italic text-slate-200 uppercase tracking-[0.2em] select-none">
                  {isGenerating ? '...' : 'WAITING...'}
                </span>
              )}
            </div>

            {/* Generate Button */}
            <button
              onClick={inviteCode ? copyInviteCode : generateInviteCode}
              disabled={isGenerating}
              className={`w-full h-[64px] bg-[#4337F1] text-white rounded-[24px] shadow-[0_8px_20px_rgba(67,55,241,0.2)] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-80 disabled:scale-100 disabled:shadow-none`}
            >
              {inviteCode ? (
                <>
                  <Copy size={22} strokeWidth={2} />
                  <span className="text-[17px] font-bold">复制邀请码</span>
                </>
              ) : (
                <>
                  <Zap size={22} fill="currentColor" strokeWidth={0} />
                  <span className="text-[17px] font-bold">{isGenerating ? '正在生成中...' : '生成我的专属邀请码'}</span>
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* Association Steps */}
        <div className="space-y-4 pt-2">
          <div className="text-[13px] font-bold text-slate-400 px-1">
            如何使用邀请码建立关联
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-[32px] p-7 shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-7"
          >
            {[
              { id: '01', text: '复制您的专属邀请码并发送给好友。' },
              { id: '02', text: '好友在下方填写您的邀请码并点击确定。' },
              { id: '03', text: '关联已开启。阅览好友分享，共触 AI 报告新体验。' }
            ].map((step, idx) => (
              <div key={idx} className="flex items-start gap-4">
                <div className="w-[52px] h-[44px] bg-[#EEF6FF] text-[#4337F1] rounded-[16px] flex items-center justify-center text-[17px] font-black flex-shrink-0">
                  {step.id}
                </div>
                <div className="text-[14px] text-slate-600 font-bold leading-relaxed pt-2">
                  {step.text}
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Fill in Friend's Code */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-[32px] p-7 shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-5"
        >
          <div className="text-[17px] font-black text-slate-800">
            填写好友邀请码
          </div>
          
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={friendCode}
                onChange={(e) => setFriendCode(e.target.value.toUpperCase())}
                placeholder="输入邀请码"
                className="w-full h-[60px] bg-[#F8FAFC] border-none rounded-[18px] px-5 text-[16px] font-bold text-slate-800 placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
              />
            </div>
            <button 
              onClick={handleConfirmFriendCode}
              className="w-[70px] h-[60px] bg-[#4337F1] text-white rounded-[18px] flex items-center justify-center active:scale-95 transition-all shadow-lg shadow-indigo-100"
            >
              <div className="flex flex-col items-center">
                <span className="text-[15px] font-black leading-tight">确</span>
                <span className="text-[15px] font-black leading-tight">定</span>
              </div>
            </button>
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default InvitationCenterPage;
import React, { useState } from 'react';
import { ChevronLeft, Building2, KeyRound, ShieldCheck } from 'lucide-react';
import { Toast } from 'react-vant';
import { authService } from '../services/authService';
import { userService } from '../services/userService';

interface JoinOrganizationPageProps {
  onBack: () => void;
  onSuccess?: () => void;
}

const JoinOrganizationPage: React.FC<JoinOrganizationPageProps> = ({ onBack, onSuccess }) => {
  const [orgCode, setOrgCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const normalizedCode = orgCode.trim().toUpperCase();
  const canSubmit = normalizedCode.length > 0 && !submitting;

  const syncUserInfo = async () => {
    try {
      const res = await authService.getUserInfo();
      if ((res.successful || res.code === 200) && res.data) {
        localStorage.setItem('zov-user-info', JSON.stringify(res.data));
      }
    } catch (error) {
      console.warn('Sync user info after joining organization failed', error);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    Toast.loading({ message: '正在申请...', duration: 0 });
    try {
      const res = await userService.importInviteCode(normalizedCode);
      Toast.clear();
      if (res.success || res.code === 200) {
        await syncUserInfo();
        Toast.success(res.message || '已提交加入申请');
        onSuccess?.();
      } else {
        Toast.fail(res.message || '组织编码暂时无法使用');
      }
    } catch (error) {
      Toast.clear();
      console.error('Join organization failed', error);
      Toast.fail('申请暂时无法提交');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-[#F7FAFE]">
      <div className="relative flex h-[60px] shrink-0 items-center justify-center border-b border-[#E2EBF5] bg-[#FFFFFF] px-4">
        <button
          onClick={onBack}
          className="absolute left-4 flex h-10 w-10 items-center justify-center rounded-[14px] text-[#476285] active:bg-[#F7FAFE]"
          aria-label="返回"
        >
          <ChevronLeft size={24} strokeWidth={2.2} />
        </button>
        <h1 className="text-[17px] font-medium text-[#0F2848]">申请加入组织</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-5">
        <section className="relative overflow-hidden rounded-[24px] border border-[#D8E6FF] bg-[#EEF4FF] p-4">
          <div className="mb-4 flex items-center justify-between">
            <span className="rounded-full border border-[#CFE0FF] bg-[#FFFFFF] px-2.5 py-1 text-[10.5px] font-medium text-[#2563EB]">
              组织申请
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-[#CFE0FF] bg-[#FFFFFF] text-[#2563EB]">
              <Building2 size={20} strokeWidth={2} />
            </div>
          </div>

          <h2 className="text-[21px] font-medium leading-[28px] text-[#0F2848]">通过组织编码加入</h2>
          <p className="mt-2 text-[13px] leading-[21px] text-[#476285]">
            输入管理员提供的组织编码，提交后会向对应组织发起加入申请
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <div className="rounded-[16px] border border-[#D8E6FF] bg-[#FFFFFF] p-3">
              <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#EEF4FF] text-[12px] font-medium text-[#2563EB]">1</div>
              <p className="text-[12px] font-medium text-[#0F2848]">获取编码</p>
              <p className="mt-1 text-[10.5px] leading-[15px] text-[#8AA2BF]">向管理员或团队成员获取</p>
            </div>
            <div className="rounded-[16px] border border-[#D8E6FF] bg-[#FFFFFF] p-3">
              <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#EEF4FF] text-[12px] font-medium text-[#2563EB]">2</div>
              <p className="text-[12px] font-medium text-[#0F2848]">提交申请</p>
              <p className="mt-1 text-[10.5px] leading-[15px] text-[#8AA2BF]">通过后即可切换组织</p>
            </div>
          </div>

          <div className="mt-4 rounded-[18px] border border-[#D8E6FF] bg-[#FFFFFF] p-3.5">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-[11px] bg-[#F7FAFE] text-[#2563EB]">
                <KeyRound size={17} strokeWidth={2} />
              </div>
              <p className="text-[13px] font-medium text-[#0F2848]">组织编码</p>
            </div>

            <div className="flex h-[52px] items-center gap-2.5 rounded-[16px] border border-[#D8E6FF] bg-[#F7FAFE] px-4 transition-all focus-within:border-[#2563EB] focus-within:bg-[#FFFFFF] focus-within:ring-4 focus-within:ring-[#2563EB14]">
              <ShieldCheck size={18} className="shrink-0 text-[#8AA2BF]" strokeWidth={2} />
              <input
                value={orgCode}
                onChange={(event) => setOrgCode(event.target.value.toUpperCase())}
                placeholder="请输入组织编码"
                autoCapitalize="characters"
                className="min-w-0 flex-1 bg-transparent text-[15px] font-medium tracking-[0.12em] text-[#0F2848] outline-none placeholder:tracking-normal placeholder:text-[#A6B6CC]"
              />
            </div>

            {normalizedCode && (
              <div className="mt-2 text-right text-[11.5px] leading-[16px] text-[#8AA2BF]">
                {normalizedCode.length} 位
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="shrink-0 border-t border-[#E2EBF5] bg-[#FFFFFF] px-5 pb-7 pt-3">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`h-[50px] w-full rounded-[16px] text-[15px] font-medium transition-all ${
            canSubmit
              ? 'bg-[#2563EB] text-[#FFFFFF] shadow-[0_10px_24px_rgba(37,99,235,0.18)] active:scale-[0.98]'
              : 'bg-[#E2EBF5] text-[#8AA2BF]'
          }`}
        >
          {submitting ? '提交中...' : '下一步'}
        </button>
      </div>
    </div>
  );
};

export default JoinOrganizationPage;

import React, { useState } from 'react';
import { ChevronLeft, Building2 } from 'lucide-react';
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
    <div className="flex h-screen flex-col xl-page">
      <div className="relative flex h-[62px] shrink-0 items-center justify-center bg-[#FFFFFF] px-4">
        <button
          onClick={onBack}
          className="absolute left-4 flex h-10 w-10 items-center justify-center rounded-[14px] text-[#476285] active:bg-[#F7FAFE]"
        >
          <ChevronLeft size={24} strokeWidth={2.2} />
        </button>
        <h1 className="text-[17px] font-medium text-[#0F2848]">申请加入组织</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pt-12">
        <div className="mb-7 flex h-12 w-12 items-center justify-center rounded-[16px] border border-[#E2EBF5] bg-[#2563EB1A] text-[#2563EB]">
          <Building2 size={24} strokeWidth={2.1} />
        </div>

        <h2 className="mb-4 text-[24px] font-medium leading-[1.25] tracking-tight text-[#0F2848]">
          通过组织编码加入
        </h2>
        <p className="mb-12 text-[15px] font-normal leading-[1.8] text-[#476285]">
          组织编码是组织的唯一标识，请向管理员或团队成员获取后填写。
        </p>

        <div className="relative">
          <input
            value={orgCode}
            onChange={(event) => setOrgCode(event.target.value.toUpperCase())}
            placeholder="请输入组织编码"
            autoCapitalize="characters"
            className="h-[58px] w-full rounded-[28px] border border-[#BFD7FF] bg-[#FFFFFF] px-5 text-[16px] font-medium tracking-[0.12em] text-[#0F2848] outline-none transition-all placeholder:tracking-normal placeholder:text-[#8AA2BF] focus:border-[#4C8BF5] focus:ring-4 focus:ring-[#2563EB1A]"
          />
        </div>
      </div>

      <div className="shrink-0 px-6 pb-8 pt-4">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`h-[52px] w-full rounded-[999px] text-[15px] font-medium transition-all ${
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

import React from 'react';
import { ChevronRight, FileText, ListChecks } from 'lucide-react';

interface ManagementPageProps {
  onNavigateToTemplates: () => void;
  onNavigateToQuestionLibrary?: () => void;
}

const ManagementPage: React.FC<ManagementPageProps> = ({
  onNavigateToTemplates,
  onNavigateToQuestionLibrary,
}) => {
  return (
    <div className="min-h-screen xl-page pb-24">
      {/* Header */}
      <div className="bg-[linear-gradient(180deg,#f7f2e8_0%,rgba(247,242,232,0.96)_100%)] py-4 px-5 flex items-center justify-center sticky top-0 z-10">
        <h1 className="text-[18px] font-semibold text-[#1f2024] tracking-wide">
          管理
        </h1>
      </div>

      {/* Content - 提取出来的二级菜单列表形 */}
      <div className="px-4 pt-2 space-y-3">
        {/* 报告模板 */}
        <div
          className="xl-card px-3.5 py-3 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer"
          onClick={onNavigateToTemplates}
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-[13px] bg-[#fbf6eb] border border-[#eadfca] flex items-center justify-center text-[#8b641d]">
              <FileText size={19} strokeWidth={2.1} />
            </div>
            <div className="flex flex-col">
              <span className="text-[14.5px] font-medium text-[#1f2024] mb-1">模板管理</span>
              <span className="text-[11.5px] text-[#7d7467]">报告模板、上传处理</span>
            </div>
          </div>
          <ChevronRight size={20} className="text-[#c9bda9]" />
        </div>

        {/* 问题清单 */}
        <div
          className="xl-card px-3.5 py-3 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer"
          onClick={() => {
            if (onNavigateToQuestionLibrary) {
              onNavigateToQuestionLibrary();
            }
          }}
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-[13px] bg-[#fbf6eb] border border-[#eadfca] flex items-center justify-center text-[#8b641d]">
              <ListChecks size={19} strokeWidth={2.1} />
            </div>
            <div className="flex flex-col">
              <span className="text-[14.5px] font-medium text-[#1f2024] mb-1">问题清单</span>
              <span className="text-[11.5px] text-[#7d7467]">题库配置、精准匹配</span>
            </div>
          </div>
          <ChevronRight size={20} className="text-[#c9bda9]" />
        </div>
      </div>
    </div>
  );
};

export default ManagementPage;

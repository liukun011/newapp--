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
    <div className="min-h-screen bg-[#F7F8FA] pb-24">
      {/* Header */}
      <div className="bg-[#F7F8FA] py-4 px-6 flex items-center justify-center sticky top-0 z-10">
        <h1 className="text-[18px] font-bold text-slate-800 tracking-wide">
          管理
        </h1>
      </div>

      {/* Content - 提取出来的二级菜单列表形 */}
      <div className="px-4 pt-2 space-y-3">
        {/* 报告模板 */}
        <div
          className="bg-white rounded-[20px] p-4 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.02)] active:scale-[0.98] transition-all cursor-pointer"
          onClick={onNavigateToTemplates}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <FileText size={24} />
            </div>
            <div className="flex flex-col">
              <span className="text-[16px] font-bold text-slate-800 mb-1">模板管理</span>
              <span className="text-[12px] text-slate-500">报告模板、上传处理</span>
            </div>
          </div>
          <ChevronRight size={20} className="text-gray-300" />
        </div>

        {/* 问题清单 */}
        <div
          className="bg-white rounded-[20px] p-4 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.02)] active:scale-[0.98] transition-all cursor-pointer"
          onClick={() => {
            if (onNavigateToQuestionLibrary) {
              onNavigateToQuestionLibrary();
            }
          }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
              <ListChecks size={24} />
            </div>
            <div className="flex flex-col">
              <span className="text-[16px] font-bold text-slate-800 mb-1">问题清单</span>
              <span className="text-[12px] text-slate-500">题库配置、精准匹配</span>
            </div>
          </div>
          <ChevronRight size={20} className="text-gray-300" />
        </div>
      </div>
    </div>
  );
};

export default ManagementPage;

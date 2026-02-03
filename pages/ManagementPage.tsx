import React from 'react';
import { FileText, Layers, ChevronRight } from 'lucide-react';

interface ManagementPageProps {
  onNavigateToTemplates: () => void;
  onNavigateToQuestionLibrary?: () => void;
}

const ManagementPage: React.FC<ManagementPageProps> = ({
  onNavigateToTemplates,
  onNavigateToQuestionLibrary,
}) => {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white px-6 pt-12 pb-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">业务支撑管理</h1>
        <p className="text-sm text-gray-400 tracking-wider">WORKSPACE SUPPORT</p>
      </div>

      {/* Content */}
      <div className="px-6 py-6 space-y-4">
        {/* 模板中心 Card */}
        <div 
          className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          onClick={onNavigateToTemplates}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FileText size={24} className="text-primary" />
              </div>
              
              {/* Text */}
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-800 mb-1">模板中心</h3>
                <p className="text-sm text-gray-400">行业报告模板</p>
              </div>
            </div>
          </div>

          {/* Enter Button */}
          <div className="mt-4 flex items-center gap-1 text-primary font-medium text-sm">
            <span>进入</span>
            <ChevronRight size={16} />
          </div>
        </div>

        {/* 问题清单 Card */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 shadow-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <Layers size={24} className="text-emerald-400" />
              </div>
              
              {/* Text */}
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1">问题清单</h3>
                <p className="text-sm text-gray-400">话术清单解答</p>
              </div>
            </div>
          </div>

          {/* Configure Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onNavigateToQuestionLibrary) {
                onNavigateToQuestionLibrary();
              }
            }}
            className="mt-4 flex items-center gap-1 text-emerald-400 font-medium text-sm"
          >
            <span>配置</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Decorative Background Icon */}
      <div className="fixed bottom-32 left-1/2 transform -translate-x-1/2 opacity-5">
        <Layers size={200} className="text-gray-400" />
      </div>
    </div>
  );
};

export default ManagementPage;

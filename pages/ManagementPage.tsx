import React from 'react';
import TempIcon from '@/assets/temp.svg?react';
import QuestionIcon from '@/assets/question.svg?react';

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
      <div className="bg-white py-3 px-6 flex items-center justify-center sticky top-0 z-10">
        <h1 className="text-[18px] font-medium text-slate-800 tracking-wide">
          基本信息管理
        </h1>
      </div>

      {/* Content */}
      <div className="px-5 pt-2 space-y-5">

        {/* 我的模板 Card */}
        <div
          className="relative bg-gradient-to-r from-[#eaf4ff] to-[#dfedff] rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden min-h-[140px]"
          onClick={onNavigateToTemplates}
        >
          {/* Text Content */}
          <div className="relative z-10 w-[52%] ml-auto flex flex-col items-start text-left">
            <h3 
              className="mb-1"
              style={{
                fontFamily: "'Alibaba PuHuiTi 2.0', sans-serif",
                fontSize: '18px',
                fontWeight: 600,
                lineHeight: 'normal',
                letterSpacing: '0em',
                fontVariationSettings: '"opsz" auto',
                fontFeatureSettings: '"kern" on',
                color: '#0061F3'
              }}
            >
              我的模板，高效管理
            </h3>
            <p 
              className="mt-2 tracking-wide leading-relaxed"
              style={{
                fontFamily: "'Alibaba PuHuiTi 2.0', sans-serif",
                fontSize: '12px',
                fontWeight: 'normal',
                lineHeight: 'normal',
                letterSpacing: '0em',
                fontVariationSettings: '"opsz" auto',
                fontFeatureSettings: '"kern" on',
                color: 'rgba(0, 0, 0, 0.6)'
              }}
            >
              轻松管模，高效开始每一刻
            </p>

            {/* Enter Button */}
            <div className="mt-5 inline-flex items-center justify-center px-4 py-1 rounded-full border border-[#1b6eed] text-[#1b6eed] text-[13px] font-medium bg-transparent hover:bg-blue-50 transition-colors">
              进入模板
            </div>
          </div>

          {/* Left Side Illustration */}
          <div className="absolute left-0 bottom-0 pointer-events-none w-[133px] h-[133px]">
            <TempIcon className="w-full h-full object-contain object-center scale-[2.2] translate-x-3 translate-y-5" />
          </div>
        </div>

        {/* 问题清单 Card */}
        <div
          className="relative bg-gradient-to-r from-[#f0efff] to-[#e6e4ff] rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden min-h-[140px]"
          onClick={(e) => {
            e.stopPropagation();
            if (onNavigateToQuestionLibrary) {
              onNavigateToQuestionLibrary();
            }
          }}
        >
          {/* Text Content */}
          <div className="relative z-10 w-[52%] ml-auto flex flex-col items-start text-left">
            <h3 
              className="mb-1"
              style={{
                fontFamily: "'Alibaba PuHuiTi 2.0', sans-serif",
                fontSize: '18px',
                fontWeight: 600,
                lineHeight: 'normal',
                letterSpacing: '0em',
                fontVariationSettings: '"opsz" auto',
                fontFeatureSettings: '"kern" on',
                color: '#0061F3'
              }}
            >
              问题清单，精准匹配
            </h3>
            <p 
              className="mt-2 tracking-wide leading-relaxed"
              style={{
                fontFamily: "'Alibaba PuHuiTi 2.0', sans-serif",
                fontSize: '12px',
                fontWeight: 'normal',
                lineHeight: 'normal',
                letterSpacing: '0em',
                fontVariationSettings: '"opsz" auto',
                fontFeatureSettings: '"kern" on',
                color: 'rgba(0, 0, 0, 0.6)'
              }}
            >
              题题相应，让访谈更高效
            </p>
            <div className="mt-5 inline-flex items-center justify-center px-4 py-1 rounded-full border border-[#5c52d7] text-[#5c52d7] text-[13px] font-medium bg-transparent hover:bg-purple-50 transition-colors">
              进入配置
            </div>
          </div>

          {/* Left Side Illustration */}
          <div className="absolute left-0 bottom-0 pointer-events-none w-[133px] h-[133px]">
            <QuestionIcon className="w-full h-full object-contain object-center scale-[2.2] translate-x-3 translate-y-3" />
          </div>
        </div>

      </div>
    </div>
  );
};

export default ManagementPage;

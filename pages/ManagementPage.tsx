import React from 'react';

interface ManagementPageProps {
  onNavigateToTemplates: () => void;
  onNavigateToQuestionLibrary?: () => void;
}

const ManagementPage: React.FC<ManagementPageProps> = ({
  onNavigateToTemplates,
  onNavigateToQuestionLibrary,
}) => {
  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <div className="bg-white pt-6 pb-2 px-6 flex items-center justify-center sticky top-0 z-10">
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
          <div className="relative z-10 w-[60%]">
            <h3 className="text-[17px] font-bold text-[#1b6eed] mb-1">
              我的模板，高效管理
            </h3>
            <p className="text-[12px] text-[#6b778d] mt-2 tracking-wide leading-relaxed">
              轻松管模，高效开始每一刻
            </p>
            
            {/* Enter Button */}
            <div className="mt-5 inline-flex items-center justify-center px-4 py-1 rounded-full border border-[#1b6eed] text-[#1b6eed] text-[13px] font-medium bg-transparent hover:bg-blue-50 transition-colors">
              进入模板
            </div>
          </div>

          {/* Right Side Illustration */}
          {/* Provide a placeholder styling for the 3D illustration, using absolute positioning.
              The user can replace this div with an <img> tag when assets are available. */}
          <div className="absolute right-0 bottom-0 pointer-events-none w-[130px] h-[110px]">
            <img 
               src="/assets/manage_template_illus.png" 
               alt="Template Illustration" 
               className="w-full h-full object-contain object-right-bottom"
               onError={(e) => {
                 // Fallback if image doesn't exist
                 e.currentTarget.style.display = 'none';
                 e.currentTarget.parentElement!.innerHTML = `
                  <svg width="100%" height="100%" viewBox="0 0 130 110" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="20" y="20" width="90" height="70" rx="6" fill="#1b6eed" fill-opacity="0.1"/>
                    <rect x="30" y="30" width="70" height="50" rx="4" fill="#1b6eed" fill-opacity="0.2"/>
                    <path d="M40 45H90M40 55H70M40 65H80" stroke="#1b6eed" stroke-width="4" stroke-linecap="round"/>
                  </svg>
                 `;
               }}
            />
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
          <div className="relative z-10 w-[60%]">
            <h3 className="text-[17px] font-bold text-[#5c52d7] mb-1">
              问题清单，精准匹配
            </h3>
            <p className="text-[12px] text-[#6b778d] mt-2 tracking-wide leading-relaxed">
              题题相应，让访谈更高效
            </p>
            
            {/* Configure Button */}
            <div className="mt-5 inline-flex items-center justify-center px-4 py-1 rounded-full border border-[#5c52d7] text-[#5c52d7] text-[13px] font-medium bg-transparent hover:bg-purple-50 transition-colors">
              进入配置
            </div>
          </div>

          {/* Right Side Illustration */}
          <div className="absolute right-0 bottom-0 pointer-events-none w-[130px] h-[120px]">
            <img 
               src="/assets/manage_question_illus.png" 
               alt="Question List Illustration" 
               className="w-full h-full object-contain object-right-bottom"
               onError={(e) => {
                 // Fallback if image doesn't exist
                 e.currentTarget.style.display = 'none';
                 e.currentTarget.parentElement!.innerHTML = `
                  <svg width="100%" height="100%" viewBox="0 0 130 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="30" y="10" width="70" height="90" rx="6" fill="#5c52d7" fill-opacity="0.1"/>
                    <circle cx="65" cy="40" r="15" stroke="#5c52d7" stroke-width="4"/>
                    <path d="M75 50L85 60" stroke="#5c52d7" stroke-width="4" stroke-linecap="round"/>
                    <path d="M45 70H85M45 80H75" stroke="#5c52d7" stroke-width="4" stroke-linecap="round" fill-opacity="0.4"/>
                  </svg>
                 `;
               }}
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default ManagementPage;

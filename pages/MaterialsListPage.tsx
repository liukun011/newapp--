import React from 'react';
import { ArrowLeft, Camera, Image as ImageIcon, FileText, Mic } from 'lucide-react';
import Button from '../components/Button';

interface MaterialsListPageProps {
  onBack: () => void;
  onGenerateReport: () => void;
  onSelectUploadType?: (type: 'camera' | 'gallery' | 'file' | 'voice') => void;
}

const MaterialsListPage: React.FC<MaterialsListPageProps> = ({ 
  onBack, 
  onGenerateReport,
  onSelectUploadType
}) => {
  const uploadOptions = [
    { id: 'camera' as const, label: '相机', icon: Camera },
    { id: 'gallery' as const, label: '相册', icon: ImageIcon },
    { id: 'file' as const, label: '文件', icon: FileText },
    { id: 'voice' as const, label: '语音录入', icon: Mic },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* NavBar */}
      <div className="flex items-center justify-center px-4 py-3 relative border-b border-gray-100">
        <button 
          onClick={onBack} 
          className="absolute left-4 p-2 text-slate-700 hover:bg-slate-50 rounded-full active:bg-slate-100 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-semibold text-slate-800">尽调资料</h1>
      </div>

      {/* Upload Options Grid */}
      <div className="px-6 pt-6">
        <div className="grid grid-cols-4 gap-4">
          {uploadOptions.map((option) => (
            <button 
              key={option.id}
              onClick={() => onSelectUploadType?.(option.id)}
              className="flex flex-col items-center gap-2 active:scale-95 transition-transform"
            >
              <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center">
                <option.icon size={32} className="text-slate-600" strokeWidth={1.5} />
              </div>
              <span className="text-sm text-slate-700 font-medium">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Empty State */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-24">
        {/* Mascot Illustration */}
        <div className="relative mb-6">
          <svg width="180" height="180" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Decorative stars */}
            <g opacity="0.2">
              <path d="M45 60L47 65L52 67L47 69L45 74L43 69L38 67L43 65L45 60Z" fill="#9CA3AF"/>
              <path d="M140 50L142 55L147 57L142 59L140 64L138 59L133 57L138 55L140 50Z" fill="#9CA3AF"/>
              <path d="M55 140L57 145L62 147L57 149L55 154L53 149L48 147L53 145L55 140Z" fill="#9CA3AF"/>
              <path d="M125 130L127 135L132 137L127 139L125 144L123 139L118 137L123 135L125 130Z" fill="#9CA3AF"/>
            </g>
            
            {/* Main character - cute mascot */}
            <g transform="translate(40, 50)">
              {/* Body */}
              <ellipse cx="50" cy="65" rx="45" ry="42" fill="#E5E7EB"/>
              
              {/* Head */}
              <circle cx="50" cy="35" r="30" fill="#F3F4F6"/>
              
              {/* Ears */}
              <ellipse cx="30" cy="20" rx="8" ry="12" fill="#E5E7EB"/>
              <ellipse cx="70" cy="20" rx="8" ry="12" fill="#E5E7EB"/>
              
              {/* Face details */}
              {/* Eyes - closed/happy */}
              <path d="M38 30 Q40 33 42 30" stroke="#9CA3AF" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
              <path d="M58 30 Q60 33 62 30" stroke="#9CA3AF" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
              
              {/* Nose */}
              <ellipse cx="50" cy="38" rx="3" ry="2.5" fill="#D1D5DB"/>
              
              {/* Mouth - smiling */}
              <path d="M42 42 Q50 46 58 42" stroke="#9CA3AF" strokeWidth="2" fill="none" strokeLinecap="round"/>
              
              {/* Arms */}
              <ellipse cx="20" cy="60" rx="10" ry="18" fill="#E5E7EB" transform="rotate(-20 20 60)"/>
              <ellipse cx="80" cy="60" rx="10" ry="18" fill="#E5E7EB" transform="rotate(20 80 60)"/>
              
              {/* Belly patch */}
              <ellipse cx="50" cy="70" rx="22" ry="25" fill="#F9FAFB"/>
              
              {/* Paws/feet */}
              <ellipse cx="35" cy="100" rx="12" ry="8" fill="#E5E7EB"/>
              <ellipse cx="65" cy="100" rx="12" ry="8" fill="#E5E7EB"/>
            </g>
          </svg>
        </div>

        {/* Text */}
        <p className="text-sm text-gray-400 text-center">小理等你上传资料哦</p>
      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-4 bg-white">
        <Button 
          variant="primary" 
          block 
          className="!rounded-full !h-14 !text-base !font-semibold shadow-lg"
          style={{ 
            background: 'linear-gradient(90deg, #5B4EF8 0%, #6B5EFF 100%)',
            boxShadow: '0 4px 20px rgba(91, 78, 248, 0.3)'
          }}
          onClick={onGenerateReport}
        >
          → 立即生成报告
        </Button>
      </div>
    </div>
  );
};

export default MaterialsListPage;

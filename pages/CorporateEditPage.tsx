import React, { useState } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import Button from '../components/Button';
import { COLORS } from '../constants';

interface CorporateEditPageProps {
  onBack: () => void;
  onConfirm: () => void;
}

const CorporateEditPage: React.FC<CorporateEditPageProps> = ({ onBack, onConfirm }) => {
  const [companyName, setCompanyName] = useState('A公司流贷尽调');

  return (
    <div className="flex flex-col min-h-screen bg-[#F7F8FA] relative">
      {/* NavBar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white sticky top-0 z-10">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-700 hover:bg-slate-50 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-slate-800">企业资料</h1>
        <div className="w-8"></div> {/* Spacer for alignment */}
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 flex flex-col items-center w-full">
        {/* Photo Uploader Placeholder */}
        <div className="mt-8 mb-10 flex flex-col items-center justify-center">
            <div className="w-28 h-28 rounded-full bg-indigo-50 flex flex-col items-center justify-center text-indigo-500 mb-2 shadow-sm border border-indigo-100 active:scale-95 transition-transform cursor-pointer">
                <Plus size={36} strokeWidth={2.5} />
                <span className="text-[11px] font-medium mt-1 text-indigo-400">企业照片</span>
            </div>
        </div>

        {/* Name Input */}
        <div className="w-full">
            <label className="block text-sm text-slate-500 mb-3 pl-1">被访企业名称</label>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-transparent focus-within:border-indigo-200 transition-colors">
                <input 
                    type="text" 
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full text-[16px] text-slate-800 font-medium outline-none bg-transparent placeholder-gray-300"
                    placeholder="请输入企业名称"
                />
            </div>
        </div>
      </div>

      {/* Bottom Buttons */}
      <div className="p-6 pb-8 bg-white border-t border-gray-100 flex gap-4 mt-auto sticky bottom-0 z-20 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
         <Button 
            variant="secondary" 
            block 
            className="flex-1 !rounded-full !border-gray-200 !text-slate-600 !h-12 !text-[16px]"
            onClick={onBack}
         >
           取消
         </Button>
         
         <Button 
            variant="primary" 
            block 
            className="flex-1 !rounded-full !h-12 !text-[16px] shadow-indigo-500/25"
            onClick={onConfirm}
         >
           确认
         </Button>
      </div>
    </div>
  );
};

export default CorporateEditPage;
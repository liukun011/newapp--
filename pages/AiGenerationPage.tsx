import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import Button from '../components/Button';
import Mascot from '../components/Mascot';

// Mock generated questions based on the prototype
const GENERATED_QUESTIONS = [
  { id: 1, text: "主营业务收入持续增长，得益于产品竞争力和市场拓展，具备良好可持续性。" },
  { id: 2, text: "核心管理层是否存在竞业禁止协议冲突风险？" },
  { id: 3, text: "研发投入资本化处理是否符合会计准则？" },
  { id: 4, text: "主营业务收入持续增长，得益于产品竞争力和市场拓展，具备良好可持续性。" },
  { id: 5, text: "核心管理层是否存在竞业禁止协议冲突风险？" },
  { id: 6, text: "研发投入资本化处理是否符合会计准则？" },
  { id: 7, text: "主营业务收入持续增长，得益于产品竞争力和市场拓展，具备良好可持续性。" },
  { id: 8, text: "核心管理层是否存在竞业禁止协议冲突风险？" },
  { id: 9, text: "研发投入资本化处理是否符合会计准则？" },
  { id: 10, text: "主营业务收入持续增长，得益于产品竞争力和市场拓展，具备良好可持续性。" },
];

interface AiGenerationPageProps {
  onBack: () => void;
  onConfirm: () => void;
}

const AiGenerationPage: React.FC<AiGenerationPageProps> = ({ onBack, onConfirm }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>(GENERATED_QUESTIONS.map(q => q.id));
  const [showModal, setShowModal] = useState(false);
  const [storageCategory, setStorageCategory] = useState('信贷');

  // Simulate loading sequence
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // 监听原生返回键
  useEffect(() => {
    const handleNativeBack = (e: Event) => {
      e.preventDefault();
      onBack();
    };

    window.addEventListener('requestNativeBack', handleNativeBack);
    return () => {
      window.removeEventListener('requestNativeBack', handleNativeBack);
    };
  }, [onBack]);

  const toggleQuestion = (id: number) => {
    if (selectedQuestions.includes(id)) {
      setSelectedQuestions(selectedQuestions.filter(q => q !== id));
    } else {
      setSelectedQuestions([...selectedQuestions, id]);
    }
  };

  const handleInitialConfirm = () => {
    setShowModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#fffefa] relative">
        {/* Header (Visual only for loading state context) */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center">
            <button onClick={onBack} className="p-2 -ml-2"><ArrowLeft size={24} className="text-[#1f2024]"/></button>
            <div className="flex-1 flex justify-center mr-8">
               <span className="font-medium text-lg text-[#1f2024]">被访企业名称</span>
               <div className="ml-1 text-[#a49a8d]">✎</div>
            </div>
        </div>
        
        <div className="w-64 h-64 relative mb-8 flex items-center justify-center">
           <Mascot size="large" />
        </div>
        
        {/* Loading Bar */}
        <div className="w-64 h-1.5 bg-[#fff3cf] rounded-[999px] overflow-hidden mb-6">
           <div 
             className="h-full rounded-[999px] animate-[width_2s_ease-in-out_infinite] bg-primary" 
             style={{ width: '50%', animationName: 'shimmer', animationDuration: '2s', animationIterationCount: 'infinite' }} 
           />
           <style>{`
             @keyframes shimmer {
               0% { transform: translateX(-100%); }
               100% { transform: translateX(200%); }
             }
           `}</style>
        </div>
        
        <p className="text-[#1f2024] font-medium tracking-wide">正在分析，请耐心等待</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#fffefa] relative">
      {/* Navbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#eadfca]/60 bg-[#fffefa] z-10">
        <button onClick={onBack} className="p-2 -ml-2"><ArrowLeft size={24} className="text-[#1f2024]"/></button>
        <h1 className="text-lg font-medium text-[#1f2024]">自动生成问题集合</h1>
        <button onClick={onBack} className="text-slate-500 text-[15px] font-medium p-2 -mr-2">取消</button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-0">
        {GENERATED_QUESTIONS.map((q) => {
           const isSelected = selectedQuestions.includes(q.id);
           return (
             <div 
                key={q.id} 
                className="flex items-start gap-3 py-4 border-b border-gray-50 last:border-0 cursor-pointer" 
                onClick={() => toggleQuestion(q.id)}
             >
                <div 
                  className={`mt-0.5 w-5 h-5 rounded-[4px] flex items-center justify-center flex-shrink-0 transition-colors duration-200 ${
                    isSelected ? 'bg-primary border-primary' : 'border-2 border-gray-300 bg-[#fffefa]'
                  }`}
                >
                   {isSelected && <Check size={14} className="text-white" strokeWidth={3} />}
                </div>
                <div className="text-[15px] text-[#1f2024] leading-relaxed font-normal">
                   {q.id}.{q.text}
                </div>
             </div>
           )
        })}
      </div>

      {/* Bottom Bar */}
      <div className="px-6 py-3 border-t border-[#eadfca]/60 flex gap-4 bg-[#fffefa] z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
         <Button 
            variant="secondary" 
            block 
            onClick={onBack} 
            className="!rounded-[999px] !border-[#eadfca] !text-slate-600 !h-12 !text-[16px]"
         >
            取消
         </Button>
         <Button 
            variant="primary" 
            block 
            onClick={handleInitialConfirm} 
            className="!rounded-[999px] !h-12 !text-[16px] shadow-[rgba(201,154,58,0.18)] bg-primary"
         >
            确认
         </Button>
      </div>

      {/* Modal Overlay */}
      {showModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] transition-opacity duration-300">
           <div className="bg-[#fffefa] rounded-[18px] w-[80%] max-w-[320px] overflow-hidden shadow-[0_18px_44px_rgba(92,74,42,0.16)] animate-[scale_0.2s_ease-out]">
              <div className="pt-6 pb-2 px-6">
                 <h3 className="text-[17px] font-medium text-center text-slate-900 mb-6">选择存放清单</h3>
                 <div className="space-y-5 mb-4">
                    {['招商', '信贷', '投资'].map(opt => (
                       <label key={opt} className="flex items-center justify-between cursor-pointer group" onClick={() => setStorageCategory(opt)}>
                          <span className="text-[15px] text-[#4f463b] font-medium">{opt}</span>
                          <div className={`w-5 h-5 rounded-[999px] flex items-center justify-center border transition-colors ${
                             storageCategory === opt ? 'border-primary bg-primary' : 'border-gray-300 group-hover:border-gray-400'
                          }`}>
                             {storageCategory === opt && <Check size={12} className="text-white" strokeWidth={3} />}
                          </div>
                       </label>
                    ))}
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-3 px-6 pb-6 mt-2">
                 <Button 
                    variant="secondary"
                    className="!rounded-[999px] !h-10 !text-[15px] border-[#eadfca]"
                    onClick={() => setShowModal(false)}
                 >
                    取消
                 </Button>
                 <Button 
                    variant="primary"
                    className="!rounded-[999px] !h-10 !text-[15px] bg-primary"
                    onClick={onConfirm}
                 >
                    确认
                 </Button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AiGenerationPage;
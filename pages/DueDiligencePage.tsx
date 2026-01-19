import React, { useState, useEffect } from 'react';
import { ArrowLeft, Pencil, Mic, ChevronRight, FilePlus, Camera, Image as ImageIcon, FileText } from 'lucide-react';
import { Toast } from 'react-vant';
import Mascot from '../components/Mascot';
import { COLORS } from '../constants';
import { DealRecord } from '../types';
import { dealService } from '../services/dealService';

interface DueDiligencePageProps {
  deal: DealRecord | null;
  onBack: () => void;
  onNavigateToRecording: () => void;
  onNavigateToMaterials: () => void;
  onNavigateToQuestions?: () => void;
  onEditInfo?: () => void;
  onChangeTemplate?: () => void;
  onDealDetailLoaded?: (detail: DealRecord) => void;
}

const DueDiligencePage: React.FC<DueDiligencePageProps> = ({ 
  deal,
  onBack, 
  onNavigateToRecording,
  onNavigateToMaterials,
  onNavigateToQuestions,
  onEditInfo,
  onChangeTemplate,
  onDealDetailLoaded
}) => {
  const basePath = import.meta.env.BASE_URL || '/';
  // 详情数据
  const [dealDetail, setDealDetail] = useState<DealRecord | null>(null);
  
  // 使用 ref 保存回调，避免依赖变化导致重复请求
  const onDealDetailLoadedRef = React.useRef(onDealDetailLoaded);
  onDealDetailLoadedRef.current = onDealDetailLoaded;

  // 进入页面时请求详情（只在 deal.id 变化时请求）
  useEffect(() => {
    const fetchDealDetail = async () => {
      if (!deal?.id) return;
      
      try {
        const res = await dealService.getDealInstDetail(deal.id);
        if (res.success && res.data) {
          setDealDetail(res.data);
          // 通知父组件更新数据
          onDealDetailLoadedRef.current?.(res.data);
        }
      } catch (error) {
        console.error('Failed to fetch deal detail:', error);
      }
    };
    
    fetchDealDetail();
  }, [deal?.id]);

  // 使用详情数据，如果没有则使用传入的 deal
  const currentDeal = dealDetail || deal;
  const isFinishedInterview = currentDeal?.status === '4';

  // 引用隐藏的 input 元素
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const galleryInputRef = React.useRef<HTMLInputElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleUploadClick = (id: string) => {
    switch (id) {
      case 'camera':
        cameraInputRef.current?.click();
        break;
      case 'gallery':
        galleryInputRef.current?.click();
        break;
      case 'file':
        fileInputRef.current?.click();
        break;
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    if (!currentDeal?.id) {
      Toast.fail('未找到尽调实例');
      return;
    }

    const file = files[0];
    try {
      Toast.loading({ message: '上传中...', duration: 0 });
      const res = await dealService.uploadDealMaterial(currentDeal.id, file);
      Toast.clear();

      if (res.success) {
        Toast.success('上传成功');
      } else {
        Toast.fail(res.message || '上传失败');
      }
    } catch (error) {
      Toast.clear();
      console.error('Upload failed:', error);
      Toast.fail('上传失败');
    }
    
    // 清空 input 以便再次选择同一文件
    e.target.value = '';
  };

  const uploadOptions = [
    { id: 'camera', label: '相机', icon: Camera },
    { id: 'gallery', label: '相册', icon: ImageIcon },
    { id: 'file', label: '文件', icon: FileText },
  ];
  return (
    <div className="flex flex-col min-h-screen bg-[#F7F8FA] relative">
      {/* 隐藏的文件输入框 */}
      <input 
        type="file" 
        ref={cameraInputRef} 
        accept="image/*" 
        capture="environment" 
        className="hidden" 
        onChange={handleFileChange}
      />
      <input 
        type="file" 
        ref={galleryInputRef} 
        accept="image/*" 
        className="hidden" 
        onChange={handleFileChange}
      />
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleFileChange}
      />

      {/* Background Gradient for Top Section */}
      <div 
        className="absolute top-0 left-0 right-0 h-[400px] z-0 pointer-events-none"
        style={{
          background: `linear-gradient(180deg, ${COLORS.backgroundStart} 0%, rgba(247,248,250,0) 100%)`
        }}
      />

      {/* NavBar */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-700 hover:bg-white/50 rounded-full">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-slate-800">{currentDeal?.interviewCust || '尽调详情'}</h1>
        <button 
          onClick={onEditInfo}
          className="p-2 -mr-2 text-slate-700 hover:bg-white/50 rounded-full"
        >
          <Pencil size={20} />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-8 relative z-10 space-y-4">
        
        {/* Status Bar / Mascot Message */}
        <div className="flex items-end mt-2 mb-4 relative">
          <div className="w-16 h-16 mr-3 flex-shrink-0 relative z-20">
            <Mascot size="small" />
          </div>
          
          <div className="bg-white rounded-tr-2xl rounded-br-2xl rounded-bl-2xl p-3 shadow-sm relative z-10 flex-1 mb-2">
            <p className="text-sm text-slate-700 font-medium">
              {isFinishedInterview 
                ? '本次访谈已完成，可查看历史记录或生成报告' 
                : '记录创建成功，赶紧开始访谈吧...'}
            </p>
          </div>
        </div>

        {/* Advice Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-slate-900 font-bold text-[16px] mb-3">尽调建议</h2>
          <p className="text-slate-600 text-sm leading-relaxed text-justify">
            A公司2024年营收显著下滑，建议深入考察其经营层面。上传流水，可获更详尽的专项分析。
          </p>
        </div>

        {/* Report Card */}
        <div className="rounded-3xl p-5 shadow-lg relative overflow-hidden text-white" 
             style={{ background: 'linear-gradient(135deg, #4E3EF8 0%, #7062ff 100%)' }}>
          <div className="relative z-10 max-w-[65%]">
            <h2 className="text-xl font-bold mb-1.5">尽调报告</h2>
            <p className="text-white text-xs mb-4 font-light">访谈既报告，洞察更高效。小狸智能捕捉核心要点。</p>
            
            <div className="flex gap-3">
              <button className="px-4 py-2 bg-white text-indigo-600 rounded-full text-sm font-bold shadow-md active:scale-95 transition-transform">
                立即生成
              </button>
              <button 
                className="px-4 py-2 bg-transparent border border-white/40 text-white rounded-full text-sm font-medium hover:bg-white/10 active:scale-95 transition-transform"
                onClick={onChangeTemplate}
              >
                更换模板
              </button>
            </div>
          </div>

          {/* Rocket Mascot Image */}
          <div className="absolute right-1 top-1/2 -translate-y-1/2 mt-[20px] w-36 h-36">
            <img 
               src={`${basePath}assets/rocketxiaoli.png`}
               alt="Rocket Mascot"
               className="w-full h-full object-contain drop-shadow-2xl"
            />
          </div>
          {/* Decorative circles */}
          <div className="absolute top-[-20px] right-[-20px] w-20 h-20 bg-white/10 rounded-full blur-xl" />
          <div className="absolute bottom-[-10px] left-[30%] w-16 h-16 bg-white/10 rounded-full blur-lg" />
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Materials */}
          <div 
            className="bg-white rounded-2xl p-4 shadow-sm flex flex-col justify-between min-h-[140px] cursor-pointer active:scale-[0.98] transition-all"
            onClick={onNavigateToMaterials}
          >
            <div>
               <h3 className="font-bold text-slate-800 text-[16px]">尽调资料</h3>
               <p className="text-xs text-gray-400 mt-1">AI智能解析</p>
            </div>
            
            <div className="flex items-center justify-between mt-4">
               <div className="flex gap-2">
                 {uploadOptions.map(opt => (
                   <button 
                    key={opt.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUploadClick(opt.id);
                    }}
                    className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-slate-500 active:bg-gray-100 transition-colors"
                   >
                     <opt.icon size={16} strokeWidth={2} />
                   </button>
                 ))}
               </div>
               <FilePlus className="text-gray-300 w-8 h-8 opacity-50" strokeWidth={1.5} />
            </div>
          </div>

          {/* Recording */}
          <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-col justify-between min-h-[140px]">
             <div>
               <h3 className="font-bold text-slate-800 text-[16px]">访谈录音</h3>
               <p className="text-xs text-gray-400 mt-1">AI智能转写</p>
            </div>

            <div className="flex items-end justify-between mt-4">
               <button 
                onClick={onNavigateToRecording}
                className="px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold border border-indigo-100"
               >
                 +访谈录音
               </button>
               <Mic className="text-indigo-200 w-10 h-10" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        {/* Questions Cell */}
        {(() => {
          const questionList = currentDeal?.questionInfoList || [];
          const totalCount = questionList.length;
          const checkedCount = questionList.filter((q) => q.CHECKED === true).length;
          return (
            <div 
              className="bg-white rounded-2xl p-5 shadow-sm flex items-center justify-between active:bg-gray-50 transition-colors cursor-pointer"
              onClick={onNavigateToQuestions}
            >
              <span className="font-bold text-slate-800">问题集合 {checkedCount}/{totalCount}</span>
              <ChevronRight className="text-gray-300" size={20} />
            </div>
          );
        })()}

      </div>
    </div>
  );
};

export default DueDiligencePage;
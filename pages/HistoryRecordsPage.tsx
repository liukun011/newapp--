import React, { useEffect, useState } from 'react';
import { ArrowLeft, Edit2 } from 'lucide-react';
import { Dialog, Toast } from 'react-vant';
import Button from '../components/Button';
import Mascot from '../components/Mascot';
import { dealService } from '../services/dealService';

interface HistoryRecordsPageProps {
  onBack: () => void;
  onStartInterview: () => void;
  dealId?: string;
  onRecordClick?: (record: any) => void;
}

const HistoryRecordsPage: React.FC<HistoryRecordsPageProps> = ({ onBack, onStartInterview, dealId, onRecordClick }) => {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const basePath = import.meta.env.BASE_URL || '/';
  
  // 编辑相关状态
  const [editDialogVisible, setEditDialogVisible] = useState(false);
  const [currentEditId, setCurrentEditId] = useState('');
  const [currentEditTitle, setCurrentEditTitle] = useState('');
  const [currentEditCustom, setCurrentEditCustom] = useState('');

  const fetchRecords = async () => {
    if (!dealId) return;
    setLoading(true);
    try {
      const res = await dealService.queryInterviewInstListByPage({
          interviewDealInstId: dealId
      });
      if (res.success && res.data) {
          setRecords(res.data.records || []);
      }
    } catch (error) {
      console.error("Fetch history failed", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line
  }, [dealId]);

  const handleEditClick = (record: any) => {
    setCurrentEditId(record.interviewInstId || record.id || '');
    setCurrentEditTitle(record.interviewInstTitle || '');
    setCurrentEditCustom(record.interviewCustom || '');
    setEditDialogVisible(true);
  };

  const handleSaveTitle = async () => {
    if (!currentEditTitle.trim()) {
      Toast.info('名称不能为空');
      return;
    }
    try {
      const res = await dealService.updateInterviewInst({
        interviewInstId: currentEditId,
        interviewInstTitle: currentEditTitle,
        interviewCustom: currentEditCustom
      });
      if (res.success) {
        Toast.success('修改成功');
        setEditDialogVisible(false);
        fetchRecords(); // 刷新列表
      } else {
        Toast.fail(res.message || '修改失败');
      }
    } catch (error) {
      Toast.fail('修改失败');
    }
  };

  const formatTimeDisplay = (record: any) => {
    const beginTime = record.interviewInstBeginTime;
    if (beginTime && beginTime.length >= 12) {
      // YYYYMMDDHHMMSS -> YYYY-MM-DD HH:MM:SS
      return `${beginTime.substring(0, 4)}-${beginTime.substring(4, 6)}-${beginTime.substring(6, 8)} ${beginTime.substring(8, 10)}:${beginTime.substring(10, 12)}:${beginTime.substring(12, 14)}`;
    }
    
    if (record.lastModifiedTime) {
      return record.lastModifiedTime;
    }

    return '-';
  };

  return (
    <div className="flex flex-col h-full bg-[#F7F8FA] relative">
      {/* NavBar */}
      <div className="bg-white px-4 py-3 flex items-center justify-center relative shadow-sm z-10 shrink-0">
        <button 
          onClick={onBack} 
          className="absolute left-4 p-2 -ml-2 text-slate-700 active:scale-95 transition-transform"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-[17px] font-bold text-slate-800">历史访谈</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 scroll-smooth">
        {loading && records.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-20">
               <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
             </div>
        ) : records.length > 0 ? (
           <div className="space-y-3">
             {records.map((record) => (
               <div 
                  key={record.interviewInstId || record.id} 
                  className="bg-white p-4 rounded-xl shadow-sm border border-slate-50 active:scale-[0.99] transition-transform flex items-center gap-4 cursor-pointer"
                  onClick={() => onRecordClick?.(record)}
               >
                 
                 {/* Icon Block */}
                 <div className="w-11 h-11 shrink-0">
                    <img src={`${basePath}assets/wav.png`} alt="Recording" className="w-full h-full object-contain" />
                 </div>

                 {/* Text Info */}
                 <div className="flex-1 min-w-0">
                    <h3 className="text-slate-800 font-medium text-[15px] mb-1 truncate">
                       {record.interviewInstTitle || '访谈记录'}
                    </h3>
                    <div className="text-xs text-gray-400 font-light">
                       {formatTimeDisplay(record)}
                    </div>
                 </div>
                 
                 {/* Edit Button */}
                 <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        handleEditClick(record);
                    }}
                    className="p-2 text-gray-400 hover:text-slate-600 active:scale-90 transition-all"
                 >
                    <Edit2 size={18} strokeWidth={1.5} />
                 </button>
               </div>
             ))}
           </div>
        ) : (
          <div className="flex flex-col items-center justify-center pt-32 opacity-70">
             <div className="w-32 h-32 mb-4 opacity-30 grayscale flex items-center justify-center">
                <Mascot size="medium" /> 
             </div>
             <p className="text-[#999999] text-[15px]">暂无历史访谈记录</p>
          </div>
        )}
      </div>
      
      {/* Bottom Button */}
      {/* <div className="p-6 pb-12 w-full bg-[#F7F8FA] relative z-10 shrink-0">
         <Button 
           block 
           size="large" 
           onClick={onStartInterview} 
           className="!rounded-full !bg-[#4E3EF8] !h-[50px] !text-[16px] shadow-lg shadow-indigo-500/30"
         >
           去访谈
         </Button>
      </div> */}

      {/* Edit Dialog */}
      <Dialog
        visible={editDialogVisible}
        title="修改访谈名称"
        showCancelButton
        onConfirm={handleSaveTitle}
        onCancel={() => setEditDialogVisible(false)}
      >
        <div className="px-4 py-4">
            <input
                value={currentEditTitle}
                onChange={(e) => setCurrentEditTitle(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="请输入访谈名称"
                autoFocus
            />
        </div>
      </Dialog>
    </div>
  );
};

export default HistoryRecordsPage;

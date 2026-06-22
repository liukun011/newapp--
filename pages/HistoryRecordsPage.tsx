import React, { useEffect, useState } from 'react';
import { ArrowLeft, Edit2 } from 'lucide-react';
import { Dialog, Toast } from 'react-vant';

import Mascot from '../components/Mascot';
import { dealService } from '../services/dealService';
import { formatTime } from '../utils/dateUtils';

interface HistoryRecordsPageProps {
  onBack: () => void;
  onStartInterview: () => void;
  dealId?: string;
  onRecordClick?: (record: any) => void;
  isArchived?: boolean;
}

const HistoryRecordsPage: React.FC<HistoryRecordsPageProps> = ({ onBack, dealId, onRecordClick, isArchived = false }) => {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const basePath = import.meta.env.BASE_URL || '/';

  // 编辑相关状态
  const [editDialogVisible, setEditDialogVisible] = useState(false);
  const [currentEditId, setCurrentEditId] = useState('');
  const [currentEditTitle, setCurrentEditTitle] = useState('');
  const [currentEditCustom, setCurrentEditCustom] = useState('');

  // Polling reference
  const pollingRef = React.useRef<NodeJS.Timeout | null>(null);

  const fetchRecords = async (isPolling = false) => {
    if (!dealId) return;
    // Only show loading on initial fetch
    if (!isPolling) setLoading(true);
    
    try {
      const res = await dealService.queryInterviewInstListByPage({
        interviewDealInstId: dealId
      });
      if (res.success && res.data) {
        const list = res.data.records || [];
        setRecords(list);

        // Polling logic: check if any record is not '2'
        // Using 'recordStatus' as it matches the blocking logic at line 132. 
        // If user meant 'reportStatus', please advise, but context suggests recordStatus.
        const hasPending = list.some((item: any) => item.recordStatus !== '2');
        
        if (hasPending) {
          // Clear existing timer if any to strictly control 5s interval
          if (pollingRef.current) clearTimeout(pollingRef.current);
          
          pollingRef.current = setTimeout(() => {
            fetchRecords(true);
          }, 5000);
        }
      }
    } catch (error) {
      console.error("Fetch history failed", error);
    } finally {
      if (!isPolling) setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    return () => {
      if (pollingRef.current) {
        clearTimeout(pollingRef.current);
      }
    };
    // eslint-disable-next-line
  }, [dealId]);

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
    if (record.interviewInstBeginTime) {
      return formatTime(record.interviewInstBeginTime, true);
    }

    if (record.lastModifiedTime) {
      return formatTime(record.lastModifiedTime, true);
    }

    return '-';
  };

  return (
    <div className="flex flex-col h-full bg-[#F7FAFE] relative">
      {/* NavBar */}
      <div className="bg-[#FFFFFF] px-4 py-3 flex items-center justify-center relative shadow-[0_3px_10px_rgba(15,40,72,0.04)] z-10 shrink-0">
        <button
          onClick={onBack}
          className="absolute left-4 p-2 -ml-2 text-[#476285] active:scale-95 transition-transform"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-[17px] font-medium text-[#0F2848]">历史访谈</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 scroll-smooth">
        {loading && records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#E2EBF5] border-t-[#2563EB] rounded-[999px] animate-spin"></div>
          </div>
        ) : records.length > 0 ? (
          <div className="space-y-3">
            {records.map((record) => (
              <div
                key={record.interviewInstId || record.id}
                className="bg-[#FFFFFF] p-4 rounded-[14px] shadow-[0_3px_10px_rgba(15,40,72,0.04)] border border-[#E2EBF5]/50 active:scale-[0.99] transition-transform flex items-center gap-4 cursor-pointer"
                onClick={() => {
                  // Only allow navigation if recordStatus is '2' (Merged/Ready)
                  if (record.recordStatus !== '2') {
                    Toast.info('录音文件合并中，请稍后再查看！');
                    return;
                  }
                  onRecordClick?.(record);
                }}
              >

                {/* Icon Block */}
                <div className="w-11 h-11 shrink-0">
                  <img src={`${basePath}assets/wav.png`} alt="Recording" className="w-full h-full object-contain" />
                </div>

                {/* Text Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-[#0F2848] font-medium text-[15px] mb-1 truncate">
                    {record.interviewInstTitle || '访谈记录'}
                  </h3>
                  <div className="text-xs text-[#8AA2BF] font-light">
                    {formatTimeDisplay(record)}
                  </div>
                </div>

                {/* Edit Button */}
                {/* Edit Button - Hide if archived */}
                {!isArchived && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditClick(record);
                    }}
                    className="p-2 text-[#8AA2BF] hover:text-[#476285] active:scale-90 transition-all"
                  >
                    <Edit2 size={18} strokeWidth={1.5} />
                  </button>
                )}
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
      {/* <div className="p-6 pb-12 w-full bg-[#F7FAFE] relative z-10 shrink-0">
         <Button 
           block 
           size="large" 
           onClick={onStartInterview} 
           className="!rounded-[999px] !bg-[#2563EB] !h-[50px] !text-[16px] shadow-[0_6px_14px_rgba(37, 99, 235,0.14)]"
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
            className="w-full bg-[#F7FAFE] border border-[#E2EBF5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2563EB] transition-colors"
            placeholder="请输入访谈名称"
            autoFocus
          />
        </div>
      </Dialog>
    </div>
  );
};

export default HistoryRecordsPage;

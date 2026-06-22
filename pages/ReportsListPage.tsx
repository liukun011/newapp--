import React, { useState, useEffect } from 'react';
import { Search, FileText, Clock, Loader2 } from 'lucide-react';
import { Toast } from 'react-vant';
import { dealService } from '../services/dealService';
import { ReportRecord } from '../types';

interface ReportsListPageProps {
  onBack?: () => void;
  onPreviewReport?: (name: string, reportUrl: string, previewUrl: string, showDownloadButton?: boolean) => void;
  onViewDealDetail?: (dealId: string) => void;
}

const ReportsListPage: React.FC<ReportsListPageProps> = ({ onBack, onPreviewReport, onViewDealDetail }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch reports from API
  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        const res = await dealService.queryDealReportListByPage({
          pageNo: 1,
          pageSize: 50,
          fileName: searchQuery
        });
        
        if (res.success && res.data && res.data.records) {
          setReports(res.data.records);
        } else {
          setReports([]);
        }
      } catch (error) {
        console.error('Failed to fetch reports:', error);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchReports();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handlePreview = async (report: ReportRecord) => {
      // 复用 DueDiligencePage 的预览逻辑
      if (!onPreviewReport) return;
      
      try {
          Toast.loading({ message: '正在打开报告...', duration: 0, forbidClick: true });
          const res = await dealService.viewReportUrl(report.id, report.fileUrl);
          Toast.clear();
          
          if (res.success && res.data) {
             onPreviewReport(
                 report.fileName || '尽调报告',
                 report.fileUrl,
                 res.data,
                 true // 列表页允许下载
             );
          } else {
             Toast.fail(res.message || '打开报告失败');
          }
      } catch (error) {
          Toast.clear();
          console.error('Preview error:', error);
          Toast.fail('打开报告失败');
      }
  };

  const handleDetail = (report: ReportRecord) => {
    // 跳转到关联的尽调详情页
    if (onViewDealDetail && report.relationId) {
        onViewDealDetail(report.relationId);
    } else {
        // 如果没有关联ID (即孤儿报告)，则只能预览
        handlePreview(report);
    }
  };

  // 格式化文件名，去掉后缀和冗余信息，让标题更干净
  const formatTitle = (fileName: string) => {
    if (!fileName) return '未命名报告';
    // 去掉 .docx, .pdf 等后缀
    return fileName.replace(/\.[^/.]+$/, "");
  };

  return (
    <div className="h-screen flex flex-col xl-page">
      <div className="px-4 pt-4 pb-2 flex-shrink-0 sticky top-0 z-10 bg-[#F7FAFE]">
        <h1 className="text-[18px] font-semibold text-[#0F2848] mb-3">报告</h1>
        <div className="relative">
          <input
            type="text"
            placeholder="请搜索报告关键词"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-4 pr-10 bg-[#FFFFFF]/80 rounded-[14px] text-[13px] text-[#476285] placeholder-[#8AA2BF] border border-[#E2EBF5] shadow-[0_3px_10px_rgba(15,40,72,0.04)] focus:outline-none focus:ring-2 focus:ring-[#4C8BF5]"
          />
          <Search size={18} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[#8AA2BF]" />
        </div>
      </div>

      {/* Reports List */}
      <div className="flex-1 overflow-y-auto px-4 pt-1 pb-40 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#8AA2BF]">
            <Loader2 size={32} className="animate-spin mb-2" />
            <span className="text-xs">加载中...</span>
          </div>
        ) : (
          <>
            {reports.length > 0 ? (
              reports.map((report) => (
                <div
                  key={report.id}
                  className="xl-card px-3.5 py-3.5"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[13px] bg-[#2563EB1A] border border-[#E2EBF5] flex items-center justify-center flex-shrink-0 text-[#2563EB] shadow-[0_8px_18px_rgba(37, 99, 235,0.08)]">
                      <FileText size={18} strokeWidth={2.1} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[14.5px] font-medium text-[#0F2848] truncate leading-tight">
                        {formatTitle(report.fileName)}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[#476285] mt-1.5">
                        <Clock size={12} />
                        <span className="text-[11.5px] font-normal">
                           {report.fileCreateFinishTime 
                            ? report.fileCreateFinishTime.replace('T', ' ').substring(0, 16) 
                            : (report.lastModifiedTime || '未知时间')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handlePreview(report)}
                        onMouseDown={(e) => e.preventDefault()}
                        tabIndex={-1}
                        className="min-h-[34px] px-3 bg-[#FFFFFF]/80 border border-[#E2EBF5] text-[#2563EB] rounded-[12px] text-[11.5px] font-normal active:scale-95 transition-transform outline-none"
                      >
                        预览
                      </button>
                      <button
                        onClick={() => handleDetail(report)}
                        onMouseDown={(e) => e.preventDefault()}
                        tabIndex={-1}
                        className="min-h-[34px] px-3 bg-[#2563EB1A] border border-[#E2EBF5] text-[#2563EB] rounded-[12px] text-[11.5px] font-normal active:scale-95 transition-transform outline-none"
                      >
                        详情
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-[999px] bg-[#F7FAFE] flex items-center justify-center mx-auto mb-3">
                  <FileText size={32} className="text-[#8AA2BF]" />
                </div>
                <p className="text-[#8AA2BF] text-sm">暂无报告数据</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ReportsListPage;

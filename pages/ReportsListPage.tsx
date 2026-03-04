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
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Search Header - 外层透明(透出页面背景)，输入框白色 */}
      <div className="px-4 py-2 flex-shrink-0 sticky top-0 z-10">
        <div className="relative">
          <input
            type="text"
            placeholder="请搜索报告关键词"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-10 py-2.5 bg-white rounded-full text-sm text-gray-700 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <Search size={18} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      {/* Reports List */}
      <div className="flex-1 overflow-y-auto px-4 pt-1 pb-40 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Loader2 size={32} className="animate-spin mb-2" />
            <span className="text-xs">加载中...</span>
          </div>
        ) : (
          <>
            {reports.length > 0 ? (
              reports.map((report) => (
                <div
                  key={report.id}
                  className="bg-white rounded-xl p-4 shadow-sm"
                >
                  {/* Top Section: Icon + Title/Desc */}
                  <div className="flex items-start gap-3 mb-4">
                    {/* Icon - 大图标，带装饰背景 */}
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <FileText size={24} className="text-blue-500" />
                    </div>

                    {/* Text Content */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <h3 className="text-base font-bold text-gray-800 mb-1 line-clamp-2 leading-tight">
                        {formatTitle(report.fileName)}
                      </h3>
                      <p className="text-[13px] text-gray-400 truncate">
                        {report.dealSummary || "访谈小总结未生成，请刷新生成"}
                      </p>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-gray-100 my-3 -mx-4"></div>

                  {/* Bottom Section: Time + Actions */}
                  <div className="flex items-center justify-between">
                    {/* Timestamp */}
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <Clock size={14} />
                      <span className="text-xs font-medium">
                         {report.fileCreateFinishTime 
                          ? report.fileCreateFinishTime.replace('T', ' ').substring(0, 16) 
                          : (report.lastModifiedTime || '未知时间')}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePreview(report)}
                        onMouseDown={(e) => e.preventDefault()}
                        tabIndex={-1}
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-medium hover:bg-indigo-100 transition-colors outline-none"
                      >
                        预览报告
                      </button>
                      <button
                        onClick={() => handleDetail(report)}
                        onMouseDown={(e) => e.preventDefault()}
                        tabIndex={-1}
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-medium hover:bg-indigo-100 transition-colors outline-none"
                      >
                        查看详情
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <FileText size={32} className="text-gray-300" />
                </div>
                <p className="text-gray-400 text-sm">暂无报告数据</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ReportsListPage;

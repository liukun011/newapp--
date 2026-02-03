import React, { useState } from 'react';
import { Search, FileText, Sparkles, ChevronRight, Clock, HelpCircle } from 'lucide-react';

interface ReportsListPageProps {
  onBack?: () => void;
  onViewDetail?: (reportId: string) => void;
}

interface Report {
  id: string;
  companyName: string;
  creator: string;
  isParsed: boolean;
  timestamp: string;
}

const ReportsListPage: React.FC<ReportsListPageProps> = ({ onBack, onViewDetail }) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data - 后续可以从API获取
  const reports: Report[] = [
    {
      id: '1',
      companyName: '百度(中国)',
      creator: '李总',
      isParsed: true,
      timestamp: '1小时前'
    },
    {
      id: '2',
      companyName: '腾讯科技',
      creator: '张经理',
      isParsed: true,
      timestamp: '2天前'
    },
    {
      id: '3',
      companyName: '字节跳动',
      creator: '赵主管',
      isParsed: true,
      timestamp: '4天前'
    },
    {
      id: '4',
      companyName: '小米集团',
      creator: '赵总',
      isParsed: true,
      timestamp: '3天前'
    }
  ];

  const filteredReports = reports.filter(report =>
    report.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.creator.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-screen flex flex-col bg-gray-50 pb-20">
      {/* Header - Fixed */}
      <div className="bg-white px-6 pt-12 pb-6 flex-shrink-0">
        <h1 className="text-2xl font-bold text-slate-800 mb-1">AI报告库</h1>
        <p className="text-xs text-gray-400 tracking-wider">GENERATED REPORTS</p>
      </div>

      {/* Search Bar - Fixed */}
      <div className="px-6 py-4 bg-white flex-shrink-0">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索报告关键词..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-gray-50 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* History Link - Fixed */}
      <div className="px-6 py-4 flex items-center justify-between flex-shrink-0 bg-gray-50">
        <span className="text-sm text-gray-400">全部历史报告</span>
        <button className="p-1 hover:bg-gray-100 rounded-full transition-colors">
          <HelpCircle size={18} className="text-gray-300" />
        </button>
      </div>

      {/* Reports List - Scrollable */}
      <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50">
        <div className="space-y-3">
        {filteredReports.length > 0 ? (
          filteredReports.map((report) => (
            <div
              key={report.id}
              className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Top Section */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3 flex-1">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <FileText size={20} className="text-indigo-500" />
                  </div>

                  {/* Company and Creator */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-slate-800 mb-1 truncate">
                      {report.companyName}
                    </h3>
                    <p className="text-sm text-gray-500">{report.creator}</p>
                  </div>
                </div>

                {/* AI Parsed Badge */}
                {report.isParsed && (
                  <div className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 rounded-lg flex-shrink-0">
                    <Sparkles size={14} className="text-blue-500" />
                    <span className="text-xs font-medium text-blue-500">AI已解析</span>
                  </div>
                )}
              </div>

              {/* Bottom Section */}
              <div className="flex items-center justify-between">
                {/* Timestamp */}
                <div className="flex items-center gap-1 text-gray-400">
                  <Clock size={14} />
                  <span className="text-xs">{report.timestamp}</span>
                </div>

                {/* View Details Button */}
                <button
                  onClick={() => onViewDetail?.(report.id)}
                  className="flex items-center gap-1 text-primary font-medium text-sm hover:gap-2 transition-all"
                >
                  <span>查看详情</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <FileText size={32} className="text-gray-300" />
            </div>
            <p className="text-gray-400 text-sm">未找到相关报告</p>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default ReportsListPage;

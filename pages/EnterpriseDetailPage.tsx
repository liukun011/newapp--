import React from 'react';
import { ArrowLeft, Building2, ShieldCheck } from 'lucide-react';

interface EnterpriseDetailPageProps {
  data: any;
  onBack: () => void;
}

const EnterpriseDetailPage: React.FC<EnterpriseDetailPageProps> = ({ data, onBack }) => {
  const info = data?.enterpriseInfo || {};
  
  // 解析 basicInfo JSON 字符串
  let parsedBasic: any = {};
  try {
    if (info.basicInfo) {
      const raw = JSON.parse(info.basicInfo);
      parsedBasic = raw.result || {};
    }
  } catch (e) {
    console.error('Failed to parse basicInfo JSON:', e);
  }

  // 格式化日期
  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    try {
      const date = new Date(timestamp);
      return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
    } catch {
      return '-';
    }
  };

  // 企业概况字段
  const overviewItems = [
    { label: '企业名称', value: parsedBasic.name || info.name || '-' },
    { label: '企业状态', value: parsedBasic.regStatus || '-' },
    { label: '法定代表人', value: parsedBasic.legalPersonName || '-' },
    { label: '统一社会信用代码', value: parsedBasic.creditCode || info.creditCode || '-' },
    { label: '注册资本', value: parsedBasic.regCapital || '-' },
    { label: '成立日期', value: formatDate(parsedBasic.estiblishTime) },
    { label: '所属行业', value: parsedBasic.industry || '-' },
    { label: '人员规模', value: parsedBasic.staffNumRange || '-' },
    { label: '注册地址', value: parsedBasic.regLocation || '-' },
  ];

  // 抓取结果明细字段
  const detailItems = [
    { label: '公司类型', value: parsedBasic.companyOrgType || '-' },
    { label: '股票简称', value: parsedBasic.bondName || '暂无' },
    { label: '股票代码', value: parsedBasic.bondNum || '暂无' },
    { label: '登记机关', value: parsedBasic.regInstitute || '-' },
    { label: '注册号', value: parsedBasic.regNumber || '-' },
    { label: '组织机构代码', value: parsedBasic.orgNumber || '-' },
    { label: '核准日期', value: formatDate(parsedBasic.approvedTime) },
    { 
      label: '曾用名', 
      value: (() => {
        const rawNames = parsedBasic.historyNames || parsedBasic.historyNameList;
        if (Array.isArray(rawNames)) {
          return rawNames.map((n: any) => typeof n === 'string' ? n : (n.Name || n.name || '')).filter(Boolean).join('; ') || '暂无';
        }
        return typeof rawNames === 'string' ? rawNames : '暂无';
      })()
    },
  ];

  const renderSection = (title: string, icon: React.ReactNode, items: { label: string, value: string }[]) => (
    <div className="bg-white rounded-[16px] p-3 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100/50 mb-3">
      <div className="flex items-center gap-1.5 mb-3 px-1">
        <div className="text-blue-500 scale-90">{icon}</div>
        <h2 className="text-[13px] font-bold text-slate-800">{title}</h2>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {items.map((item, index) => {
          const isFullWidth = item.label === '企业名称' || item.label === '注册地址' || item.label === '统一社会信用代码' || item.label === '登记机关' || item.label === '曾用名' || item.label === '公司类型';
          return (
            <div 
              key={index} 
              className={`bg-[#F8FAFC] rounded-[10px] p-2.5 border border-white flex flex-col gap-0.5 ${isFullWidth ? 'col-span-2' : 'col-span-1'}`}
            >
              <div className="text-[10px] text-[#94A3B8] font-bold tracking-tight">{item.label}</div>
              <div className="text-[12px] font-[800] text-slate-700 leading-tight break-all">
                {item.value}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-[#F7F8FA] w-full max-w-md mx-auto relative shadow-2xl">
      {/* Header */}
      <div className="bg-white px-4 pt-3 pb-2.5 flex items-center border-b border-gray-100 shadow-sm relative z-20 shrink-0">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-700 active:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 text-center pr-8">
          <h1 className="text-[15px] font-bold text-slate-800">企查查资料</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-10">
        {renderSection('企业概况', <Building2 size={16} />, overviewItems)}
        {renderSection('抓取结果明细', <ShieldCheck size={16} />, detailItems)}
      </div>
    </div>
  );
};

export default EnterpriseDetailPage;

import React from 'react';
import { ArrowLeft, Building2, ShieldCheck, History } from 'lucide-react';

const fallbackBasic = {
  name: '杭州云杉智能科技有限公司',
  creditCode: '91330100MA2MOCK001',
  regStatus: '存续',
  legalPersonName: '王明远',
  regCapital: '3000万人民币',
  estiblishTime: '2019-04-12',
  industry: '软件和信息技术服务业',
  staffNumRange: '100-299人',
  regLocation: '浙江省杭州市西湖区 mock 路 88 号',
  companyOrgType: '有限责任公司',
  regInstitute: '杭州市市场监督管理局',
  regNumber: '330100MOCK001',
  orgNumber: 'MA2MOCK001',
  approvedTime: '2026-05-20',
  historyNames: ['杭州云杉数据科技有限公司'],
};

const fallbackEnterpriseData = {
  ...fallbackBasic,
  basicInfo: JSON.stringify({ result: fallbackBasic }),
  equityChange: JSON.stringify({
    result: {
      items: [
        {
          investor_name: '小狸产业基金',
          change_time: '2025-12-18',
          ratio_before: '12%',
          ratio_after: '18%',
        },
        {
          investor_name: '创始团队持股平台',
          change_time: '2025-06-30',
          ratio_before: '46%',
          ratio_after: '42%',
        },
      ],
    },
  }),
};

interface EnterpriseDetailPageProps {
  data: any;
  onBack: () => void;
}

const EnterpriseDetailPage: React.FC<EnterpriseDetailPageProps> = ({ data, onBack }) => {
  const info = data && Object.keys(data).length > 0 ? data : fallbackEnterpriseData;
  
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

  // 解析 equityChange JSON 字符串
  let parsedEquityChanges: any[] = [];
  try {
    const rawEquity = info?.equityChange || parsedBasic?.equityChange;
    if (rawEquity) {
      const parsed = typeof rawEquity === 'string' ? JSON.parse(rawEquity) : rawEquity;
      parsedEquityChanges = parsed?.result?.items || parsed?.items || (Array.isArray(parsed) ? parsed : []);
    }
  } catch (e) {
    console.error('Failed to parse equityChange JSON:', e);
  }

  // 辅助：处理变更时间的格式化
  const formatChangeDate = (val: any) => {
    if (!val) return '-';
    // 如果是毫秒数时间戳
    if (typeof val === 'number') {
      const d = new Date(val);
      return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
    }
    return val;
  };

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
    <div className="bg-[#FFFFFF] rounded-[16px] p-3 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-[#E2EBF5]/60 mb-3">
      <div className="flex items-center gap-1.5 mb-3 px-1">
        <div className="text-[#2563EB] scale-90">{icon}</div>
        <h2 className="text-[13px] font-medium text-[#0F2848]">{title}</h2>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {items.map((item, index) => {
          const isFullWidth = item.label === '企业名称' || item.label === '注册地址' || item.label === '统一社会信用代码' || item.label === '登记机关' || item.label === '曾用名' || item.label === '公司类型';
          return (
            <div 
              key={index} 
              className={`bg-[#FFFFFF] rounded-[10px] p-2.5 border border-white flex flex-col gap-0.5 ${isFullWidth ? 'col-span-2' : 'col-span-1'}`}
            >
              <div className="text-[10px] text-[#8AA2BF] font-medium tracking-tight">{item.label}</div>
              <div className="text-[12px] font-medium text-[#476285] leading-tight break-all">
                {item.value}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-[#F7FAFE] w-full max-w-md mx-auto relative shadow-[0_18px_44px_rgba(15,40,72,0.16)]">
      {/* Header */}
      <div className="bg-[#FFFFFF] px-4 pt-3 pb-2.5 flex items-center border-b border-[#E2EBF5]/60 shadow-[0_3px_10px_rgba(15,40,72,0.04)] relative z-20 shrink-0">
        <button onClick={onBack} className="p-2 -ml-2 text-[#476285] active:bg-[#F7FAFE] rounded-[999px] transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 text-center pr-8">
          <h1 className="text-[15px] font-medium text-[#0F2848]">企查查资料</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-10">
        {renderSection('企业概况', <Building2 size={16} />, overviewItems)}

        {/* 股权变更明细 */}
        <div className="bg-[#FFFFFF] rounded-[16px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-[#E2EBF5]/60 mb-3">
          <div className="flex items-center gap-1.5 mb-4 px-1">
            <div className="text-[#2563EB] scale-90"><History size={16} /></div>
            <h2 className="text-[13px] font-medium text-[#0F2848]">股权变更明细</h2>
          </div>
          <div className="flex flex-col gap-3">
            {parsedEquityChanges.length > 0 ? (
              parsedEquityChanges.map((change, idx) => (
                <div key={idx} className="bg-[#FFFFFF] rounded-[10px] p-3 border border-white flex flex-col gap-2">
                   {/* 第一行：投资人 + 日期 */}
                   <div className="flex justify-between items-start">
                     <div className="text-[12px] font-semibold text-[#0F2848]">{change.investor_name || '股权变更'}</div>
                     <div className="text-[10px] text-[#8AA2BF] font-medium">{formatChangeDate(change.change_time)}</div>
                   </div>
                   {/* 两栏：变更前 vs 变更后 */}
                   <div className="grid grid-cols-2 gap-3 mt-1 pt-2 border-t border-[#E2EBF5]/70">
                     <div className="flex flex-col gap-1">
                        <div className="text-[9px] font-medium text-[#8AA2BF] uppercase tracking-tighter">持股比例(前)</div>
                        <div className="text-[12px] text-[#476285] font-medium">{change.ratio_before || '-'}</div>
                     </div>
                     <div className="flex flex-col gap-1">
                        <div className="text-[9px] font-medium text-[#2563EB] uppercase tracking-tighter">持股比例(后)</div>
                        <div className="text-[13px] text-[#2563EB] font-semibold">{change.ratio_after || '-'}</div>
                     </div>
                   </div>
                </div>
              ))
            ) : (
              <div className="bg-[#FFFFFF] rounded-[10px] p-6 border border-dashed border-[#E2EBF5] flex flex-col items-center justify-center text-[#8AA2BF]">
                <div className="text-[12px] font-medium">暂无股权变更数据</div>
              </div>
            )}
          </div>
        </div>

        {renderSection('抓取结果明细', <ShieldCheck size={16} />, detailItems)}
      </div>
    </div>
  );
};

export default EnterpriseDetailPage;

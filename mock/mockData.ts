import {
  DealRecord,
  DealReportStatusEnum,
  DealStatusEnum,
  QuestionInfo,
  ReportRecord,
  SummaryStatusEnum,
  TemplateEnabledStatus,
  TemplateTypeEnum,
} from '../types';
import { ReportTemplate } from '../services/templateService';

const asset = (name: string) => `${import.meta.env.BASE_URL || '/'}assets/${name}`;

export const mockPreviewHtml = (title: string, body: string) => {
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title}</title>
  <style>
    body{margin:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#0f172a}
    main{max-width:760px;margin:0 auto;padding:28px 22px 56px}
    section{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:22px;box-shadow:0 12px 36px rgba(15,23,42,.06)}
    h1{font-size:22px;margin:0 0 12px}
    h2{font-size:16px;margin:22px 0 8px}
    p,li{font-size:14px;line-height:1.75;color:#334155}
    .tag{display:inline-flex;margin-bottom:14px;padding:4px 9px;border-radius:999px;background:#eef2ff;color:#4f46e5;font-size:12px;font-weight:700}
  </style>
</head>
<body>
  <main>
    <section>
      <span class="tag">离线原型预览</span>
      <h1>${title}</h1>
      ${body}
      <h2>结论摘要</h2>
      <ul>
        <li>企业经营指标整体稳定，现金流与订单储备具备持续性。</li>
        <li>建议重点关注应收账款账龄、核心客户集中度与研发投入转化效率。</li>
        <li>本预览由离线 mock 数据生成，适用于原型演示。</li>
      </ul>
    </section>
  </main>
</body>
</html>`;

  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
};

const textResource = (title: string, body: string) =>
  `data:text/plain;charset=utf-8,${encodeURIComponent(`${title}\n\n${body}`)}`;

export const mockUser = {
  userId: 'mock-user-001',
  id: 'mock-user-001',
  username: 'xiaoli.demo',
  nickName: '小狸演示用户',
  mobile: '13800000000',
  avatar: asset('xiaoliavatar.png'),
  tenantId: 'tenant-001',
  tenantName: '小狸科技官方',
  isTenantAdmin: true,
};

export const mockTenants = [
  { id: 'tenant-001', name: '小狸科技官方', isTenantAdmin: true, tenantAdmin: true, createdBy: 'mock-user-001' },
  { id: 'tenant-002', name: '华东金融事业部', isTenantAdmin: true, tenantAdmin: true, createdBy: 'mock-user-001' },
  { id: 'tenant-003', name: '创新业务孵化组', isTenantAdmin: true, tenantAdmin: true, createdBy: 'mock-user-001' },
];

export const mockMembers = [
  {
    id: 'mock-user-001',
    username: '小狸演示用户',
    mobile: '13800000000',
    avatar: asset('xiaoliavatar.png'),
    isTenantAdmin: true,
    createdTime: '2026-05-16T09:20:00',
  },
  {
    id: 'mock-user-002',
    username: '陈晓晨',
    mobile: '13900001111',
    avatar: '',
    isTenantAdmin: false,
    createdTime: '2026-05-18T14:12:00',
  },
  {
    id: 'mock-user-003',
    username: '李若宁',
    mobile: '13700002222',
    avatar: '',
    isTenantAdmin: false,
    createdTime: '2026-05-22T10:45:00',
  },
];

export const mockQuestionTemplates = [
  {
    id: 'question-template-001',
    templateName: '信贷尽调标准清单',
    templateType: TemplateTypeEnum.PRESET,
    businessId: 'credit',
    templateDesc: '覆盖经营、财务、风控、担保与还款来源。',
    templateStatus: '1',
    recStatus: 'A',
    createUser: 'system',
    questionList: [
      '企业主营业务和核心收入来源是什么？',
      '近三年营业收入和净利润变化原因是什么？',
      '主要客户和供应商集中度是否偏高？',
      '本次融资用途和第一还款来源是什么？',
    ].map((questionName, index): QuestionInfo => ({
      id: `qt-001-q-${index + 1}`,
      questionName,
      questionIndex: index + 1,
      questionAnswer: index < 2 ? '已根据访谈和资料形成初步回答。' : null,
      questionAnswerTime: index < 2 ? '2026-06-06 15:20:00' : null,
      questionStatus: index < 2 ? '2' : '1',
      templateId: 'question-template-001',
      recStatus: 'A',
    })),
  },
  {
    id: 'question-template-002',
    templateName: '投资价值分析清单',
    templateType: TemplateTypeEnum.PERSONAL,
    businessId: 'investment',
    templateDesc: '适合股权投资、并购前期判断和赛道研究。',
    templateStatus: '1',
    recStatus: 'A',
    createUser: 'mock-user-001',
    questionList: [
      '公司所在市场规模与增速如何？',
      '核心产品是否有可持续差异化？',
      '团队履历和组织能力是否支撑扩张？',
    ].map((questionName, index): QuestionInfo => ({
      id: `qt-002-q-${index + 1}`,
      questionName,
      questionIndex: index + 1,
      questionAnswer: null,
      questionAnswerTime: null,
      questionStatus: '1',
      templateId: 'question-template-002',
      recStatus: 'A',
    })),
  },
];

export const mockReportTemplates: ReportTemplate[] = [
  {
    id: 'report-template-001',
    businessId: 'credit',
    centerUserId: null,
    dealInstId: null,
    dealInstTitle: null,
    outTemplateId: 'out-template-001',
    viewTemplateUrl: mockPreviewHtml('信贷尽调报告模板', '<p>本模板适合银行、担保、小贷等场景的客户尽职调查报告。</p>'),
    questionId: 1,
    recStatus: 'A',
    reportTemplateName: '信贷尽调报告模板',
    reportTemplateStatus: '1',
    isEnabled: TemplateEnabledStatus.ENABLED,
    businessType: '信贷尽调',
    reportTemplateDesc: '包含企业概况、经营分析、财务分析、风险判断和授信建议。',
    createUser: 1,
    lastModifiedDate: '2026-06-01 10:00:00',
  },
  {
    id: 'report-template-002',
    businessId: 'investment',
    centerUserId: null,
    dealInstId: null,
    dealInstTitle: null,
    outTemplateId: 'out-template-002',
    viewTemplateUrl: mockPreviewHtml('投资价值分析模板', '<p>用于快速沉淀投资亮点、风险点、估值假设和后续尽调任务。</p>'),
    questionId: 2,
    recStatus: 'A',
    reportTemplateName: '投资价值分析模板',
    reportTemplateStatus: '1',
    isEnabled: TemplateEnabledStatus.ENABLED,
    businessType: '投资价值分析',
    reportTemplateDesc: '聚焦赛道、产品、团队、商业模式与财务质量。',
    createUser: 1,
    lastModifiedDate: '2026-06-03 16:30:00',
  },
  {
    id: 'report-template-003',
    businessId: 'digital',
    centerUserId: null,
    dealInstId: null,
    dealInstTitle: null,
    outTemplateId: 'out-template-003',
    viewTemplateUrl: mockPreviewHtml('数字化转型诊断模板', '<p>面向企业数字化成熟度诊断和改造路径建议。</p>'),
    questionId: 3,
    recStatus: 'A',
    reportTemplateName: '数字化转型诊断模板',
    reportTemplateStatus: '1',
    isEnabled: TemplateEnabledStatus.ENABLED,
    businessType: '数字化转型诊断',
    reportTemplateDesc: '覆盖组织、流程、数据、系统与业务价值闭环。',
    createUser: 1,
    lastModifiedDate: '2026-06-04 11:18:00',
  },
];

const makeQuestions = (templateId: string) =>
  (mockQuestionTemplates.find((item) => item.id === templateId)?.questionList || mockQuestionTemplates[0].questionList).map(
    (question, index) => ({
      ...question,
      id: `${templateId}-deal-question-${index + 1}`,
      templateId,
      questionIndex: index + 1,
    })
  );

export const mockDeals: DealRecord[] = [
  {
    id: 'deal-001',
    interviewCust: '杭州云杉智能科技有限公司',
    logo: asset('homebeginimg.png'),
    progress: '78',
    status: String(DealStatusEnum.END),
    calculation: null,
    interviewDealAbstract: null,
    interviewInstList: [],
    questionId: 'question-template-001',
    questionInfoList: makeQuestions('question-template-001'),
    report: {
      id: 'report-001',
      fileName: '杭州云杉智能科技有限公司信贷尽调报告.docx',
      fileUrl: mockPreviewHtml('杭州云杉智能科技有限公司信贷尽调报告', '<p>基于访谈记录、经营资料和财务摘要形成的 mock 报告预览。</p>'),
    },
    reportStatus: DealReportStatusEnum.REPORT_GENERATED,
    reportTemplate: mockReportTemplates[0],
    resources: [
      {
        id: 'resource-001',
        fileName: '2025年度审计报告.pdf',
        fileUrl: textResource('2025年度审计报告', '资产负债率保持在合理区间，经营性现金流持续为正。'),
        type: 'pdf',
        status: '3',
        progress: 1,
        fileStatus: '3',
        createDate: '2026-06-01 09:12:00',
        lastModifiedTime: '2026-06-01 09:12:00',
        relationId: 'deal-001',
        matchNum: 8,
        total: 10,
        finishTime: '2026-06-01 09:15:00',
        fileCreateFinishTime: '2026-06-01 09:15:00',
        fileTags: ['财务资料', '已解析'],
      },
      {
        id: 'resource-002',
        fileName: '主要客户合同清单.xlsx',
        fileUrl: textResource('主要客户合同清单', '前五大客户贡献收入占比 42%，单一客户依赖度可控。'),
        type: 'excel',
        status: '3',
        progress: 1,
        fileStatus: '3',
        createDate: '2026-06-02 14:20:00',
        lastModifiedTime: '2026-06-02 14:20:00',
        relationId: 'deal-001',
        matchNum: 6,
        total: 9,
        finishTime: '2026-06-02 14:22:00',
        fileCreateFinishTime: '2026-06-02 14:22:00',
        fileTags: ['经营资料'],
      },
    ],
    supplementary: [
      {
        id: 'supplement-001',
        fileName: '访谈补充说明.txt',
        fileUrl: textResource('访谈补充说明', '管理层补充说明：新增订单主要来自华东区域渠道。'),
        type: '4',
        status: '3',
        progress: 1,
        fileStatus: '3',
        createDate: '2026-06-03 18:12:00',
        lastModifiedTime: '2026-06-03 18:12:00',
        relationId: 'deal-001',
        matchNum: 0,
        total: 0,
        finishTime: null,
        fileCreateFinishTime: null,
      },
    ],
    templateId: 'report-template-001',
    dealSummary: '企业主营业务清晰，订单储备和现金流表现较稳，需持续关注应收账款周转和客户集中度。',
    summaryStatus: SummaryStatusEnum.GENERATED,
    lastModifiedDate: '2026-06-06 16:45:00',
    companyName: '杭州云杉智能科技有限公司',
    creditCode: '91330100MA2MOCK001',
  },
  {
    id: 'deal-002',
    interviewCust: '上海澜舟新能源材料股份有限公司',
    logo: asset('rocketxiaoli.png'),
    progress: '45',
    status: String(DealStatusEnum.INTERVIEW),
    calculation: null,
    interviewDealAbstract: null,
    interviewInstList: [],
    questionId: 'question-template-002',
    questionInfoList: makeQuestions('question-template-002'),
    report: null,
    reportStatus: DealReportStatusEnum.REPORT_NOT_GENERATED,
    reportTemplate: mockReportTemplates[1],
    resources: [
      {
        id: 'resource-003',
        fileName: '融资 BP.pdf',
        fileUrl: textResource('融资 BP', '公司计划扩建中试线，目标客户为动力电池和储能系统厂商。'),
        type: 'pdf',
        status: '3',
        progress: 1,
        fileStatus: '3',
        createDate: '2026-06-05 11:05:00',
        lastModifiedTime: '2026-06-05 11:05:00',
        relationId: 'deal-002',
        matchNum: 4,
        total: 7,
        finishTime: '2026-06-05 11:08:00',
        fileCreateFinishTime: '2026-06-05 11:08:00',
      },
    ],
    supplementary: [],
    templateId: 'report-template-002',
    dealSummary: '',
    summaryStatus: SummaryStatusEnum.IDLE,
    lastModifiedDate: '2026-06-05 19:30:00',
    companyName: '上海澜舟新能源材料股份有限公司',
    creditCode: '91310115MA2MOCK002',
  },
  {
    id: 'deal-003',
    interviewCust: '深圳启明供应链管理有限公司',
    logo: asset('manage.png'),
    progress: '100',
    status: String(DealStatusEnum.ARCHIVE),
    calculation: null,
    interviewDealAbstract: null,
    interviewInstList: [],
    questionId: 'question-template-001',
    questionInfoList: makeQuestions('question-template-001'),
    report: {
      id: 'report-003',
      fileName: '深圳启明供应链管理有限公司贷后回访报告.docx',
      fileUrl: mockPreviewHtml('深圳启明供应链管理有限公司贷后回访报告', '<p>归档项目示例，用于演示历史报告和归档恢复流程。</p>'),
    },
    reportStatus: DealReportStatusEnum.REPORT_GENERATED,
    reportTemplate: mockReportTemplates[0],
    resources: [],
    supplementary: [],
    templateId: 'report-template-001',
    dealSummary: '归档项目，整体履约正常。',
    summaryStatus: SummaryStatusEnum.GENERATED,
    lastModifiedDate: '2026-05-28 17:00:00',
    companyName: '深圳启明供应链管理有限公司',
    creditCode: '91440300MA2MOCK003',
  },
  {
    id: 'deal-004',
    interviewCust: '宁波星河精密制造有限公司',
    logo: asset('report.png'),
    progress: '100',
    status: String(DealStatusEnum.ARCHIVE),
    calculation: null,
    interviewDealAbstract: null,
    interviewInstList: [],
    questionId: 'question-template-001',
    questionInfoList: makeQuestions('question-template-001'),
    report: {
      id: 'report-004',
      fileName: '宁波星河精密制造有限公司归档尽调报告.docx',
      fileUrl: mockPreviewHtml('宁波星河精密制造有限公司归档尽调报告', '<p>归档项目示例，包含完整报告、资料与访谈记录。</p>'),
    },
    reportStatus: DealReportStatusEnum.REPORT_GENERATED,
    reportTemplate: mockReportTemplates[0],
    resources: [
      {
        id: 'resource-004',
        fileName: '贷后检查资料包.pdf',
        fileUrl: textResource('贷后检查资料包', '该客户贷后经营稳定，未发现重大异常事项。'),
        type: 'pdf',
        status: '3',
        progress: 1,
        fileStatus: '3',
        createDate: '2026-05-12 10:20:00',
        lastModifiedTime: '2026-05-12 10:20:00',
        relationId: 'deal-004',
        matchNum: 5,
        total: 5,
        finishTime: '2026-05-12 10:25:00',
        fileCreateFinishTime: '2026-05-12 10:25:00',
      },
    ],
    supplementary: [],
    templateId: 'report-template-001',
    dealSummary: '归档项目，经营稳定，建议维持常规贷后跟踪。',
    summaryStatus: SummaryStatusEnum.GENERATED,
    lastModifiedDate: '2026-05-12 18:00:00',
    companyName: '宁波星河精密制造有限公司',
    creditCode: '91330200MA2MOCK004',
  },
];

export const mockInterviewRecords = [
  {
    id: 'interview-001',
    interviewInstId: 'interview-001',
    interviewDealInstId: 'deal-001',
    interviewInstName: '管理层访谈',
    interviewInstTitle: '管理层访谈',
    interviewCustom: '创始人 王总',
    interviewInstStatus: '3',
    recordStatus: '2',
    interviewInstBeginTime: '2026-06-03 10:00:00',
    createDate: '2026-06-03 10:00:00',
    lastModifiedDate: '2026-06-03 10:48:00',
  },
  {
    id: 'interview-002',
    interviewInstId: 'interview-002',
    interviewDealInstId: 'deal-001',
    interviewInstName: '财务负责人访谈',
    interviewInstTitle: '财务负责人访谈',
    interviewCustom: '财务总监 李总',
    interviewInstStatus: '3',
    recordStatus: '2',
    interviewInstBeginTime: '2026-06-04 14:00:00',
    createDate: '2026-06-04 14:00:00',
    lastModifiedDate: '2026-06-04 14:42:00',
  },
  {
    id: 'interview-003',
    interviewInstId: 'interview-003',
    interviewDealInstId: 'deal-002',
    interviewInstName: '业务负责人访谈',
    interviewInstTitle: '业务负责人访谈',
    interviewCustom: '销售负责人 周总',
    interviewInstStatus: '2',
    recordStatus: '2',
    interviewInstBeginTime: '2026-06-05 16:00:00',
    createDate: '2026-06-05 16:00:00',
    lastModifiedDate: '2026-06-05 16:20:00',
  },
  {
    id: 'interview-004',
    interviewInstId: 'interview-004',
    interviewDealInstId: 'deal-003',
    interviewInstName: '贷后回访',
    interviewInstTitle: '贷后回访',
    interviewCustom: '运营负责人 林总',
    interviewInstStatus: '3',
    recordStatus: '2',
    interviewInstBeginTime: '2026-05-28 15:00:00',
    createDate: '2026-05-28 15:00:00',
    lastModifiedDate: '2026-05-28 15:30:00',
  },
  {
    id: 'interview-005',
    interviewInstId: 'interview-005',
    interviewDealInstId: 'deal-004',
    interviewInstName: '归档访谈',
    interviewInstTitle: '归档访谈',
    interviewCustom: '财务经理 赵总',
    interviewInstStatus: '3',
    recordStatus: '2',
    interviewInstBeginTime: '2026-05-12 14:00:00',
    createDate: '2026-05-12 14:00:00',
    lastModifiedDate: '2026-05-12 14:35:00',
  },
];

export const mockTranscription = [
  { id: 'tr-001', interviewInstId: 'interview-001', roleId: '1', content: '请介绍一下公司当前的主营业务结构。', type: '1', createDate: '2026-06-03 10:02:00' },
  { id: 'tr-002', interviewInstId: 'interview-001', roleId: '2', content: '目前收入主要来自智能质检系统和售后运维服务，硬件交付占比约六成。', type: '1', createDate: '2026-06-03 10:03:00' },
  { id: 'tr-003', interviewInstId: 'interview-001', roleId: '1', content: '应收账款回款周期是否有明显变化？', type: '1', createDate: '2026-06-03 10:08:00' },
  { id: 'tr-004', interviewInstId: 'interview-001', roleId: '2', content: '今年重点客户验收节奏更集中，二季度后回款已有改善。', type: '1', createDate: '2026-06-03 10:09:00' },
];

export const mockEnterpriseOptions = [
  { name: '杭州云杉智能科技有限公司', creditCode: '91330100MA2MOCK001', regStatus: '存续', legalPersonName: '王明远' },
  { name: '上海澜舟新能源材料股份有限公司', creditCode: '91310115MA2MOCK002', regStatus: '存续', legalPersonName: '陈知行' },
  { name: '深圳启明供应链管理有限公司', creditCode: '91440300MA2MOCK003', regStatus: '存续', legalPersonName: '林清' },
];

export const mockReports: ReportRecord[] = mockDeals
  .filter((deal) => deal.report)
  .map((deal) => ({
    id: deal.report.id,
    fileName: deal.report.fileName,
    fileUrl: deal.report.fileUrl,
    relationId: deal.id,
    type: 'docx',
    fileCreateFinishTime: deal.lastModifiedDate || null,
    lastModifiedTime: deal.lastModifiedDate || null,
    finishTime: deal.lastModifiedDate || null,
    createDate: deal.lastModifiedDate || null,
    matchNum: 0,
    total: 0,
    progress: null,
    dealInstName: deal.interviewCust,
    status: '已生成',
    dealSummary: deal.dealSummary,
  }));

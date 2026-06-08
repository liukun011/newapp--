import {
  DealRecord,
  DealReportStatusEnum,
  DealStatusEnum,
  PageData,
  QuestionInfo,
  SummaryStatusEnum,
  TemplateTypeEnum,
} from '../types';
import {
  mockDeals,
  mockEnterpriseOptions,
  mockInterviewRecords,
  mockMembers,
  mockPreviewHtml,
  mockQuestionTemplates,
  mockReportTemplates,
  mockReports,
  mockTenants,
  mockTranscription,
  mockUser,
} from './mockData';

type QuestionTemplate = (typeof mockQuestionTemplates)[number];

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const now = () => {
  const date = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const page = <T>(records: T[], pageNo = 1, pageSize = 10): PageData<T> => ({
  records: records.slice((pageNo - 1) * pageSize, pageNo * pageSize),
  total: records.length,
  pageNum: pageNo,
  pageSize,
});

const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;

const normalizeResource = (resource: any) => ({
  ...resource,
  status: resource.status || resource.fileStatus || '3',
  fileStatus: resource.fileStatus || resource.status || '3',
  progress: resource.progress ?? 1,
});

const isArchivedStatus = (status: unknown) => {
  const value = String(status ?? '').trim().toLowerCase();
  return value === String(DealStatusEnum.ARCHIVE) || value === 'archive' || value === 'archived' || value === '已归档';
};

const buildDemoTranscription = (interviewInstId: string, interviewName = '访谈对象') => {
  const prefix = `tr-${interviewInstId}`;
  return [
    {
      id: `${prefix}-001`,
      interviewInstId,
      roleId: '1',
      contentType: '访谈人员',
      content: `请先介绍一下${interviewName}目前的主营业务和核心收入来源。`,
      type: '1',
      createDate: now(),
    },
    {
      id: `${prefix}-002`,
      interviewInstId,
      roleId: '2',
      contentType: interviewName,
      content: '公司目前以核心客户项目交付和持续服务收入为主，近期重点在提升毛利率和现金回款效率。',
      type: '1',
      createDate: now(),
    },
    {
      id: `${prefix}-003`,
      interviewInstId,
      roleId: '1',
      contentType: '访谈人员',
      content: '请补充说明近期经营风险、应收账款和重要合同履约情况。',
      type: '1',
      createDate: now(),
    },
    {
      id: `${prefix}-004`,
      interviewInstId,
      roleId: '2',
      contentType: interviewName,
      content: '主要风险集中在部分大客户验收周期延长，但目前合同履约正常，逾期应收已制定分批回款计划。',
      type: '1',
      createDate: now(),
    },
  ];
};

class MockStore {
  private user = clone(mockUser);
  private tenants = clone(mockTenants);
  private members = clone(mockMembers);
  private deals = clone(mockDeals);
  private reports = clone(mockReports);
  private reportTemplates = clone(mockReportTemplates);
  private questionTemplates: QuestionTemplate[] = clone(mockQuestionTemplates);
  private interviews = clone(mockInterviewRecords);
  private transcriptions = clone(mockTranscription);

  getLoginResponse() {
    return {
      ticket: 'mock-ticket',
      userId: this.user.userId,
      accessToken: 'mock-access-token',
      tokenType: 'Bearer',
      refreshToken: null,
      clientId: 'xiaoli-mock-client',
      expiresIn: '7200',
      refreshExpireIn: null,
      openId: null,
    };
  }

  getUser() {
    return clone(this.user);
  }

  updateUser(data: Record<string, unknown>) {
    this.user = { ...this.user, ...data };
    return this.getUser();
  }

  getTenants() {
    return clone(this.tenants);
  }

  switchTenant(tenantId: string) {
    const tenant = this.tenants.find((item) => String(item.id) === String(tenantId)) || this.tenants[0];
    this.user = {
      ...this.user,
      tenantId: tenant.id,
      tenantName: tenant.name,
      isTenantAdmin: !!tenant.isTenantAdmin,
    };
    return {
      ...this.getLoginResponse(),
      token: 'mock-access-token',
    };
  }

  updateTenant(tenantId: string, data: Record<string, unknown>) {
    const tenant = this.tenants.find((item) => String(item.id) === String(tenantId));
    if (tenant && typeof data.name === 'string') {
      tenant.name = data.name;
    }
    if (tenant && String(this.user.tenantId) === String(tenant.id)) {
      this.user.tenantName = tenant.name;
    }
    return clone(tenant || this.tenants[0]);
  }

  getOrganizationUsers(params: { current?: number; size?: number }) {
    return page(clone(this.members), params.current || 1, params.size || 10);
  }

  queryDeals(params: { pageNo?: number; pageSize?: number; dealInstTitle?: string; status?: string[] }) {
    let records = this.deals.map((deal) => this.hydrateDeal(deal));
    if (params.dealInstTitle) {
      const keyword = params.dealInstTitle.toLowerCase();
      records = records.filter((deal) =>
        [deal.interviewCust, deal.companyName, deal.creditCode].filter(Boolean).some((text) => String(text).toLowerCase().includes(keyword))
      );
    }
    if (params.status?.length) {
      const wantsArchive = params.status.some(isArchivedStatus);
      records = records.filter((deal) =>
        wantsArchive ? isArchivedStatus(deal.status) : !isArchivedStatus(deal.status)
      );
    }
    records.sort((a, b) => String(b.lastModifiedDate || '').localeCompare(String(a.lastModifiedDate || '')));
    return page(clone(records), params.pageNo || 1, params.pageSize || 10);
  }

  getDeal(id: string) {
    return clone(this.hydrateDeal(this.deals.find((deal) => String(deal.id) === String(id)) || this.deals[0]));
  }

  createOrUpdateDeal(data: Partial<DealRecord> & Record<string, unknown>) {
    if (data.id) {
      const index = this.deals.findIndex((deal) => String(deal.id) === String(data.id));
      if (index >= 0) {
        this.deals[index] = {
          ...this.deals[index],
          ...data,
          lastModifiedDate: now(),
        };
        return this.getDeal(String(data.id));
      }
    }

    const template = this.reportTemplates[0];
    const questionTemplate = this.questionTemplates[0];
    const id = makeId('deal');
    const created: DealRecord = {
      id,
      interviewCust: String(data.interviewCust || data.companyName || '新建尽调客户'),
      logo: String(data.logo || ''),
      progress: '10',
      status: String(DealStatusEnum.PREPARE),
      calculation: null,
      interviewDealAbstract: null,
      interviewInstList: [],
      questionId: questionTemplate.id,
      questionInfoList: clone(questionTemplate.questionList),
      report: null,
      reportStatus: DealReportStatusEnum.REPORT_NOT_GENERATED,
      reportTemplate: template,
      resources: [],
      supplementary: [],
      templateId: template.id,
      dealSummary: '',
      summaryStatus: SummaryStatusEnum.IDLE,
      lastModifiedDate: now(),
      companyName: typeof data.companyName === 'string' ? data.companyName : undefined,
      creditCode: typeof data.creditCode === 'string' ? data.creditCode : undefined,
    };
    this.deals.unshift(created);
    return clone(created);
  }

  deleteDeal(id: string) {
    this.deals = this.deals.filter((deal) => String(deal.id) !== String(id));
    this.rebuildReports();
  }

  archiveDeal(id: string, archive: boolean) {
    const deal = this.deals.find((item) => String(item.id) === String(id));
    if (deal) {
      deal.status = archive ? String(DealStatusEnum.ARCHIVE) : String(DealStatusEnum.END);
      deal.lastModifiedDate = now();
    }
    return this.getDeal(id);
  }

  changeReportTemplate(dealId: string, templateId: string) {
    const deal = this.deals.find((item) => String(item.id) === String(dealId));
    const template = this.reportTemplates.find((item) => String(item.id) === String(templateId));
    if (deal && template) {
      deal.templateId = template.id;
      deal.reportTemplate = clone(template);
      deal.lastModifiedDate = now();
    }
  }

  addQuestions(dealId: string, questionIds: string[]) {
    const deal = this.deals.find((item) => String(item.id) === String(dealId));
    if (!deal) return;
    const selected = this.questionTemplates
      .filter((template) => questionIds.includes(template.id))
      .flatMap((template) => template.questionList);
    const existingNames = new Set((deal.questionInfoList || []).map((item) => item.questionName));
    selected.forEach((question) => {
      if (existingNames.has(question.questionName)) return;
      deal.questionInfoList.push({
        ...clone(question),
        id: makeId('question'),
        questionIndex: deal.questionInfoList.length + 1,
      });
    });
    deal.lastModifiedDate = now();
  }

  uploadResource(dealId: string, names: string[]) {
    const deal = this.deals.find((item) => String(item.id) === String(dealId));
    if (!deal) return;
    names.forEach((name) => {
      deal.resources.push({
        id: makeId('resource'),
        fileName: name.split('/').pop() || '演示资料.txt',
        fileUrl: mockPreviewHtml('演示资料预览', '<p>这是 mock 上传后的资料预览内容。</p>'),
        type: 'txt',
        status: '3',
        fileStatus: '3',
        progress: 1,
        createDate: now(),
        lastModifiedTime: now(),
        relationId: dealId,
        matchNum: 1,
        total: 1,
        finishTime: now(),
        fileCreateFinishTime: now(),
      });
    });
    deal.lastModifiedDate = now();
  }

  deleteResource(dealId: string, resourceId: string) {
    const deal = this.deals.find((item) => String(item.id) === String(dealId));
    if (!deal) return;
    deal.resources = (deal.resources || []).filter((resource) => String(resource.id) !== String(resourceId));
    deal.supplementary = Array.isArray(deal.supplementary)
      ? deal.supplementary.filter((resource: { id: string }) => String(resource.id) !== String(resourceId))
      : deal.supplementary;
    deal.lastModifiedDate = now();
  }

  renameResource(fileId: string, fileName: string) {
    this.deals.forEach((deal) => {
      [...(deal.resources || []), ...(Array.isArray(deal.supplementary) ? deal.supplementary : [])].forEach((resource) => {
        if (String(resource.id) === String(fileId)) resource.fileName = fileName;
      });
    });
  }

  generateReport(dealId: string) {
    const deal = this.deals.find((item) => String(item.id) === String(dealId));
    if (!deal) return null;
    deal.reportStatus = DealReportStatusEnum.REPORT_GENERATED;
    deal.status = String(DealStatusEnum.END);
    deal.report = {
      id: `report-${deal.id}`,
      fileName: `${deal.interviewCust || '尽调'}报告.docx`,
      fileUrl: mockPreviewHtml(`${deal.interviewCust || '尽调'}报告`, '<p>报告已由 mock 引擎生成，适合原型流程演示。</p>'),
    };
    deal.lastModifiedDate = now();
    this.rebuildReports();
    return clone(deal.report);
  }

  generateSummary(dealId: string) {
    const deal = this.deals.find((item) => String(item.id) === String(dealId));
    if (!deal) return null;
    deal.summaryStatus = SummaryStatusEnum.GENERATED;
    deal.dealSummary = 'mock 总结：客户业务稳定，管理层对增长路径表述清晰，建议进一步核验回款节奏和关键合同履约情况。';
    deal.lastModifiedDate = now();
    return this.getDeal(dealId);
  }

  getReports(params: { pageNo?: number; pageSize?: number; fileName?: string }) {
    this.rebuildReports();
    let records = [...this.reports];
    if (params.fileName) {
      const keyword = params.fileName.toLowerCase();
      records = records.filter((report) => report.fileName.toLowerCase().includes(keyword));
    }
    return page(clone(records), params.pageNo || 1, params.pageSize || 50);
  }

  getInterviews(dealId?: string, pageNum = 1, pageSize = 100) {
    const records = dealId ? this.interviews.filter((item) => String(item.interviewDealInstId) === String(dealId)) : this.interviews;
    return page(clone(records), pageNum, pageSize);
  }

  createInterview(data: { interviewDealInstId: string; interviewCustom?: string }) {
    const title = `${data.interviewCustom || '客户'}访谈`;
    const interview = {
      id: makeId('interview'),
      interviewInstId: makeId('interview-inst'),
      interviewDealInstId: data.interviewDealInstId,
      interviewInstName: title,
      interviewInstTitle: title,
      interviewCustom: data.interviewCustom || '访谈对象',
      interviewInstStatus: '1',
      recordStatus: '1',
      interviewInstBeginTime: now(),
      createDate: now(),
      lastModifiedDate: now(),
    };
    this.interviews.unshift(interview);
    this.ensureTranscription(interview.interviewInstId, interview.interviewCustom);
    return clone(interview);
  }

  updateInterview(data: { interviewInstId: string; interviewInstTitle?: string; interviewCustom?: string; interviewInstStatus?: string }) {
    const interview = this.interviews.find((item) => String(item.interviewInstId || item.id) === String(data.interviewInstId));
    if (interview) {
      Object.assign(interview, data, { lastModifiedDate: now() });
    }
    return clone(interview || this.interviews[0]);
  }

  getTranscription(interviewInstId: string, pageNum = 1, pageSize = 100, cacheCount?: number) {
    const interview = this.interviews.find((item) => String(item.interviewInstId || item.id) === String(interviewInstId));
    const allRecords = this.ensureTranscription(interviewInstId, interview?.interviewCustom || interview?.interviewInstTitle);
    const records = typeof cacheCount === 'number' && cacheCount > 0 ? allRecords.slice(Math.max(cacheCount - 1, 0)) : allRecords;
    return page(clone(records), pageNum, pageSize);
  }

  saveTranscription(data: { interviewInstId: string; contentList?: Array<Record<string, any>> }) {
    if (!data.interviewInstId) return [];
    const contentList = Array.isArray(data.contentList) ? data.contentList : [];
    if (contentList.length > 0) {
      this.transcriptions = this.transcriptions.filter((item) => String(item.interviewInstId) !== String(data.interviewInstId));
      contentList.forEach((item, index) => {
        this.transcriptions.push({
          id: String(item.id || `tr-${data.interviewInstId}-${index + 1}`),
          interviewInstId: data.interviewInstId,
          roleId: item.roleId || String((index % 2) + 1),
          contentType: item.contentType || (index % 2 === 0 ? '访谈人员' : '访谈对象'),
          content: item.content || '',
          type: item.type || '1',
          createDate: item.createDate || now(),
        });
      });
    }
    return this.ensureTranscription(data.interviewInstId);
  }

  finishInterview(interviewInstId: string) {
    const interview = this.interviews.find((item) => String(item.interviewInstId || item.id) === String(interviewInstId));
    if (interview) {
      interview.interviewInstStatus = '3';
      interview.recordStatus = '2';
      interview.lastModifiedDate = now();
    }
    this.ensureTranscription(interviewInstId, interview?.interviewCustom || interview?.interviewInstTitle);
    return clone(interview || { interviewInstId, successful: true });
  }

  private ensureTranscription(interviewInstId: string, interviewName = '访谈对象') {
    if (!interviewInstId) return [];
    let records = this.transcriptions.filter((item) => String(item.interviewInstId) === String(interviewInstId));
    if (records.length === 0) {
      records = buildDemoTranscription(interviewInstId, interviewName);
      this.transcriptions.push(...records);
    }
    return records;
  }

  getQuestionTemplates() {
    return clone(this.questionTemplates);
  }

  getQuestionTemplateResponse(questionId?: string) {
    return {
      id: null,
      agencyId: null,
      recStatus: null,
      businessId: 'mock-business',
      questionId: questionId || this.questionTemplates[0].id,
      templateId: questionId || this.questionTemplates[0].id,
      templateInfoVos: this.getQuestionTemplates(),
    };
  }

  addQuestionTemplate(data: { templateName: string; templateDesc?: string }) {
    const template: QuestionTemplate = {
      id: makeId('question-template'),
      templateName: data.templateName,
      templateType: TemplateTypeEnum.PERSONAL,
      businessId: 'custom',
      templateDesc: data.templateDesc || '自定义 mock 问题清单',
      templateStatus: '1',
      recStatus: 'A',
      createUser: this.user.userId,
      questionList: [],
    };
    this.questionTemplates.unshift(template);
    return clone(template);
  }

  updateQuestionTemplate(data: { id: string; templateName?: string; templateDesc?: string }) {
    const template = this.questionTemplates.find((item) => String(item.id) === String(data.id));
    if (template) {
      template.templateName = data.templateName || template.templateName;
      template.templateDesc = data.templateDesc || template.templateDesc;
    }
    return clone(template || this.questionTemplates[0]);
  }

  deleteQuestionTemplate(id: string) {
    this.questionTemplates = this.questionTemplates.filter((item) => String(item.id) !== String(id));
  }

  addQuestion(data: { templateId: string; questionName: string }) {
    const template = this.questionTemplates.find((item) => String(item.id) === String(data.templateId));
    const question: QuestionInfo = {
      id: makeId('question'),
      questionName: data.questionName,
      questionIndex: (template?.questionList.length || 0) + 1,
      questionAnswer: null,
      questionAnswerTime: null,
      questionStatus: '1',
      templateId: data.templateId,
      recStatus: 'A',
    };
    template?.questionList.push(question);
    return clone(question);
  }

  updateQuestion(data: { id: string; questionName: string }) {
    this.questionTemplates.forEach((template) => {
      const question = template.questionList.find((item) => String(item.id) === String(data.id));
      if (question) question.questionName = data.questionName;
    });
  }

  deleteQuestion(id: string) {
    this.questionTemplates.forEach((template) => {
      template.questionList = template.questionList.filter((item) => String(item.id) !== String(id));
      template.questionList.forEach((question, index) => {
        question.questionIndex = index + 1;
      });
    });
  }

  getReportTemplates(params?: { isEnabled?: number }) {
    let templates = [...this.reportTemplates];
    if (params?.isEnabled) {
      templates = templates.filter((template) => template.isEnabled === params.isEnabled);
    }
    return clone(templates);
  }

  getReportTemplate(id: string) {
    return clone(this.reportTemplates.find((item) => String(item.id) === String(id)) || this.reportTemplates[0]);
  }

  addReportTemplate(data: Record<string, unknown>) {
    const template = {
      ...this.reportTemplates[0],
      id: makeId('report-template'),
      reportTemplateName: String(data.reportTemplateName || data.approveReportName || '新建报告模板'),
      reportTemplateDesc: typeof data.reportTemplateDesc === 'string' ? data.reportTemplateDesc : '原型中新建的 mock 模板',
      viewTemplateUrl: mockPreviewHtml('新建报告模板', '<p>这是通过 mock 接口新建的模板。</p>'),
      createUser: Number(this.user.userId) || 1,
      lastModifiedDate: now(),
    };
    this.reportTemplates.unshift(template);
    return clone(template);
  }

  updateReportTemplate(data: { id: string; approveReportName?: string; reportTemplateName?: string }) {
    const template = this.reportTemplates.find((item) => String(item.id) === String(data.id));
    if (template) {
      template.reportTemplateName = data.approveReportName || data.reportTemplateName || template.reportTemplateName;
      template.lastModifiedDate = now();
    }
    return clone(template || this.reportTemplates[0]);
  }

  deleteReportTemplate(id: string) {
    this.reportTemplates = this.reportTemplates.filter((item) => String(item.id) !== String(id));
  }

  searchEnterprise(word: string) {
    const keyword = word.toLowerCase();
    return clone(mockEnterpriseOptions.filter((item) => item.name.toLowerCase().includes(keyword) || item.creditCode.toLowerCase().includes(keyword)));
  }

  getEnterpriseBasicInfo(dealId: string) {
    const deal = this.getDeal(dealId);
    const equityItems = [
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
    ];
    const basic = {
      name: deal.companyName || deal.interviewCust,
      creditCode: deal.creditCode || '91330000MOCK0000',
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
      equityChange: equityItems,
    };
    const equityChange = {
      result: {
        items: equityItems,
      },
    };

    return {
      ...basic,
      basicInfo: JSON.stringify({ result: basic }),
      equityChange: JSON.stringify(equityChange),
      riskTags: ['客户集中度', '应收账款周转', '研发投入转化'],
      businessScope: '人工智能软件、数据分析平台、企业数字化解决方案的研发与销售。',
    };
  }

  getAiInsights() {
    return [
      { id: 'temp_ai_001', questionContent: '请补充说明前五大客户近两年的收入占比变化。' },
      { id: 'temp_ai_002', questionContent: '请核验应收账款中超过一年账龄部分的形成原因。' },
      { id: 'temp_ai_003', questionContent: '请说明核心研发人员稳定性和期权激励安排。' },
    ];
  }

  appendResource(dealId: string, appendText: string) {
    const deal = this.deals.find((item) => String(item.id) === String(dealId));
    if (!deal) return;
    const list = Array.isArray(deal.supplementary) ? deal.supplementary : [];
      list.unshift({
        id: makeId('supplement'),
        fileName: '语音补充资料.txt',
        fileUrl: mockPreviewHtml('语音补充资料', `<p>${appendText || '补充资料内容已保存。'}</p>`),
        type: '4',
        status: '3',
        fileStatus: '3',
        progress: 1,
        createDate: now(),
      lastModifiedTime: now(),
      relationId: dealId,
      matchNum: 0,
      total: 0,
      finishTime: null,
      fileCreateFinishTime: null,
    });
    deal.supplementary = list;
    deal.lastModifiedDate = now();
  }

  private rebuildReports() {
    this.reports = this.deals
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
  }

  private hydrateDeal(deal: DealRecord) {
    const interviews = this.interviews.filter((item) => String(item.interviewDealInstId) === String(deal.id));
    return {
      ...deal,
      interviewInstList: clone(interviews),
      resources: (deal.resources || []).map(normalizeResource),
      supplementary: Array.isArray(deal.supplementary) ? deal.supplementary.map(normalizeResource) : deal.supplementary,
      reportTemplate: deal.reportTemplate || this.reportTemplates.find((template) => String(template.id) === String(deal.templateId)) || null,
    };
  }
}

export const mockStore = new MockStore();

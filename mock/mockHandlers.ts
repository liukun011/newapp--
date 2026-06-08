import { AxiosRequestConfig } from 'axios';
import { mockPreviewHtml } from './mockData';
import { mockStore } from './mockStore';

type MockResponse<T = unknown> = T;

const delay = () => new Promise((resolve) => window.setTimeout(resolve, 260 + Math.random() * 220));

const ok = <T>(data: T, message = '操作成功') => ({
  success: true,
  data,
  message,
});

const authOk = <T>(data: T, message = '操作成功') => ({
  successful: true,
  code: 200,
  message,
  timestamp: new Date().toISOString(),
  data,
});

const emptyOk = () => ok(true);

const getPayload = (options: AxiosRequestConfig) => (options.data || {}) as Record<string, any>;

const getParams = (url: string, options: AxiosRequestConfig) => {
  const query = url.includes('?') ? Object.fromEntries(new URLSearchParams(url.slice(url.indexOf('?') + 1))) : {};
  return {
    ...query,
    ...((options.params || {}) as Record<string, any>),
  };
};

const normalizePath = (url: string) => url.split('?')[0].replace(/^\/report/, '');

const uploadResult = (url: string) => ({
  fileUrl: url,
  fileURL: url,
  url,
  result: {
    success: true,
    errno: 0,
    data: { url },
    url,
  },
  percent: 100,
});

export async function handleMockRequest<T>(url: string, options: AxiosRequestConfig = {}, kind: 'business' | 'auth' = 'business'): Promise<MockResponse<T>> {
  await delay();

  const path = normalizePath(url);
  const data = getPayload(options);
  const params = getParams(url, options);

  if (kind === 'auth') {
    return handleAuthRequest<T>(path, data, params);
  }

  return handleBusinessRequest<T>(path, data, params);
}

function handleAuthRequest<T>(path: string, data: Record<string, any>, params: Record<string, any>): MockResponse<T> {
  if (path.includes('/login-with-password') || path.includes('/login-with-phonecode')) {
    return authOk(mockStore.getLoginResponse(), '登录成功') as T;
  }

  if (path.includes('/send-sms') || path.includes('/password_reset/sendSms')) {
    return authOk({ captcha: '888888' }, '验证码已发送') as T;
  }

  if (path.includes('/reset_password')) {
    return authOk(true, '密码重置成功') as T;
  }

  if (path.includes('/token/logout') || path.includes('/token/unregister')) {
    return authOk(true) as T;
  }

  if (path.includes('/users/userinfo')) {
    return authOk(mockStore.getUser()) as T;
  }

  if (path.includes('/token/change_info')) {
    return authOk(mockStore.updateUser(data)) as T;
  }

  if (path.includes('/users/upload')) {
    return authOk(uploadResult('/talk-assistant/assets/xiaoliavatar.png')) as T;
  }

  if (path.includes('/users/tenants')) {
    return authOk(mockStore.getTenants()) as T;
  }

  if (path.includes('/users/change_tenant')) {
    return authOk(mockStore.switchTenant(String(data.tenantId || params.tenantId || 'tenant-001'))) as T;
  }

  if (path.includes('/tenants/') && path.includes('/modify')) {
    const tenantId = path.split('/tenants/')[1]?.split('/')[0] || 'tenant-001';
    return authOk(mockStore.updateTenant(tenantId, data)) as T;
  }

  if (path.includes('/user_org/page_users')) {
    return authOk(mockStore.getOrganizationUsers(data)) as T;
  }

  return authOk(true) as T;
}

function handleBusinessRequest<T>(path: string, data: Record<string, any>, params: Record<string, any>): MockResponse<T> {
  if (path === '/user/sso/cleanCache') {
    return emptyOk() as T;
  }

  if (path === '/deal/queryDealInstListByPage') {
    return ok(mockStore.queryDeals(data as { pageNo?: number; pageSize?: number; dealInstTitle?: string; status?: string[] })) as T;
  }

  if (path === '/deal/dealInstDetail') {
    return ok(mockStore.getDeal(String(data.id || params.id || params.dealId || 'deal-001'))) as T;
  }

  if (path === '/deal/createOrUpdateDealInst') {
    return ok(mockStore.createOrUpdateDeal(data)) as T;
  }

  if (path === '/deal/delete') {
    mockStore.deleteDeal(String(data.id));
    return emptyOk() as T;
  }

  if (path === '/deal/archive' || path === '/deal/cancelArchive') {
    return ok(mockStore.archiveDeal(String(data.id), path === '/deal/archive')) as T;
  }

  if (path === '/deal/changeReportTemplate') {
    mockStore.changeReportTemplate(String(data.id), String(data.templateId));
    return emptyOk() as T;
  }

  if (path === '/deal/addQuestion') {
    mockStore.addQuestions(String(data.id), Array.isArray(data.questionIds) ? data.questionIds : []);
    return emptyOk() as T;
  }

  if (path === '/deal/upload') {
    const dealId = String(data.id || data.dealId || 'deal-001');
    mockStore.uploadResource(dealId, ['本地上传资料.txt']);
    return ok(uploadResult(mockPreviewHtml('上传资料', '<p>资料已通过 mock 接口上传。</p>'))) as T;
  }

  if (path === '/deal/upload-resource') {
    mockStore.uploadResource(String(data.id), Array.isArray(data.pathList) ? data.pathList : ['演示资料.txt']);
    return emptyOk() as T;
  }

  if (path === '/deal/delete-file') {
    mockStore.deleteResource(String(data.id), String(data.fileId));
    return emptyOk() as T;
  }

  if (path === '/deal/rename') {
    mockStore.renameResource(String(data.fileId), String(data.fileName));
    return emptyOk() as T;
  }

  if (path === '/deal/reparse-file') {
    return emptyOk() as T;
  }

  if (path === '/interview/generateInterviewInstReportAsync') {
    return ok(mockStore.generateReport(String(data.interviewDealInstId || data.id))) as T;
  }

  if (path === '/interview/summary') {
    return ok(mockStore.generateSummary(String(data.id))) as T;
  }

  if (path === '/interview/createInterviewInst') {
    return ok(mockStore.createInterview(data as { interviewDealInstId: string; interviewCustom?: string })) as T;
  }

  if (path === '/interview/queryInterviewInstListByPage') {
    return ok(mockStore.getInterviews(String(data.interviewDealInstId || params.interviewDealInstId || ''), Number(data.pageNum || 1), Number(data.pageSize || 100))) as T;
  }

  if (path === '/interview/queryInterviewInstContentListByPage') {
    const cacheCount = data.cacheCount === undefined ? undefined : Number(data.cacheCount);
    return ok(mockStore.getTranscription(String(data.interviewInstId), Number(data.pageNum || 1), Number(data.pageSize || 100), cacheCount)) as T;
  }

  if (path === '/interview/queryInterviewRecordFileInstByInterviewInstId') {
    return ok({
      recordFileUrl: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=',
    }) as T;
  }

  if (path === '/interview/uploadInterviewInstContent') {
    return ok(mockStore.saveTranscription(data as { interviewInstId: string; contentList?: Array<Record<string, any>> })) as T;
  }

  if (path === '/interview/overInterviewInst') {
    return ok(mockStore.finishInterview(String(data.interviewInstId))) as T;
  }

  if (path === '/interview/uploadInterviewInstRecordFile') {
    return emptyOk() as T;
  }

  if (path === '/interview/updateInterviewInst') {
    return ok(mockStore.updateInterview(data as { interviewInstId: string; interviewInstTitle?: string; interviewCustom?: string; interviewInstStatus?: string })) as T;
  }

  if (path === '/interview/appendResource') {
    mockStore.appendResource(String(data.interviewDealInstId), String(data.appendText || ''));
    return emptyOk() as T;
  }

  if (path === '/deal/queryDealReportListByPage') {
    return ok(mockStore.getReports(data as { pageNo?: number; pageSize?: number; fileName?: string })) as T;
  }

  if (path === '/webInterface/url/view') {
    return ok(params.url || mockPreviewHtml('报告预览', '<p>mock 文件预览。</p>')) as T;
  }

  if (path === '/deal/tyc/search') {
    return ok(mockStore.searchEnterprise(String(params.word || ''))) as T;
  }

  if (path === '/deal/tyc/sync' || path === '/deal/clearAiInsight' || path === '/deal/acceptAiInsight') {
    return emptyOk() as T;
  }

  if (path === '/deal/tyc/basicInfo') {
    return ok(mockStore.getEnterpriseBasicInfo(String(params.dealId || data.dealId || data.id || 'deal-001'))) as T;
  }

  if (path === '/deal/aiInsight') {
    return ok(mockStore.getAiInsights()) as T;
  }

  if (path === '/template/list') {
    return ok(mockStore.getReportTemplates(params as { isEnabled?: number })) as T;
  }

  if (path === '/template/detail') {
    return ok(mockStore.getReportTemplate(String(params.templateId || data.templateId || data.id))) as T;
  }

  if (path === '/template/insert') {
    return ok(mockStore.addReportTemplate(data)) as T;
  }

  if (path === '/template/delete') {
    mockStore.deleteReportTemplate(String(data.id));
    return emptyOk() as T;
  }

  if (path === '/templateInfo/getTemplateList') {
    return ok(mockStore.getQuestionTemplates()) as T;
  }

  if (path === '/templateInfo/add') {
    return ok(mockStore.addQuestionTemplate(data as { templateName: string; templateDesc?: string })) as T;
  }

  if (path === '/templateInfo/update') {
    return ok(mockStore.updateQuestionTemplate(data as { id: string; templateName?: string; templateDesc?: string })) as T;
  }

  if (path === '/templateInfo/delete') {
    mockStore.deleteQuestionTemplate(String(data.id));
    return emptyOk() as T;
  }

  if (path === '/user/queryUserProperties') {
    return ok(mockStore.getQuestionTemplateResponse(String(params.questionId || ''))) as T;
  }

  if (path === '/questionInfo/add') {
    return ok(mockStore.addQuestion(data as { templateId: string; questionName: string })) as T;
  }

  if (path === '/questionInfo/update') {
    mockStore.updateQuestion(data as { id: string; questionName: string });
    return emptyOk() as T;
  }

  if (path === '/questionInfo/delete') {
    mockStore.deleteQuestion(String(data.id));
    return emptyOk() as T;
  }

  if (path === '/reportApprove/queryApproveReport') {
    return ok(mockStore.getReportTemplates().map((template) => ({
      id: template.id,
      agencyId: 1,
      centerUserId: 1,
      approveReportName: template.reportTemplateName,
      approveReportStatus: '1',
      approveTemplateUrl: template.viewTemplateUrl,
      createDate: template.lastModifiedDate || '2026-06-01 10:00:00',
      createUser: 1,
      lastModifiedDate: template.lastModifiedDate || '2026-06-01 10:00:00',
      lastModifiedUser: 1,
      errorMsg: null,
      recStatus: 'A',
    }))) as T;
  }

  if (path === '/reportApprove/addApproveReport' || path === '/reportApprove/addApproveReportNew' || path === '/reportApprove/replaceApproveReport') {
    return ok(mockStore.addReportTemplate(data)) as T;
  }

  if (path === '/reportApprove/updateApproveReport') {
    return ok(mockStore.updateReportTemplate(data as { id: string; approveReportName?: string })) as T;
  }

  if (path === '/reportApprove/deleteApproveReport') {
    mockStore.deleteReportTemplate(String(data.id));
    return emptyOk() as T;
  }

  if (path === '/reportApprove/clickApproveReport') {
    return emptyOk() as T;
  }

  if (path === '/user/invitation') {
    return ok('XL-MOCK-2026') as T;
  }

  if (path === '/user/invitation/inviteCode') {
    const type = String(params.type || 'app');
    return ok(type === 'tenant' ? 'https://xiaoli.mock/invite/org/XL-TENANT-2026' : 'https://xiaoli.mock/share/XL-MOCK-2026') as T;
  }

  if (path === '/user/invitation/import') {
    return ok(`已关联邀请码 ${data.inviteCode || ''}`) as T;
  }

  if (path === '/user/invitation/listRelations') {
    return ok([
      { id: 'relation-001', inviteeUserName: '周明', createDate: '2026-06-01T13:20:00' },
      { id: 'relation-002', inviteeUserName: '林溪', createDate: '2026-06-04T09:12:00' },
    ]) as T;
  }

  if (path === '/upload/file') {
    return ok(uploadResult(mockPreviewHtml('上传文件', '<p>mock 上传文件已就绪。</p>'))) as T;
  }

  console.warn(`[Mock] Unhandled ${path}`, { data, params });
  return emptyOk() as T;
}

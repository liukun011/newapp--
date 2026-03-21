export enum View {
  LOGIN = 'LOGIN',                    // LoginPage - 登录页
  HOME = 'HOME',                      // HomePage - 首页/尽调列表
  DUE_DILIGENCE = 'DUE_DILIGENCE',    // DueDiligencePage - 尽调详情页
  RECORDING = 'RECORDING',            // RecordingPage - 访谈录音页
  MATERIALS_LIST = 'MATERIALS_LIST',  // MaterialsListPage - 尽调资料列表页
  MATERIAL_UPLOAD = 'MATERIAL_UPLOAD',// MaterialUploadPage - 资料上传页（多标签）
  AI_GENERATION = 'AI_GENERATION',    // AiGenerationPage - 自动生成报告页
  CORPORATE_EDIT = 'CORPORATE_EDIT',  // CorporateEditPage - 企业信息编辑页
  MY_TEMPLATES = 'MY_TEMPLATES',      // MyTemplatesPage - 我的模板页
  UPLOAD_TEMPLATE = 'UPLOAD_TEMPLATE',// UploadTemplatePage - 上传访谈模板页
  TEMPLATE_SELECTION = 'TEMPLATE_SELECTION', // TemplateSelectionPage - 模板选择页
  TEMPLATE_PREVIEW = 'TEMPLATE_PREVIEW',     // TemplatePreviewPage - 模板预览页
  QUESTIONS_LIST = 'QUESTIONS_LIST',  // QuestionsListPage - 常用问题集合页
  SETTINGS = 'SETTINGS',              // SettingsPage - 设置页
  HISTORY = 'HISTORY',                // HistoryRecordsPage - 历史访谈页
  HISTORY_DETAIL = 'HISTORY_DETAIL',  // HistoryDetailPage - 历史访谈详情页
  MESSAGE_CENTER = 'MESSAGE_CENTER',  // MessageCenterPage - 消息中心页
  MANAGEMENT = 'MANAGEMENT',          // ManagementPage - 业务支撑管理页
  REPORTS_LIST = 'REPORTS_LIST',      // ReportsListPage - 报告列表页
  REPORT_PREVIEW = 'REPORT_PREVIEW',  // ReportPreviewPage - 报告预览页
  USER_AGREEMENT = 'USER_AGREEMENT',  // UserAgreementPage - 用户协议页
  PRIVACY_POLICY = 'PRIVACY_POLICY',  // PrivacyPolicyPage - 隐私政策页
  INVITATION_CENTER = 'INVITATION_CENTER', // InvitationCenterPage - 邀请中心页
  ORGANIZATION_MANAGEMENT = 'ORGANIZATION_MANAGEMENT', // OrganizationManagementPage - 组织管理页
  SHARE_APP = 'SHARE_APP',             // ShareAppPage - 分享应用页
}


// 尽调状态枚举
export enum DealStatusEnum {
  PREPARE = 1,        // 尽调创建成功
  INTERVIEW = 2,      // 访谈创建成功
  INTERVIEWING = 3,   // 访谈中，已开始录音
  END = 4,            // 访谈完成
  ARCHIVE = 5,        // 已归档
}

// 尽调状态描述映射
export const DealStatusDescription: Record<DealStatusEnum, string> = {
  [DealStatusEnum.PREPARE]: '尽调创建成功',
  [DealStatusEnum.INTERVIEW]: '访谈创建成功',
  [DealStatusEnum.INTERVIEWING]: '访谈中，已开始录音',
  [DealStatusEnum.END]: '访谈完成',
  [DealStatusEnum.ARCHIVE]: '已归档',
};

// 报告生成状态枚举
export enum DealReportStatusEnum {
  REPORT_NOT_GENERATED = '1',  // 报告未生成
  REPORT_GENERATING = '2',     // 报告生成中
  REPORT_GENERATED = '3',      // 报告已生成
  REPORT_FAILED = '4',         // 报告生成失败
}

// 报告状态描述映射
export const DealReportStatusDescription: Record<DealReportStatusEnum, string> = {
  [DealReportStatusEnum.REPORT_NOT_GENERATED]: '报告未生成',
  [DealReportStatusEnum.REPORT_GENERATING]: '报告生成中',
  [DealReportStatusEnum.REPORT_GENERATED]: '报告已生成',
  [DealReportStatusEnum.REPORT_FAILED]: '报告生成失败',
};

export interface Question {
  id: number | string;
  text: string;
  isAnswered: boolean;
  details?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'AI' | 'User' | 'Interviewee';
  text: string;
  avatar?: string;
}

export interface User {
  phone: string;
}

export interface Interview {
  id: number;
  title: string;
  date: string;
  status: 'ongoing' | 'archived';
  type: string;
}

// 尽调资料
export interface Resource {
  id: string;
  fileName: string;
  fileUrl: string;
  type?: string;
  createDate?: string;
  lastModifiedTime?: string;
  relationId?: string;
  matchNum?: number;
  total?: number;
  finishTime?: string | null;
  fileCreateFinishTime?: string | null;
}

// 问题信息
export interface QuestionInfo {
  id?: string;
  questionName: string;
  questionIndex: number;
  questionAnswer: string | null;
  questionAnswerTime: string | null;
  questionStatus: string;
  templateId: string;
  agencyId: string;
  recStatus: string;
  CHECKED?: boolean;
}

export interface DealRecord {
  id: string;
  interviewCust: string;
  logo: string;
  progress: string;
  status: string;
  calculation: any;
  interviewDealAbstract: any;
  interviewInstList: any;
  questionId: any;
  questionInfoList: QuestionInfo[];
  report: any;
  reportStatus: any;
  reportTemplate: any;
  resources: Resource[];
  supplementary: any;
  templateId: any;
  dealSummary?: string;
  lastModifiedDate?: string;
}

export interface ReportRecord {
  id: string;
  fileName: string;
  fileUrl: string;
  relationId: string;    // 关联ID (如尽调实例ID)
  type: string;          // 文件类型标识
  fileCreateFinishTime: string | null; // 文件创建完成时间
  lastModifiedTime: string | null;     // 最后修改时间
  finishTime: string | null;
  createDate: string | null;
  matchNum: number;
  total: number;
  progress: any;
  
  // UI 辅助字段 (可能需要前端处理或后续接口补充)
  dealInstName?: string; 
  status?: string;
  dealSummary?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface PageData<T> {
  records: T[];
  total: number;
  pageNum: number;
  pageSize: number;
}

export interface LoginResponse {
  ticket: string;
  userId: string;
  accessToken: string;
  tokenType: string;
  refreshToken: string | null;
  clientId: string;
  expiresIn: string;
  refreshExpireIn: string | null;
  openId: string | null;
}

export interface TranscriptionItem {
  id: string;
  roleId: string;
  content: string;
  timestamp?: number;
  isFinal?: boolean;
  contentType?: string;
}

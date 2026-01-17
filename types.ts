export enum View {
  LOGIN = 'LOGIN',                    // LoginPage - 登录页
  HOME = 'HOME',                      // HomePage - 首页/尽调列表
  DUE_DILIGENCE = 'DUE_DILIGENCE',    // DueDiligencePage - 尽调详情页
  RECORDING = 'RECORDING',            // RecordingPage - 访谈录音页
  MATERIALS_LIST = 'MATERIALS_LIST',  // MaterialsListPage - 尽调资料列表页
  MATERIAL_UPLOAD = 'MATERIAL_UPLOAD',// MaterialUploadPage - 资料上传页（多标签）
  AI_GENERATION = 'AI_GENERATION',    // AiGenerationPage - AI生成报告页
  CORPORATE_EDIT = 'CORPORATE_EDIT',  // CorporateEditPage - 企业信息编辑页
  MY_TEMPLATES = 'MY_TEMPLATES',      // MyTemplatesPage - 我的模板页
  UPLOAD_TEMPLATE = 'UPLOAD_TEMPLATE',// UploadTemplatePage - 上传访谈模板页
  TEMPLATE_SELECTION = 'TEMPLATE_SELECTION', // TemplateSelectionPage - 模板选择页
  TEMPLATE_PREVIEW = 'TEMPLATE_PREVIEW',     // TemplatePreviewPage - 模板预览页
  QUESTIONS_LIST = 'QUESTIONS_LIST',  // QuestionsListPage - 常用问题集合页
  SETTINGS = 'SETTINGS',              // SettingsPage - 设置页
  HISTORY = 'HISTORY',                // HistoryRecordsPage - 历史访谈页
  HISTORY_DETAIL = 'HISTORY_DETAIL',  // HistoryDetailPage - 历史访谈详情页
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
  REPORT_NOT_GENERATED = 1,  // 报告未生成
  REPORT_GENERATING = 2,     // 报告生成中
  REPORT_GENERATED = 3,      // 报告已生成
  REPORT_FAILED = 4,         // 报告生成失败
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
  type: string;
  createDate: string;
  lastModifiedTime: string;
  relationId: string;
  matchNum: number;
  total: number;
  finishTime: string | null;
  fileCreateFinishTime: string | null;
}

// 问题信息
export interface QuestionInfo {
  id: string;
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
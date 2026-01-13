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
}

export interface Question {
  id: number;
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
  questionInfoList: any;
  report: any;
  reportStatus: any;
  reportTemplate: any;
  resources: any;
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
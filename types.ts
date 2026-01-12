export enum View {
  LOGIN = 'LOGIN',
  HOME = 'HOME',
  DUE_DILIGENCE = 'DUE_DILIGENCE',
  RECORDING = 'RECORDING',
  MATERIAL_UPLOAD = 'MATERIAL_UPLOAD',
  AI_GENERATION = 'AI_GENERATION',
  CORPORATE_EDIT = 'CORPORATE_EDIT',
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
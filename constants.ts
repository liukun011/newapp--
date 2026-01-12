import { Question, ChatMessage, Interview } from './types';

// Colors
export const COLORS = {
  primary: '#4E3EF8', // Deep Violet/Indigo
  backgroundStart: '#E0E7FF', // Light Purple
  backgroundEnd: '#EFF6FF', // Soft Blue
  textMain: '#1A1A1A',
  textSecondary: '#858b9c',
  white: '#FFFFFF',
  border: '#EBEDF0',
  success: '#07C160',
};

// Login Carousel Slides
export const LOGIN_SLIDES = [
  {
    id: 1,
    title: "高效增收：一日多访客户信息滴水不漏",
    desc: "一天可以见多个客户确保“记”得住、“记”得全、“记”得好",
  },
  {
    id: 2,
    title: "你的自由，不该被困在无尽的报告里",
    desc: "把时间还给生活，让高效成为习惯，乐享每一天",
  },
  {
    id: 3,
    title: "对话结束即出稿，语音输入改报告",
    desc: "自动整合对话、生成结构化报告，全面解放创造力",
  },
  {
    id: 4,
    title: "帮您成为更好的自己，生活工作两不误",
    desc: "在每一个关键节点提供专业力量，全程守护您的成长之路",
  }
];

// Mock Questions for Due Diligence
export const MOCK_QUESTIONS: Question[] = [
  { 
    id: 1, 
    text: "实际控制人及主要股东名单", 
    isAnswered: true,
    details: "需确认持股比例超过5%的所有自然人及法人股东，并核对最新的工商变更记录。" 
  },
  { 
    id: 2, 
    text: "近三年主营业务收入及增长率", 
    isAnswered: false,
    details: "重点关注2021-2023年的审计报告数据，区分核心业务与非核心业务收入。"
  },
  { 
    id: 3, 
    text: "实际控制人及主要股东名单 (重复核实)", 
    isAnswered: false 
  },
  { 
    id: 4, 
    text: "近三年主营业务收入及增长率 (财务)", 
    isAnswered: false 
  },
  { 
    id: 5, 
    text: "核心管理层是否存在竞业禁止协议冲突", 
    isAnswered: false 
  },
  { 
    id: 6, 
    text: "研发投入资本化处理是否符合会计准则", 
    isAnswered: false 
  },
];

// Mock Transcription Chat
export const MOCK_CHAT: ChatMessage[] = [
  {
    id: '1',
    sender: 'User',
    text: "张总您好，感谢您的时间。我们之前已经审阅了公司2020至2023年的审计报告。今天想就几个关键财务问题与您深入沟通。首先，我们看到公司过去三年收入增长非常亮眼，年复合增长率超过50%。能否请您拆解一下？",
  },
  {
    id: '2',
    sender: 'Interviewee',
    text: "李经理好，您的问题很关键。我们的增长是一个组合效应，但可以量化说明：约60%来自现有核心产品在华东、华南新城市渠道的渗透（新客户拓展）；约30%来自我们智能安防系列产品上市后带来的增量。",
  }
];

// Mock Interviews for Home Page
export const MOCK_INTERVIEWS: Interview[] = [
  {
    id: 1,
    title: "A公司流贷尽调访谈",
    date: "2023-10-24 14:30",
    status: 'ongoing',
    type: "尽调",
  },
  {
    id: 2,
    title: "B公司高管管理层访谈",
    date: "2023-10-22 09:00",
    status: 'ongoing',
    type: "访谈",
  },
  {
    id: 3,
    title: "C公司前期初步沟通",
    date: "2023-10-15 16:00",
    status: 'archived',
    type: "会议",
  },
  {
    id: 4,
    title: "D公司现场考察记录",
    date: "2023-09-28 10:00",
    status: 'archived',
    type: "考察",
  }
];

// Placeholder for the 3D Fox Mascot
export const MASCOT_IMAGE_URL = "/assets/mascot.png";

// Rocket Mascot for Reports
export const ROCKET_MASCOT_URL = "https://img.freepik.com/premium-photo/3d-fox-cartoon-character-riding-rocket-blue-background-generative-ai_438099-13275.jpg?w=740";
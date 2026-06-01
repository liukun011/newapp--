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

// Placeholder for the 3D Fox Mascot
export const MASCOT_IMAGE_URL = `${import.meta.env.BASE_URL || '/'}assets/mascot.png`;

// 模板分类
export const TEMPLATE_CATEGORY_OPTIONS = [
  { id: '信贷尽调', title: '信贷尽调' },
  { id: '数字化转型诊断', title: '数字化转型诊断' },
  { id: '不良资产', title: '不良资产' },
] as const;

export const getCategoryTitle = (category?: string) =>
  TEMPLATE_CATEGORY_OPTIONS.find((o) => o.id === category)?.title ?? '未分类';

// 模板使用范围
export const SCOPE_PERSONAL = 'personal';
export const SCOPE_ORGANIZATION = 'organization';
export const SCOPE_PUBLIC = 'public';

export const TEMPLATE_SCOPE_OPTIONS = [
  { id: SCOPE_PERSONAL, title: '个人使用' },
  { id: SCOPE_ORGANIZATION, title: '全员使用' },
  { id: SCOPE_PUBLIC, title: '网络公开' },
] as const;

export type TemplateScope = (typeof TEMPLATE_SCOPE_OPTIONS)[number]['id'];
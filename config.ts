/**
 * 环境配置文件
 *
 * 取值优先级（高 → 低）：
 *   ① window.APP_CONFIG    —— 部署后修改 config.js，运行时覆盖
 *   ② import.meta.env      —— 构建时由 .env 文件 + --mode 注入
 *   ③ 硬编码默认值          —— 相对路径兜底
 */

// 接口配置全局声明
declare global {
  interface Window {
    APP_CONFIG?: {
      VITE_API_BASE_URL: string;
      VITE_AUTH_BASE_URL: string;
      VITE_ENV?: string;
    };
  }
}

/**
 * 核心配置抽取函数
 */
const getVal = (key: 'VITE_API_BASE_URL' | 'VITE_AUTH_BASE_URL', defaultVal: string) => {
  // ① 运行时覆盖：部署后修改 config.js 可生效
  if (typeof window !== 'undefined' && window.APP_CONFIG?.[key]) {
    return window.APP_CONFIG[key]!;
  }
  // ② 构建时注入：对应 .env.{mode} 中的值，已内联到产物
  const envVal = import.meta.env[key];
  if (envVal) return envVal;
  // ③ 硬编码兜底
  return defaultVal;
};

// 当前环境模式
const mode = (import.meta.env.MODE || 'development');

const config = {
  // 注意：在 axios 实例创建后，直接修改 baseURL 可能无效
  // 所以默认值必须具有普适性（走相对路径代理）
  get apiBaseUrl() {
    return getVal('VITE_API_BASE_URL', '/report');
  },

  get authBaseUrl() {
    return getVal('VITE_AUTH_BASE_URL', '/auth');
  },

  get env() {
    return (typeof window !== 'undefined' && window.APP_CONFIG?.VITE_ENV)
      || import.meta.env.VITE_ENV
      || mode;
  },

  get uploadUrl() {
    return `${this.apiBaseUrl}/upload/file`;
  },
  
  get isDev() { return this.env === 'development'; },
  get isTest() { return this.env === 'test'; },
  get isProd() { return this.env === 'production' || !this.env; }
};

// 调试日志
if (typeof window !== 'undefined') {
  setTimeout(() => {
    console.log(`%c🌟 [Config Center] Final API URL: ${config.apiBaseUrl}`, "color: #4338CA; font-weight: bold;");
  }, 1000);
}

export default config;

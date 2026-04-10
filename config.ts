/**
 * 环境配置文件 - 增强版获取逻辑
 * 
 * 解决逻辑：
 * 1. 优先级：window.APP_CONFIG > 相对路径默认值
 * 2. 使用动态读取，确保在应用运行期间随时获取最新配置
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
  if (typeof window !== 'undefined' && window.APP_CONFIG && window.APP_CONFIG[key]) {
    return window.APP_CONFIG[key];
  }
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
    return (typeof window !== 'undefined' && window.APP_CONFIG?.VITE_ENV) || mode;
  },

  get uploadUrl() {
    return `${this.apiBaseUrl}/interview/uploadInterviewInstRecordFileNew`;
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

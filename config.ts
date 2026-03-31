/**
 * 环境配置文件
 * 
 * 环境说明：
 * - development: 开发环境 (http://dev.example.com/api)
 * - test: 测试环境 (http://test.example.com/api)
 * - production: 生产环境 (https://api.example.com)
 * 
 * 使用方式：
 * - 开发环境: yarn dev (默认) 或 yarn dev --mode development
 * - 测试环境: yarn dev:test
 * - 开发环境构建: yarn build
 * - 测试环境构建: yarn build:test
 * - 生产环境构建: yarn build:prod
 */

// 接口配置全局声明
declare global {
  interface Window {
    APP_CONFIG?: {
      VITE_API_BASE_URL: string;
      VITE_AUTH_BASE_URL: string;
      VITE_ENV: string;
    };
  }
}

// 环境类型定义
export type EnvMode = 'development' | 'test' | 'production';

// 当前环境：打包的时候自动匹配对应环境 (development/test/production)
const env = (import.meta.env.MODE || 'development') as EnvMode;
const isDevInternal = env === 'development';

// 各环境默认基准配置（.env.xxx 文件的源代码整合）
const DEFAULT_CONFIGS: Record<EnvMode, { api: string; auth: string }> = {
  development: {
    api: 'http://68.79.42.215/report',
    auth: 'https://user.binarysee.com.cn'
  },
  test: {
    api: 'http://68.79.42.215/report',
    auth: 'https://user.binarysee.com.cn'
  },
  production: {
    api: 'https://xiaoli.binarysee.com/report',
    auth: 'https://user.binarysee.com'
  }
};

// 优先级：外部 window.APP_CONFIG > 内部默认值
const finalApiUrl = window.APP_CONFIG?.VITE_API_BASE_URL || (isDevInternal ? DEFAULT_CONFIGS.development.api : DEFAULT_CONFIGS[env].api);
const finalAuthUrl = window.APP_CONFIG?.VITE_AUTH_BASE_URL || (isDevInternal ? DEFAULT_CONFIGS.development.auth : DEFAULT_CONFIGS[env].auth);

// 环境配置集
const config = {
  // 接口基础路径
  apiBaseUrl: finalApiUrl,
  
  // 认证接口绝对域名
  authBaseUrl: finalAuthUrl,

  // 环境名称
  env,
  
  // 环境判断
  isDev: env === 'development',
  isTest: env === 'test',
  isProd: env === 'production',

  // 上传地址
  uploadUrl: `${finalApiUrl}/upload/file`,

};

// 打印当前环境配置及来源
console.log(`%c🌟 [Config Center] Current Env: ${config.env}`, "color: #4338CA; font-weight: bold; font-size: 14px;");
console.log(`%c[Config Center] API Base: ${config.apiBaseUrl}`, "color: #1E293B; font-weight: bold;");
console.log(`%c[Config Center] Auth Base: ${config.authBaseUrl}`, "color: #1E293B; font-weight: bold;");
console.log(`%c[Config Center] Origin Source: ${window.APP_CONFIG ? 'External config.js' : 'System Internal Source'}`, window.APP_CONFIG ? "color: #20C997; font-weight: bold;" : "color: #EF4444; font-weight: bold;");


export default config;

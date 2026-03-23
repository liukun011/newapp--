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

// 是否为本地开发环境
const isDevInternal = import.meta.env.MODE === 'development';

// 当前环境：如果是本地开发，强制走 development；如果是构建后的包，优先取外部 config.js 的 VITE_ENV
const env = (isDevInternal ? 'development' : (window.APP_CONFIG?.VITE_ENV || import.meta.env.MODE || 'development')) as EnvMode;

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

// 环境配置集
const config = {
  // 接口基础路径 (如果是本地开发，强制锁定开发配置；打包后才读取外部 APP_CONFIG)
  apiBaseUrl: isDevInternal 
    ? DEFAULT_CONFIGS.development.api 
    : (window.APP_CONFIG?.VITE_API_BASE_URL || DEFAULT_CONFIGS[env].api),
  
  // 认证接口绝对域名
  authBaseUrl: isDevInternal 
    ? DEFAULT_CONFIGS.development.auth 
    : (window.APP_CONFIG?.VITE_AUTH_BASE_URL || DEFAULT_CONFIGS[env].auth),

  // 环境名称
  env,
  
  // 环境判断
  isDev: env === 'development',
  isTest: env === 'test',
  isProd: env === 'production',

  // 上传地址
  uploadUrl: `${isDevInternal ? DEFAULT_CONFIGS.development.api : (window.APP_CONFIG?.VITE_API_BASE_URL || DEFAULT_CONFIGS[env].api)}/upload/file`,

};

// 打印当前环境配置（仅在开发和测试环境）
if (config.env !== 'production') {
  console.log('🌟 当前配置(统一配置中心):', {
    环境: config.env,
    API地址: config.apiBaseUrl,
    Auth地址: config.authBaseUrl,
    配置来源: window.APP_CONFIG ? '外部 JS' : '内部源代码'
  });
}

export default config;

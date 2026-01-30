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

// 环境类型定义
export type EnvMode = 'development' | 'test' | 'production';

// 当前环境
const env = (import.meta.env.MODE || 'development') as EnvMode;

// 环境配置
const config = {
  // 接口基础路径
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://dev.example.com/api',
  
  // 环境名称
  env,
  
  // 环境判断
  isDev: env === 'development',
  isTest: env === 'test',
  isProd: env === 'production',

  // 上传地址
  uploadUrl: `${import.meta.env.VITE_API_BASE_URL || 'http://68.79.42.215/report'}/upload/file`,
};

// 打印当前环境配置（仅在开发和测试环境）
if (!config.isProd) {
  console.log('🌟 当前环境配置:', {
    环境: config.env,
    API地址: config.apiBaseUrl,
  });
}

export default config;

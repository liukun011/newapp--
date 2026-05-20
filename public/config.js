/**
 * 此文件为外部配置文件，打包后映射到根目录的 config.js。
 * 运维人员在部署后可以直接修改此文件来生效不同环境的 API 地址。
 */
window.APP_CONFIG = {
  // 认证中心基础路径
  // VITE_AUTH_BASE_URL: 'http://user.binarysee.com/auth/', // 正式环境
  VITE_AUTH_BASE_URL: 'http://192.168.8.201:21000/auth/', // 测试环境
  // VITE_AUTH_BASE_URL: 'http://192.168.8.200:20101/auth/', // 开发环境
  // 业务接口基础路径
  // VITE_API_BASE_URL: 'http://192.168.8.200:20101/report/', 开发环境
  VITE_API_BASE_URL: 'http://192.168.8.201:20101/report/', // 测试环境
  // VITE_API_BASE_URL: '/report/', // 正式环境
};

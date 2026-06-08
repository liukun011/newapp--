/**
 * 运行时外部配置文件（优先级高于构建时注入的默认值）。
 * 部署后可直接修改此文件以覆盖 API 地址，无需重新构建。
 *
 * 此文件在 dev/build 时会被 Vite 插件根据 --mode 自动替换为对应环境的值。
 * 以下空值仅为占位模板，实际运行时会 fallback 到 .env.* 注入的配置。
 */
window.APP_CONFIG = {
  VITE_AUTH_BASE_URL: '/mock-auth',
  VITE_API_BASE_URL: '/mock-report',
  VITE_ENV: 'mock',
};

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import svgr from 'vite-plugin-svgr';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const authBaseUrl = env.VITE_AUTH_BASE_URL || 'http://192.168.8.201:21000';
  const apiBaseUrl = env.VITE_API_BASE_URL || 'http://192.168.8.201:20101/report';
  // 取 apiBaseUrl 的 origin（去掉路径部分）
  const apiOrigin = new URL(apiBaseUrl).origin;

  return {
  base: '/talk-assistant/',
  plugins: [
    react(),
    svgr({
      include: '**/*.svg?react',
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      // 用户中心接口代理（iam / token 等路径）
      '/api/iam': {
        target: authBaseUrl,
        changeOrigin: true,
        configure: (proxy, options) => {
          proxy.on('proxyRes', (proxyRes) => {
            proxyRes.headers['x-real-origin'] = options.target as string;
          });
          proxy.on('proxyReq', (_proxyReq, req) => {
            console.log(`[Proxy] API IAM: ${req.url} -> ${options.target}`);
          });
        }
      },
      '/token': {
        target: authBaseUrl,
        changeOrigin: true,
        configure: (proxy, options) => {
          proxy.on('proxyRes', (proxyRes) => {
            proxyRes.headers['x-real-origin'] = options.target as string;
          });
          proxy.on('proxyReq', (_proxyReq, req) => {
            console.log(`[Proxy] TOKEN: ${req.url} -> ${options.target}`);
          });
        }
      },
      // 业务接口代理
      '/report': {
        target: apiOrigin,
        changeOrigin: true,
        configure: (proxy, options) => {
          proxy.on('proxyRes', (proxyRes) => {
            proxyRes.headers['x-real-origin'] = options.target as string;
          });
          proxy.on('proxyReq', (_proxyReq, req) => {
            console.log(`[Proxy] REPORT: ${req.url} -> ${options.target}${req.url}`);
          });
        }
      },
    },
  },
  build: {
    outDir: 'talk-assistant',
    sourcemap: false,
    rollupOptions: {
      output: {
        // 添加时间戳到文件名，确保每次构建都是唯一的文件名，解决缓存问题
        entryFileNames: `assets/[name]-[hash]-${new Date().getTime()}.js`,
        chunkFileNames: `assets/[name]-[hash]-${new Date().getTime()}.js`,
        assetFileNames: `assets/[name]-[hash]-${new Date().getTime()}.[ext]`,
      },
    },
  },
  // esbuild: {
  //   drop: ['console', 'debugger'],
  // },
  };
});
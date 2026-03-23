import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import svgr from 'vite-plugin-svgr';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 默认基准配置（与 config.ts 保持一致）
  const authBaseUrl = 'https://user.binarysee.com.cn';
  const apiBaseUrl = 'http://68.79.42.215/report';
  
  // 提取 origin (用于代理)
  const getOrigin = (url: string) => {
    try {
      return new URL(url).origin;
    } catch {
      return url;
    }
  };

  const apiOrigin = getOrigin(apiBaseUrl);

  return {
  base: '/talk-assistant/',
  plugins: [
    react(),
    svgr({
      include: '**/*.svg?react',
    }),
    // 自动生成 config.js 插件
    {
      name: 'generate-config',
      closeBundle() {
        // 与 config.ts 保持一致的默认值
        const defaults: any = {
          test: {
            api: 'http://68.79.42.215/report',
            auth: 'https://user.binarysee.com.cn'
          },
          production: {
            api: 'https://xiaoli.binarysee.com/report',
            auth: 'https://user.binarysee.com'
          }
        };

        const currentConfig = defaults[mode] || defaults.test;
        
        const configContent = `window.APP_CONFIG = {
  VITE_API_BASE_URL: '${currentConfig.api}',
  VITE_AUTH_BASE_URL: '${currentConfig.auth}',
  VITE_ENV: '${mode}'
};`;
        
        const outDir = path.resolve(__dirname, 'talk-assistant');
        if (!fs.existsSync(outDir)) {
          fs.mkdirSync(outDir, { recursive: true });
        }
        fs.writeFileSync(path.resolve(outDir, 'config.js'), configContent);
        console.log(`\n✅ 已根据模式 [${mode}] 自动生成外部配置文件: config.js`);
      }
    }
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
      // 用户中心接口代理
      // 用户中心接口代理
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
        entryFileNames: `assets/[name]-[hash]-${new Date().getTime()}.js`,
        chunkFileNames: `assets/[name]-[hash]-${new Date().getTime()}.js`,
        assetFileNames: `assets/[name]-[hash]-${new Date().getTime()}.[ext]`,
      },
    },
  },
  };
});
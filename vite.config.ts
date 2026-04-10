import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import svgr from 'vite-plugin-svgr';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 尝试从 public/config.js 物理文件中提取配置
 * 解决 vite.config.ts (Node侧) 无法访问浏览器运行时 window 变量的问题
 */
const getExternalConfig = () => {
  try {
    const configPath = path.resolve(__dirname, 'public/config.js');
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8');
      // 简单的正则匹配提取
      const apiMatch = content.match(/VITE_API_BASE_URL\s*:\s*['"](.*?)['"]/);
      const authMatch = content.match(/VITE_AUTH_BASE_URL\s*:\s*['"](.*?)['"]/);
      return {
        VITE_API_BASE_URL: apiMatch ? apiMatch[1] : '',
        VITE_AUTH_BASE_URL: authMatch ? authMatch[1] : ''
      };
    }
  } catch (e) {
    console.warn('[ViteConfig] Failed to read public/config.js', e);
  }
  return {};
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 1. 读取变量优先级：外部 config.js > 环境变量 > 默认值
  const envVars = loadEnv(mode, process.cwd());
  const externalConfig = getExternalConfig();
  
  const authBaseUrl = externalConfig.VITE_AUTH_BASE_URL || envVars.VITE_AUTH_BASE_URL || '/auth';
  const apiBaseUrl = externalConfig.VITE_API_BASE_URL || envVars.VITE_API_BASE_URL || '/report';
  
  // 打印代理信息，方便调试
  console.log(`\x1b[36m[ViteConfig] Proxy AUTH to:\x1b[0m ${authBaseUrl}`);
  console.log(`\x1b[36m[ViteConfig] Proxy API to:\x1b[0m ${apiBaseUrl}`);

  // 提取 origin (用于代理目标，proxy 只接受协议+主机+端口的部分)
  const getOrigin = (url: string) => {
    if (!url) return '';
    try {
      return new URL(url).origin;
    } catch {
      return url;
    }
  };

  const apiOrigin = getOrigin(apiBaseUrl);
  const authOrigin = getOrigin(authBaseUrl);

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
        // 用户中心接口代理
        '/api/iam': {
          target: authOrigin,
          changeOrigin: true,
          secure: false,
          configure: (proxy, options) => {
            proxy.on('proxyReq', (_proxyReq, req) => {
              // 打印详细信息以确认代理地址是否生效
              console.log(`[Proxy Request] IAM: ${req.url} -> ${options.target}`);
            });
            proxy.on('error', (err, req, res) => {
              console.error('[Proxy Error] IAM:', err);
            });
          }
        },
        '/token': {
          target: authOrigin,
          changeOrigin: true,
          secure: false,
        },
        // 业务接口代理
        '/report': {
          target: apiOrigin,
          changeOrigin: true,
          secure: false,
          configure: (proxy, options) => {
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
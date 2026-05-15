import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import svgr from 'vite-plugin-svgr';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 运行时配置注入插件。
 *
 * - dev 模式：通过 configureServer 中间件拦截 /config.js，返回对应 mode 的配置
 * - build 模式：通过 closeBundle 将对应 mode 的配置写入输出目录 config.js
 *
 * 让 public/config.js 作为空壳模板，dev/build 时用对应 .env.{mode} 的值动态注入，
 * 同时保留部署后手动修改 config.js 覆盖的能力。
 */
function injectRuntimeConfig(mode: string, env: Record<string, string>): Plugin {
  const apiBaseUrl = env.VITE_API_BASE_URL || '';
  const authBaseUrl = env.VITE_AUTH_BASE_URL || '';

  const content = `/**
 * 运行时外部配置文件（优先级高于构建时注入的默认值）。
 * 部署后可直接修改此文件以覆盖 API 地址，无需重新构建。
 * 由构建工具根据 --mode ${mode} 自动生成。
 */
window.APP_CONFIG = {
  VITE_AUTH_BASE_URL: '${authBaseUrl}',
  VITE_API_BASE_URL: '${apiBaseUrl}',
};
`;

  // 复用 Vite 解析后的 outDir，避免与 build.outDir 重复定义
  let resolvedOutDir: string;

  return {
    name: 'inject-runtime-config',
    enforce: 'post',

    configResolved(config) {
      resolvedOutDir = config.build.outDir;
    },

    // dev 模式：拦截 /config.js 请求，返回当前 mode 的配置
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url === '/config.js' || req.url === '/talk-assistant/config.js') {
          const res = _res;
          res.setHeader('Content-Type', 'application/javascript');
          res.statusCode = 200;
          res.end(content);
          if (process.env.DEBUG) {
            console.log(`\x1b[36m[inject-runtime-config] served config.js for dev mode: ${mode}\x1b[0m`);
          }
          return;
        }
        next();
      });
    },

    // build 模式：产物输出后，写入对应 mode 的 config.js
    closeBundle() {
      const configPath = path.join(resolvedOutDir, 'config.js');
      try {
        fs.writeFileSync(configPath, content, 'utf-8');
        console.log(`\x1b[36m[inject-runtime-config] config.js generated for mode: ${mode}\x1b[0m`);
      } catch (e) {
        console.error(`\x1b[31m[inject-runtime-config] Failed to write config.js: ${e}\x1b[0m`);
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const envVars = loadEnv(mode, process.cwd());

  const authServer = envVars.VITE_AUTH_SERVER || '';
  const apiServer = envVars.VITE_API_SERVER || '';

  // 打印代理信息，方便调试
  console.log(`\x1b[36m[ViteConfig] Proxy AUTH to:\x1b[0m ${authServer}`);
  console.log(`\x1b[36m[ViteConfig] Proxy API to:\x1b[0m ${apiServer}`);

  return {
    base: '/talk-assistant/',
    plugins: [
      react(),
      svgr({
        include: '**/*.svg?react',
      }),
      injectRuntimeConfig(mode, envVars),
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
          target: authServer,
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
          target: authServer,
          changeOrigin: true,
          secure: false,
        },
        // 业务接口代理
        '/report': {
          target: apiServer,
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
      outDir: `dist/${mode}/talk-assistant`,
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
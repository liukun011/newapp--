import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  base: '/talk-assistant/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  server: {
    host: true,
    port: 5173,
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
  esbuild: {
    drop: ['console', 'debugger'],
  },
});
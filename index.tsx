import ReactDOM from 'react-dom/client';
import { Toast } from 'react-vant';

// Set global Toast duration to 3 seconds as early as possible
Toast.setDefaultOptions({ duration: 3000 });

import App from './App';
import './index.css';
// Initialize VConsole only in development or test environments
import VConsole from 'vconsole';

// VConsole 实例引用，避免重复创建
let vConsoleInstance: VConsole | null = null;

// 开发环境直接初始化 VConsole
import envConfig from './config';

const initVConsole = () => {
  // 开发环境或测试环境均初始化 VConsole
  if ((envConfig.isDev || envConfig.isTest) && !vConsoleInstance) {
    vConsoleInstance = new VConsole();
  }
};

initVConsole();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(<App />);
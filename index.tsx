import ReactDOM from 'react-dom/client';
import { Toast } from 'react-vant';

// Set global Toast duration to 3 seconds as early as possible
Toast.setDefaultOptions({ duration: 3000 });

import App from './App';
import './index.css';
// Initialize VConsole only in development or test environments
import VConsole from 'vconsole';

// Initialize VConsole logic
const initVConsole = () => {
  const mode = import.meta.env.MODE;
  const isDev = mode === 'development';
  const isTest = mode === 'test';

  let shouldShow = isDev;

  // 在测试环境下，额外判断特定用户
  if (isTest) {
    try {
      const userInfoStr = localStorage.getItem('zov-user-info');
      if (userInfoStr) {
        const userInfo = JSON.parse(userInfoStr);
        // 假设用户信息中有 mobile 或 phone 字段，根据实际情况调整
        // 这里匹配 13278852398
        if (userInfo.mobile === '13278852398' || userInfo.username === '13278852398') {
          shouldShow = true;
        }
      }
    } catch (e) {
      console.error('Failed to parse user info for VConsole check', e);
    }
  }

  if (shouldShow) {
    new VConsole();
  }
};

initVConsole();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(<App />);
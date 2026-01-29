import axios, { AxiosRequestConfig } from 'axios';
import envConfig from './config';
import { Toast } from 'react-vant';
import 'react-vant/lib/index.css';

// 创建 axios 实例
const instance = axios.create({
  baseURL: envConfig.apiBaseUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器：注入 Token 并处理 FormData
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('zov-user-token');
    if (token && config.headers) {
      config.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    }

    // 如果是 FormData，删除 Content-Type，让浏览器自动设置（包含 boundary）
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器：处理状态码
// 响应拦截器：处理状态码
instance.interceptors.response.use(
  (response) => {
    const res = response.data;
    // 全局处理业务逻辑错误
    if (res && typeof res === 'object' && res.success === false) {
      const msg = res.message || '请求失败';
      Toast.fail(msg);

      return Promise.reject(new Error(msg));
    }
    return res;
  },
  (error) => {
    const message = error.response?.data?.message || error.message || '网络错误';

    // 抛出错误提示
    Toast.fail(message);

    if (error.response?.status === 401) {
      localStorage.removeItem('zov-user-token');
      localStorage.removeItem('zov-user-info');
      // 延迟触发跳转事件，让用户能看清提示 (可选，如果不延迟，Toast 可能会因为页面切换闪烁，但 react-vant Toast 默认是单例 portal，应该没问题)
      setTimeout(() => {
        window.dispatchEvent(new Event('unauthorized'));
      }, 1000);
    }

    return Promise.reject(new Error(message));
  }
);

/**
 * 封装的请求函数
 */
export async function request<T>(url: string, options: AxiosRequestConfig = {}): Promise<T> {
  return instance.request<any, T>({
    url,
    ...options,
  });
}

export default instance;

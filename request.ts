import axios, { AxiosRequestConfig } from 'axios';
import envConfig from './config';

// 创建 axios 实例
const instance = axios.create({
  baseURL: envConfig.apiBaseUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器：注入 Token
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('zov-user-token');
    if (token && config.headers) {
      config.headers.Authorization = `${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器：处理状态码
instance.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const message = error.response?.data?.message || error.message || '网络错误';
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

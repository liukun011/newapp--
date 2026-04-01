import axios, { AxiosRequestConfig } from 'axios';
import envConfig from './config';
import { Toast } from 'react-vant';
import 'react-vant/lib/index.css';

// ── 处理 402 组织切换静默恢复逻辑 ──────────────────────────────
let recoveryPromise: Promise<void> | null = null;
const recoverFrom402 = async () => {
  if (recoveryPromise) return recoveryPromise;

  recoveryPromise = (async () => {
    try {
      console.log('[Request] 402 detected, starting silent recovery...');
      // 1. 清理业务侧 SSO 缓存 (不传参)
      await instance.post('/user/sso/cleanCache').catch(err => console.warn('Clean cache fail', err));
      // 2. 拉取最新用户信息 (包含最新的 tenantId)
      const resUser: any = await authInstance.post('/api/iam/users/userinfo');
      
      if (resUser.successful && resUser.data) {
        localStorage.setItem('zov-user-info', JSON.stringify(resUser.data));
        console.log('✅ [Request] User info synced after 402. New tenant:', resUser.data.tenantName);
        
        // 3. 全局广播同步事件，供组件（如 HomePage）捕获并刷新列表
        window.dispatchEvent(new Event('tenant-synced'));
        Toast.info({ message: `发现组织变更为 [${resUser.data.tenantName}]，正在自动切换`, duration: 2000 });
      }
    } catch (e) {
      console.error('❌ [Request] 402 recovery failed:', e);
    } finally {
      recoveryPromise = null;
    }
  })();

  return recoveryPromise;
};

// ── 公共拦截器逻辑 ──────────────────────────────────────────
function applyInterceptors(inst: ReturnType<typeof axios.create>) {
  // 请求拦截器：注入 Token、TenantId 并处理 FormData
  inst.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('zov-user-token');
      if (token && config.headers) {
        config.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      }

      // 注入 tenantId（从用户信息中读取）
      try {
        const userInfoStr = localStorage.getItem('zov-user-info');
        if (userInfoStr) {
          const userInfo = JSON.parse(userInfoStr);
          config.headers['Tenant'] = userInfo.tenantId || '';
        }
      } catch {
        // ignore parse error
      }

      // 如果是 FormData，删除 Content-Type，让浏览器自动设置（包含 boundary）
      if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
      }

      return config;
    },
    (error) => Promise.reject(error)
  );

  // 响应拦截器：处理状态码
  inst.interceptors.response.use(
    (response) => {
      const res = response.data;
      if (res && typeof res === 'object' && res.success === false) {
        const msg = res.message || '请求失败';
        return Promise.reject(new Error(msg));
      }
      return res;
    },
    (error) => {
      // ── 402：组织已在其他端切换，静默恢复，不弹报错 ──
      if (error.response?.status === 402) {
        recoverFrom402();
        return Promise.reject(new Error('TENANT_SWITCH_SILENT'));
      }

      const message = error.response?.data?.message || error.message || '网络错误';
      Toast.fail({ message, duration: 3000 });

      if (error.response?.status === 401) {
        localStorage.removeItem('zov-user-token');
        localStorage.removeItem('zov-user-info');
        setTimeout(() => {
          window.dispatchEvent(new Event('unauthorized'));
        }, 1000);
      }

      return Promise.reject(new Error(message));
    }
  );
}

// ── 业务接口实例（带 baseURL，走 /report 前缀）─────────────
const instance = axios.create({
  baseURL: envConfig.apiBaseUrl,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});
applyInterceptors(instance);

// ── 用户中心接口实例 ─────────────── v───────────────────────────
// 为了实现 Nginx 反向代理以及在开发环境走 Vite Proxy，这里全部强制使用相对路径
const authInstance = axios.create({
  baseURL: '',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});
applyInterceptors(authInstance);

/**
 * 业务接口请求（baseURL = VITE_API_BASE_URL）
 */
export async function request<T>(url: string, options: AxiosRequestConfig = {}): Promise<T> {
  return instance.request<any, T>({ url, ...options });
}

/**
 * 用户中心接口请求（无 baseURL，走 proxy 转发到 21000 端口）
 */
export async function authRequest<T>(url: string, options: AxiosRequestConfig = {}): Promise<T> {
  return authInstance.request<any, T>({ url, ...options });
}

export default instance;

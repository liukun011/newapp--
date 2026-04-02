
import { authRequest, request } from '../request';
import { LoginResponse } from '../types';

// 开发环境通过 Vite proxy 转发，生产环境需 Nginx 配置反向代理
// 路径前缀 /api/iam 和 /token 会被代理到用户中心服务（21000 端口）

interface AuthResponse {
  successful: boolean;
  code: number;
  message: string;
  timestamp: string;
  data: LoginResponse;
}

export const authService = {
  // 密码登录
  login: async (account: string, password: string): Promise<AuthResponse> => {
    return authRequest<AuthResponse>('/api/iam/sso/login-with-password', {
      method: 'POST',
      data: {
        account,
        password,
        autoRegister: true,
        registerChannel: 'XIAO_LI_REPORT',
      },
    });
  },
  // 验证码登录
  loginWithPhoneCode: async (mobile: string, captcha: string): Promise<AuthResponse> => {
    return authRequest<AuthResponse>('/api/iam/sso/login-with-phonecode', {
      method: 'POST',
      data: {
        mobile,
        captcha,
        autoRegister: true,
        registerChannel: 'XIAO_LI_REPORT',
      },
    });
  },

  // 发送验证码
  sendSms: async (mobile: string): Promise<AuthResponse> => {
    return authRequest<AuthResponse>('/api/iam/sso/send-sms', {
      method: 'POST',
      data: {
        mobile,
        autoRegister: true,
      },
    });
  },

  // 发送找回密码验证码
  sendResetPwdSms: async (mobile: string): Promise<AuthResponse> => {
    return authRequest<AuthResponse>('/api/iam/password_reset/sendSms', {
      method: 'POST',
      data: {
        mobile,
      },
    });
  },

  // 重置密码
  resetPassword: async (data: { mobile: string; captcha: string; newPassword: string; confirmPassword: string }): Promise<AuthResponse> => {
    return authRequest<AuthResponse>('/api/iam/password_reset/reset_password', {
      method: 'POST',
      data,
    });
  },

  // 退出登录
  logout: async (): Promise<any> => {
    return authRequest<any>('/api/iam/token/logout', {
      method: 'POST',
    });
  },

  // 获取用户信息
  getUserInfo: async (): Promise<any> => {
    return authRequest<any>('/api/iam/users/userinfo', {
      method: 'POST',
    });
  },

  // 更新用户信息
  updateUserInfo: async (data: any): Promise<any> => {
    return authRequest<any>('/api/iam/token/change_info', {
      method: 'PUT',
      data,
    });
  },

  // 上传文件（如头像）
  uploadFile: async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);

    return authRequest<any>('/api/iam/users/upload', {
      method: 'POST',
      data: formData,
    });
  },

  // 获取组织列表
  getTenants: async (): Promise<any> => {
    return authRequest<any>('/api/iam/users/tenants', {
      method: 'GET',
    });
  },

  // 切换组织
  switchTenant: async (tenantId: string): Promise<any> => {
    const res = await authRequest<any>('/api/iam/users/change_tenant', {
      method: 'POST',
      data: { tenantId },
    });

    // 切换成功后，调用业务侧清理缓存接口（不带参）
    try {
      await request('/user/sso/cleanCache', {
        method: 'POST',
      });
      console.log('✅ SSO Clean cache success');
    } catch (err) {
      console.error('❌ SSO Clean cache failed:', err);
    }

    return res;
  },

  // 修改组织信息
  updateTenant: async (tenantId: string, data: any): Promise<any> => {
    return authRequest<any>(`/api/iam/tenants/${tenantId}/modify`, {
      method: 'PUT',
      data,
    });
  },

  // 获取组织下的人员
  getOrganizationUsers: async (data: { current: number; size: number; orgId: string }): Promise<any> => {
    return authRequest<any>('/api/iam/user_org/page_users', {
      method: 'POST',
      data,
    });
  },

  // 注销账号
  deleteAccount: async (): Promise<any> => {
    return authRequest<any>('/token/unregister', {
      method: 'POST',
    });
  },
};

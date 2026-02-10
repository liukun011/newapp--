
import { request } from '../request';
import { LoginResponse } from '../types';

const AUTH_BASE_URL = import.meta.env.VITE_AUTH_BASE_URL || 'https://user.binarysee.com.cn';

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
    return request<AuthResponse>(`${AUTH_BASE_URL}/api/iam/sso/login-with-password`, {
      method: 'POST',
      data: {
        account,
        password,
        autoRegister: true,
      },
    });
  },
  // 验证码登录
  loginWithPhoneCode: async (mobile: string, captcha: string): Promise<AuthResponse> => {
    return request<AuthResponse>(`${AUTH_BASE_URL}/api/iam/sso/login-with-phonecode`, {
      method: 'POST',
      data: {
        mobile,
        captcha,
        autoRegister: true,
      },
    });
  },

  // 发送验证码
  sendSms: async (mobile: string): Promise<AuthResponse> => {
    return request<AuthResponse>(`${AUTH_BASE_URL}/api/iam/sso/send-sms`, {
      method: 'POST',
      data: {
        mobile,
        autoRegister: true,
      },
    });
  },

  // 退出登录
  logout: async (): Promise<AuthResponse> => {
    return request<AuthResponse>(`${AUTH_BASE_URL}/api/iam/token/logout`, {
      method: 'POST',
    });
  },

  // 获取用户信息
  getUserInfo: async (): Promise<any> => {
    return request<any>(`${AUTH_BASE_URL}/api/iam/users/userinfo`, {
      method: 'POST',
    });
  },

  // 更新用户信息
  updateUserInfo: async (data: any): Promise<any> => {
    return request<any>(`${AUTH_BASE_URL}/api/iam/token/change_info`, {
      method: 'PUT',
      data,
    });
  },

  // 上传文件（如头像）
  uploadFile: async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    
    return request<any>(`${AUTH_BASE_URL}/api/iam/users/upload`, {
      method: 'POST',
      data: formData,
    });
  },
  // 注销账号
  deleteAccount: async (): Promise<any> => {
    return request<any>(`${AUTH_BASE_URL}/token/unregister`, {
      method: 'POST',
    });
  },
};

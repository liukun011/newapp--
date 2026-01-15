
import { request } from '../request';
import { LoginResponse } from '../types';

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
    return request<AuthResponse>('https://user.binarysee.com/api/iam/sso/login-with-password', {
      method: 'POST',
      data: {
        account,
        password,
      },
    });
  },
  // 验证码登录
  loginWithPhoneCode: async (mobile: string, captcha: string): Promise<AuthResponse> => {
    return request<AuthResponse>('https://user.binarysee.com/api/iam/sso/login-with-phonecode', {
      method: 'POST',
      data: {
        mobile,
        captcha,
      },
    });
  },

  // 发送验证码
  sendSms: async (mobile: string): Promise<AuthResponse> => {
    return request<AuthResponse>('https://user.binarysee.com/api/iam/sso/send-sms', {
      method: 'POST',
      data: {
        mobile,
        autoRegister: true,
      },
    });
  },

  // 退出登录
  logout: async (): Promise<AuthResponse> => {
    return request<AuthResponse>('https://user.binarysee.com/api/iam/token/logout', {
      method: 'POST',
    });
  },
};

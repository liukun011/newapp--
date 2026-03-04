import { request } from '../request';

export interface InviteCodeResponse {
  success: boolean;
  code: number;
  message: string;
  data: string;
}

export const userService = {
  /**
   * 查询已有邀请码（不生成新的）
   */
  queryInviteCode: async (): Promise<InviteCodeResponse> => {
    return request<InviteCodeResponse>('/user/invitation', {
      method: 'GET',
    });
  },

  /**
   * 获取/生成我的邀请码
   */
  getInviteCode: async (): Promise<InviteCodeResponse> => {
    return request<InviteCodeResponse>('/user/invitation/inviteCode', {
      method: 'GET',
    });
  },

  /**
   * 导入邀请码
   */
  importInviteCode: async (inviteCode: string): Promise<InviteCodeResponse> => {
    return request<InviteCodeResponse>('/user/invitation/import', {
      method: 'POST',
      data: { inviteCode },
    });
  },
};

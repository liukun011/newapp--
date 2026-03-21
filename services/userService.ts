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
   * @param type - 邀请类型: 'tenant' 组织管理, 'app' 分享应用
   */
  getInviteCode: async (type: 'tenant' | 'app'): Promise<InviteCodeResponse> => {
    return request<InviteCodeResponse>('/user/invitation/inviteCode', {
      method: 'GET',
      params: { type },
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

  /**
   * 获取邀请关联列表
   */
  listRelations: async (): Promise<any> => {
    // 优先尝试走通用的业务前缀 /report/user/invitation/listRelations
    return request<any>('/user/invitation/listRelations', {
      method: 'GET',
    });
  },
};

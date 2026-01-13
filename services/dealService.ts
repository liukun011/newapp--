import { request } from '../request';
import { ApiResponse, PageData, DealRecord } from '../types';

/**
 * 尽调相关服务
 */
export const dealService = {
  /**
   * 分页查询尽调实例列表
   */
  queryDealInstList: (params: {
    pageNo: number;
    pageSize: number;
    dealInstTitle?: string;
    status?: string[];
  }) => {
    return request<ApiResponse<PageData<DealRecord>>>('/deal/queryDealInstListByPage', {
      method: 'POST',
      data: params,
    });
  },

  /**
   * 创建或更新尽调实例
   */
  createOrUpdateDealInst: (params: {
    id?: string;
    interviewCust?: string;
    logo?: string;
  }) => {
    return request<ApiResponse<DealRecord>>('/deal/createOrUpdateDealInst', {
      method: 'POST',
      data: params,
    });
  },

  /**
   * 删除尽调实例
   */
  deleteDealInst: (id: string) => {
    return request<ApiResponse<any>>('/deal/delete', {
      method: 'POST',
      data: { id },
    });
  },

  /**
   * 更换尽调报告模板
   * POST /deal/changeReportTemplate
   */
  changeReportTemplate: (params: {
    id: string;      // 尽调实例 ID
    templateId: string; // 模板 ID
  }) => {
    return request<ApiResponse<any>>('/deal/changeReportTemplate', {
      method: 'POST',
      data: params,
    });
  },

  /**
   * 查询尽调详情（尽调清单）
   * POST /deal/dealInstDetail
   */
  getDealInstDetail: (id: string) => {
    return request<ApiResponse<DealRecord>>('/deal/dealInstDetail', {
      method: 'POST',
      data: { id },
    });
  },
};

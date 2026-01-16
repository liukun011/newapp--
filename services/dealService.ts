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
    questionInfoList?: any[];
    [key: string]: any;
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

  /**
   * 上传尽调资料
   * POST /deal/upload
   * @param dealId 尽调实例 ID
   * @param file 文件
   */
  uploadDealMaterial: (dealId: string, file: File) => {
    const formData = new FormData();
    formData.append('id', dealId);
    formData.append('file', file);
    
    return request<ApiResponse<any>>('/deal/upload', {
      method: 'POST',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * 删除尽调资料
   * POST /deal/delete-file
   * @param dealId 尽调实例 ID
   * @param resourceId 资料 ID
   */
  deleteDealMaterial: (dealId: string, resourceId: string) => {
    return request<ApiResponse<any>>('/deal/delete-file', {
      method: 'POST',
      data: { id: dealId, fileId: resourceId },
    });
  },

  /**
   * 重命名尽调资料
   * POST /deal/rename
   * @param fileId 资料 ID
   * @param fileName 新文件名
   */
  renameDealMaterial: (fileId: string, fileName: string) => {
    return request<ApiResponse<any>>('/deal/rename', {
      method: 'POST',
      data: { fileId, fileName },
    });
  },
};

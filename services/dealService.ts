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
   * 创建访谈实例
   */
  createInterviewInst: (params: {
    interviewDealInstId: string; // 尽调id
    interviewCustom: string;     // 访谈实例对象(客户名称)
  }) => {
    return request<ApiResponse<any>>('/interview/createInterviewInst', {
      method: 'POST',
      data: params,
    });
  },

  /**
   * 查询访谈实例内容列表（录音转写）
   */
  queryInterviewInstContentListByPage: (params: {
    interviewInstId: string;
    pageNum: number;
    pageSize: number;
  }) => {
    return request<ApiResponse<PageData<any>>>('/interview/queryInterviewInstContentListByPage', {
      method: 'POST',
      data: params,
    });
  },

  /**
   * 查询访谈实例列表
   */
  queryInterviewInstListByPage: (params: {
    interviewDealInstId: string; // 尽调 ID
    pageNum?: number;
    pageSize?: number;
  }) => {
    return request<ApiResponse<PageData<any>>>('/interview/queryInterviewInstListByPage', {
      method: 'POST',
      data: params,
    });
  },

  /**
   * 查询访谈实例原始录音文件
   */
  queryInterviewRecordFileInstByInterviewInstId: (params: {
    interviewInstId: string;
  }) => {
    return request<ApiResponse<any>>('/interview/queryInterviewRecordFileInstByInterviewInstId', {
      method: 'POST',
      data: params,
    });
  },

  /**
   * 上传访谈实例录音文件
   */
  uploadInterviewInstRecordFile: (interviewInstId: string, file: File) => {
    const formData = new FormData();
    formData.append('interviewInstId', interviewInstId);
    formData.append('file', file);
    
    return request<ApiResponse<any>>('/interview/uploadInterviewInstRecordFile', {
      method: 'POST',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * 结束访谈实例
   */
  overInterviewInst: (interviewInstId: string) => {
    return request<ApiResponse<any>>('/interview/overInterviewInst', {
      method: 'POST',
      data: { interviewInstId },
    });
  },

  /**
   * 上传访谈实例内容（转写内容）
   */
  uploadInterviewInstContent: (params: {
    interviewInstId: string;
    contentList: Array<{
      id: string;
      content: string;
    }>;
  }) => {
    return request<ApiResponse<any>>('/interview/uploadInterviewInstContent', {
      method: 'POST',
      data: params,
    });
  },

  /**
   * 更新访谈实例
   */
  updateInterviewInst: (params: {
    interviewInstId: string;
    interviewInstTitle: string;
    interviewCustom: string;
  }) => {
    return request<ApiResponse<any>>('/interview/updateInterviewInst', {
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

  /**
   * 归档尽调实例
   * POST /deal/archive
   * @param id 尽调实例 ID
   */
  archiveDeal: (id: string) => {
    return request<ApiResponse<any>>('/deal/archive', {
      method: 'POST',
      data: { id },
    });
  },

  /**
   * 异步生成访谈实例报告
   * POST /interview/generateInterviewInstReportAsync
   * @param interviewDealInstId 尽调实例 ID
   */
  generateInterviewInstReportAsync: (interviewDealInstId: string) => {
    return request<ApiResponse<any>>('/interview/generateInterviewInstReportAsync', {
      method: 'POST',
      data: { interviewDealInstId },
    });
  },


  /**
   * 补充资料信息（语音录入）
   * POST /interview/appendResource
   * @param interviewDealInstId 尽调实例 ID
   * @param appendText 补充的描述文本信息
   */
  appendResource: (params: {
    interviewDealInstId: string;
    appendText: string;
  }) => {
    return request<ApiResponse<any>>('/interview/appendResource', {
      method: 'POST',
      data: params,
    });
  },

  /**
   * 预览报告文件
   * GET /webInterface/url/view
   * @param fileId 文件 ID
   * @param fileUrl 文件 URL
   */
  viewReportUrl: (fileId: string, fileUrl: string) => {
    return request<ApiResponse<any>>('/webInterface/url/view', {
      method: 'GET',
      params: { fileId, fileUrl },
    });
  },
};

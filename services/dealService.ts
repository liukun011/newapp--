import { request } from '../request';
import { ApiResponse, PageData, DealRecord, ReportRecord } from '../types';

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
    // 显式从本地读取最新的组织ID，确保与 userInfo 接口同步后的逻辑一致
    let tenantId = '';
    try {
      const userInfoStr = localStorage.getItem('zov-user-info');
      if (userInfoStr) {
        tenantId = JSON.parse(userInfoStr).tenantId || '';
      }
    } catch (e) {
      console.error('Failed to parse userinfo for tenant header', e);
    }

    return request<ApiResponse<PageData<DealRecord>>>('/deal/queryDealInstListByPage', {
      method: 'POST',
      data: params,
      headers: {
        'Tenant': tenantId
      }
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
    cacheCount?: number;
    pageNum?: number;
    pageSize?: number;
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
   * 上传访谈实例录音文件 (文件流方式)
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
   * 保存访谈实例录音文件 (URL 路径方式)
   */
  saveInterviewInstRecordFile: (params: {
    path: string;
    interviewInstId: string;
  }) => {
    return request<ApiResponse<any>>('/interview/uploadInterviewInstRecordFile', {
      method: 'POST',
      data: params,
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
    interviewInstTitle?: string;
    interviewCustom?: string;
    interviewInstStatus?: string;
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
   * 上传尽调资料
   * POST /deal/upload-resource
   * @param dealId 尽调实例 ID
   * @param file 文件
   */
  uploadDealResource: (dealId: string, pathList: string[]) => {
    return request<ApiResponse<any>>('/deal/upload-resource', {
      method: 'POST',
      data: {
        id: dealId,
        pathList: pathList
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
   * 重新解析尽调资料
   * POST /deal/reparse-file
   * @param dealId 尽调实例 ID
   * @param fileId 资料 ID
   */
  reparseFile: (dealId: string, fileId: string) => {
    return request<ApiResponse<any>>('/deal/reparse-file', {
      method: 'POST',
      data: { id: dealId, fileId },
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
   * 取消归档尽调实例（恢复到进行中）
   * POST /deal/cancelArchive
   * @param id 尽调实例 ID
   */
  cancelArchive: (id: string) => {
    return request<ApiResponse<any>>('/deal/cancelArchive', {
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
   * 给报告添加问题清单
   * POST /deal/addQuestion
   * @param id 尽调实例 ID
   * @param questionIds 问题清单 ID 数组（可传多个，追加到现有清单中）
   */
  addReportQuestionList: (data: { id: string; questionIds: string[] }) => {
    return request<ApiResponse<any>>('/deal/addQuestion', {
      method: 'POST',
      data,
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
  viewReportUrl: (fileId: string | undefined | null, fileUrl: string) => {
    // 手动拼接参数，避免 axios 自动转码
    let url = `/webInterface/url/view?url=${fileUrl}`;
    if (fileId) {
      url += `&fileId=${fileId}`;
    }
    return request<ApiResponse<any>>(url, {
      method: 'GET',
    });
  },

  /**
   * 分页查询报告列表
   * POST /deal/queryDealReportListByPage
   */
  queryDealReportListByPage: (params: {
    pageNo: number;
    pageSize: number;
    fileName?: string; // 搜索关键词
  }) => {
    return request<ApiResponse<PageData<ReportRecord>>>('/deal/queryDealReportListByPage', {
      method: 'POST',
      data: params,
    });
  },

  /**
   * 生成尽调总结
   * POST /interview/summary
   * @param id 尽调实例 ID
   * @param direct 是否直接生成（可选）
   */
  generateInterviewSummary: (id: string, direct?: boolean) => {
    return request<ApiResponse<any>>('/interview/summary', {
      method: 'POST',
      data: { id, direct },
      timeout: 15000,
    });
  },

  /**
   * 根据关键词搜索企业（天眼查接口）
   * GET /api/deal/tyc/search
   */
  searchEnterprise: (word: string) => {
    return request<ApiResponse<any[]>>('/deal/tyc/search', {
      method: 'GET',
      params: { word },
    });
  },

  /**
   * 启动天眼查企业数据异步同步任务
   * GET /api/deal/tyc/sync
   */
  syncEnterprise: (dealId: string) => {
    return request<ApiResponse<any>>('/deal/tyc/sync', {
      method: 'GET',
      params: { dealId },
    });
  },

  /**
   * 获取抓取后的企业基础信息
   * GET /api/deal/tyc/basicInfo
   */
  getEnterpriseBasicInfo: (dealId: string) => {
    return request<ApiResponse<any>>('/deal/tyc/basicInfo', {
      method: 'GET',
      params: { dealId },
    });
  },

  /**
   * 获取 AI 洞察结果
   * GET /api/deal/aiInsight
   */
  aiInsight: (dealId: string, regenerate: boolean = false) => {
    return request<ApiResponse<any[]>>('/deal/aiInsight', {
      method: 'GET',
      params: { dealId, regenerate },
    });
  },
  /**
   * 清除 AI 洞察结果
   * POST /api/deal/clearAiInsight
   */
  clearAiInsight: (dealId: string) => {
    return request<ApiResponse<any>>('/deal/clearAiInsight', {
      method: 'POST',
      data: { dealId },
    });
  },
  /**
   * 获取模板列表
   * GET /api/templateInfo/getTemplateList
   */
  getTemplateList: (interviewDealInstId: string) => {
    return request<ApiResponse<any[]>>('/templateInfo/getTemplateList', {
      method: 'GET',
      params: { interviewDealInstId },
    });
  },

  /**
   * 获取 AI 洞察结果
   * GET /api/deal/aiInsight
   */
  getAiInsight: (dealId: string, regenerate: boolean = false) => {
    return request<ApiResponse<any>>('/deal/aiInsight', {
      method: 'GET',
      params: { dealId, regenerate },
    });
  },

  /**
   * 接纳 AI 洞察建议
   * POST /api/deal/acceptAiInsight
   */
  acceptAiInsight: (dealId: string, aiInsightsList: any[]) => {
    return request<ApiResponse<any>>('/deal/acceptAiInsight', {
      method: 'POST',
      data: { dealId, aiInsights: aiInsightsList, saveToQuestionInfo: true },
    });
  },
};

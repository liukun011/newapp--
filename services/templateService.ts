import { request } from '../request';
import { ApiResponse } from '../types';

/**
 * 模板信息（后端返回的实际数据结构）- 用于 /reportApprove 接口
 */
export interface TemplateRecord {
  id: string;
  agencyId: number;
  centerUserId: number;
  approveReportName: string; // 模板名称
  approveReportStatus: string; // "1"-审批通过，"2"-审批中，"3"-审批未通过
  approveTemplateUrl: string; // 模板文件URL
  createDate: string; // 创建时间
  createUser: number;
  lastModifiedDate: string; // 最后修改时间
  lastModifiedUser: number;
  errorMsg: string | null; // 错误信息
  recStatus: string | null;
}

/**
 * 报告模板信息 - 用于 /template 接口
 */
export interface ReportTemplate {
  id: string;
  businessId: string;
  centerUserId: string | null;
  dealInstId: string | null;
  dealInstTitle: string | null;
  outTemplateId: string;
  viewTemplateUrl: string; // 模板文件URL
  questionId: number;
  recStatus: string;
  reportTemplateName: string; // 模板名称
  reportTemplateStatus: string; // 模板状态
}

/**
 * 模板相关服务
 */
export const templateService = {
  /**
   * 查询审批报告模板
   * GET /reportApprove/queryApproveReport
   * @param approveReportStatus - 可选，模板状态：1-成功，2-上传中，3-失败
   */
  queryApproveReport: (approveReportStatus?: number) => {
    return request<ApiResponse<TemplateRecord[]>>('/reportApprove/queryApproveReport', {
      method: 'GET',
      params: approveReportStatus ? { approveReportStatus } : undefined,
    });
  },

  /**
   * 添加审批报告模板（上传模板）
   * POST /reportApprove/addApproveReport
   */
  addApproveReport: (params: {
    reportName: string;
    file?: File;
  }) => {
    console.log('📤 提交参数:', params);
    
    // 如果有文件，使用 FormData
    if (params.file) {
      console.log('📎 文件信息:', {
        name: params.file.name,
        size: params.file.size,
        type: params.file.type,
      });
      
      const formData = new FormData();
      formData.append('reportName', params.reportName);
      formData.append('file', params.file);
      
      // 不要手动设置 Content-Type，让 axios 自动设置
      return request<ApiResponse<any>>('/reportApprove/addApproveReport', {
        method: 'POST',
        data: formData,
      });
    }
    
    // 没有文件就直接发送 JSON
    return request<ApiResponse<any>>('/reportApprove/addApproveReport', {
      method: 'POST',
      data: { reportName: params.reportName },
    });
  },

  /**
   * 添加审批报告模板（新接口 - 支持 URL）
   * POST /reportApprove/addApproveReportNew
   */
  addApproveReportNew: (params: {
    approveReportName: string;
    approveTemplateUrl: string;
  }) => {
    return request<ApiResponse<any>>('/reportApprove/addApproveReportNew', {
      method: 'POST',
      data: params,
    });
  },

  /**
   * 修改审批报告模板（重命名）
   * POST /reportApprove/updateApproveReport
   */
  updateApproveReport: (params: {
    id: string;
    approveReportName: string;
  }) => {
    return request<ApiResponse<any>>('/reportApprove/updateApproveReport', {
      method: 'POST',
      data: params,
    });
  },

  /**
   * 删除审批报告模板
   * POST /reportApprove/deleteApproveReport
   */
  deleteApproveReport: (id: string) => {
    return request<ApiResponse<any>>('/reportApprove/deleteApproveReport', {
      method: 'POST',
      data: { id },
    });
  },

  /**
   * 更换审批报告模板（替换未通过的模板）
   * POST /reportApprove/replaceApproveReport
   */
  replaceApproveReport: (params: {
    id: string;
    approveReportName: string;
    approveTemplateUrl: string;
  }) => {
    return request<ApiResponse<any>>('/reportApprove/replaceApproveReport', {
      method: 'POST',
      data: params,
    });
  },


  /**
   * 点击发送邮箱审批
   * POST /reportApprove/clickApproveReport
   */
  clickApproveReport: (id: string) => {
    return request<ApiResponse<any>>('/reportApprove/clickApproveReport', {
      method: 'POST',
      data: { id },
    });
  },

  // ========== 报告模板接口 ==========

  /**
   * 查询报告模板列表
   * GET /template/list
   */
  getTemplateList: () => {
    return request<ApiResponse<ReportTemplate[]>>('/template/list', {
      method: 'GET',
    });
  },

  /**
   * 查询报告模板详情
   * GET /template/detail
   */
  getTemplateDetail: (id: string) => {
    return request<ApiResponse<ReportTemplate>>('/template/detail', {
      method: 'GET',
      params: { templateId: id },
    });
  },

  /**
   * 创建模板
   * POST /template/insert
   */
  insertTemplate: (params: {
    templateName: string;
    templateUrl?: string;
  }) => {
    return request<ApiResponse<any>>('/template/insert', {
      method: 'POST',
      data: params,
    });
  },

  /**
   * 删除模板
   * POST /template/delete
   */
  deleteTemplate: (id: string) => {
    return request<ApiResponse<any>>('/template/delete', {
      method: 'POST',
      data: { id },
    });
  },

  /**
   * 查询问题清单模板列表
   * GET /templateInfo/getTemplateList
   */
  getQuestionTemplateList: () => {
    return request<ApiResponse<ReportTemplate[]>>('/templateInfo/getTemplateList', {
      method: 'GET',
    });
  },

  /**
   * 更新问题清单模板信息
   * POST /templateInfo/update
   */
  updateQuestionTemplate: (data: { id: string; templateName: string; templateDesc: string }) => {
    return request<ApiResponse<any>>('/templateInfo/update', {
      method: 'POST',
      data,
    });
  },

  /**
   * 删除问题清单模板
   * POST /templateInfo/delete
   */
  deleteQuestionTemplate: (id: string) => {
    return request<ApiResponse<any>>('/templateInfo/delete', {
      method: 'POST',
      data: { id },
    });
  },

  /**
   * 新增问题清单模板
   * POST /templateInfo/add
   */
  addQuestionTemplate: (data: { templateName: string; templateDesc: string }) => {
    return request<ApiResponse<any>>('/templateInfo/add', {
      method: 'POST',
      data,
    });
  },
};

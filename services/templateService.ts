import { request } from '../request';
import { ApiResponse } from '../types';

/**
 * 模板信息（后端返回的实际数据结构）
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
      
      // 正确的方式查看 FormData 内容
      console.log('📋 FormData 内容:');
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`  ${key}:`, `File(${value.name}, ${value.size} bytes)`);
        } else {
          console.log(`  ${key}:`, value);
        }
      }
      
      // 不要手动设置 Content-Type，让 axios 自动设置（会包含 boundary）
      return request<ApiResponse<any>>('/reportApprove/addApproveReport', {
        method: 'POST',
        data: formData,
      });
    }
    
    // 没有文件就直接发送 JSON
    console.log('📋 发送 JSON 数据:', { reportName: params.reportName });
    return request<ApiResponse<any>>('/reportApprove/addApproveReport', {
      method: 'POST',
      data: { reportName: params.reportName },
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
   * 点击发送邮箱审批
   * POST /reportApprove/clickApproveReport
   */
  clickApproveReport: (id: string) => {
    return request<ApiResponse<any>>('/reportApprove/clickApproveReport', {
      method: 'POST',
      data: { id },
    });
  },
};

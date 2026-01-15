import { request } from '../request';
import { ApiResponse, QuestionInfo } from '../types';

/**
 * 模板信息（包含问题列表）
 */
interface TemplateInfo {
  id: string;
  templateName: string;
  templateType: string;
  businessId: string;
  templateDesc: string;
  templateStatus: string;
  questionList: QuestionInfo[];
  recStatus: string;
}

/**
 * 用户属性查询响应
 */
interface UserPropertiesResponse {
  id: string | null;
  agencyId: string | null;
  recStatus: string | null;
  businessId: string;
  questionId: string;
  templateId: string;
  templateInfoVos: TemplateInfo[];
}

/**
 * 问题信息相关服务
 */
export const questionService = {
  /**
   * 查询模板下的问题列表
   * GET /user/queryUserProperties
   * @param questionId - 问题集合 ID
   * @returns 返回匹配的模板分类的问题列表
   */
  queryQuestionList: async (questionId: string): Promise<ApiResponse<QuestionInfo[]>> => {
    const response = await request<ApiResponse<UserPropertiesResponse>>('/user/queryUserProperties', {
      method: 'GET',
      params: { questionId },
    });

    // 从 templateInfoVos 中找到 id 等于 questionId 的模板分类
    if (response.success && response.data?.templateInfoVos) {
      const matchedTemplate = response.data.templateInfoVos.find(t => t.id === questionId);
      
      if (matchedTemplate) {
        // 找到匹配的模板，返回其问题列表
        return {
          ...response,
          data: matchedTemplate.questionList || [],
        };
      }
    }

    // 没有找到匹配的模板，返回空数组
    return {
      ...response,
      data: [],
    };
  },

  /**
   * 查询所有可用的模板分类及问题
   * GET /user/queryUserProperties
   * @param questionId - 问题集合 ID
   * @returns 返回所有模板分类列表
   */
  queryTemplateCategories: async (questionId: string): Promise<ApiResponse<TemplateInfo[]>> => {
    const response = await request<ApiResponse<UserPropertiesResponse>>('/user/queryUserProperties', {
      method: 'GET',
      params: { questionId },
    });

    if (response.success && response.data?.templateInfoVos) {
      return {
        ...response,
        data: response.data.templateInfoVos,
      };
    }

    return {
      ...response,
      data: [],
    };
  },
};

export type { TemplateInfo, UserPropertiesResponse };

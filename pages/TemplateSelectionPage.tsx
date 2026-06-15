import React, { useState, useEffect } from 'react';
import { ArrowLeft, Eye, Search } from 'lucide-react';
import { FileSpreadsheet } from 'lucide-react';
import { Toast } from 'react-vant';
import { templateService, ReportTemplate } from '../services/templateService';
import { dealService } from '../services/dealService';
import { TemplateEnabledStatus } from '../types';

interface TemplateSelectionPageProps {
  onBack: () => void;
  onPreview: (name: string, url: string, id: string) => void;
  currentTemplateId?: string;
  dealId?: string; // 尽调实例 ID
  onTemplateChanged?: (newTemplateId: string) => void; // 模板更换成功的回调
}

const TemplateSelectionPage: React.FC<TemplateSelectionPageProps> = ({ 
  onBack, 
  onPreview,
  currentTemplateId,
  dealId,
  onTemplateChanged
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>(currentTemplateId);

  useEffect(() => {
    fetchData();
  }, [dealId]);

  // 监听原生返回键
  useEffect(() => {
    const handleNativeBack = (e: Event) => {
      e.preventDefault();
      onBack();
    };

    window.addEventListener('requestNativeBack', handleNativeBack);
    return () => {
      window.removeEventListener('requestNativeBack', handleNativeBack);
    };
  }, [onBack]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 同时获取模板列表和尽调详情
      const [templatesRes, detailRes] = await Promise.all([
        templateService.getTemplateList({ isEnabled: TemplateEnabledStatus.ENABLED }),
        dealId ? dealService.getDealInstDetail(dealId) : Promise.resolve(null),
      ]);

      // 设置模板列表
      if (templatesRes.success && templatesRes.data) {
        setTemplates(templatesRes.data);
      }

      // 从尽调详情中获取已绑定的模板 ID
      if (detailRes && detailRes.success && detailRes.data) {
        const boundTemplateId = detailRes.data.templateId;
        if (boundTemplateId) {
          // templateId 可能是数字或字符串，统一转为字符串匹配
          setSelectedId(String(boundTemplateId));
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = templates.filter(t =>
    t.reportTemplateName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = async (template: ReportTemplate) => {
    // 如果点击的是已选中的模板，不重复调用接口
    if (selectedId === template.id) {
      return;
    }

    if (!dealId) {
      Toast.fail('未找到尽调实例');
      return;
    }

    try {
      Toast.loading({ message: '更换中...', duration: 0 });
      const res = await dealService.changeReportTemplate({
        id: dealId,
        templateId: template.id,
      });
      Toast.clear();

      if (res.success) {
        setSelectedId(template.id);
        Toast.success('更换成功');
        // 通知父组件模板已更换
        onTemplateChanged?.(template.id);
      } else {
        Toast.fail(res.message || '更换失败');
      }
    } catch (error) {
      Toast.clear();
      console.error('Failed to change template:', error);
      Toast.fail('更换失败');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#f7f2e8]">
      {/* Header */}
      <div className="bg-[#fffefa] px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 text-[#4f463b]">
          <ArrowLeft size={24} />
        </button>
        
        {/* Search Bar */}
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="请输入模板名称"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 px-4 pr-10 bg-[#f7f2e8] rounded-[999px] text-sm text-[#1f2024] placeholder-gray-400 focus:outline-none focus:bg-[#f4eee3] transition-colors"
          />
          <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#a49a8d]" />
        </div>
      </div>

      {/* Template List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-[#eadfca] border-t-[#c99a3a] rounded-[999px] animate-spin"></div>
            <p className="text-[#a49a8d] text-sm mt-4">加载中...</p>
          </div>
        ) : (
          <div className="p-4 space-y-0">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                onClick={() => handleSelect(template)}
                className="bg-[#fffefa] p-4 flex items-center gap-3 border-b border-[#eadfca]/60 last:border-b-0 active:bg-[#f7f2e8] transition-colors cursor-pointer"
              >
                {/* Icon */}
                <div className="w-12 h-12 rounded-lg bg-[#E8F8F0] flex items-center justify-center flex-shrink-0 text-[#07C160]">
                  <FileSpreadsheet size={24} strokeWidth={1.5} />
                </div>

                {/* Template Name */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] font-medium text-[#1f2024] truncate">
                    {template.reportTemplateName}
                  </h3>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <button 
                    className="p-2 text-[#a49a8d] hover:text-[#6f665b]"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (template.viewTemplateUrl) {
                        onPreview(template.reportTemplateName, template.viewTemplateUrl, template.id);
                      } else {
                        Toast.info('暂无预览文件');
                      }
                    }}
                  >
                    <Eye size={20} />
                  </button>
                  
                  {/* Radio Button */}
                  <div className={`w-6 h-6 rounded-[999px] border-2 flex items-center justify-center ${
                    selectedId === template.id 
                      ? 'border-[#c99a3a] bg-[#c99a3a]' 
                      : 'border-gray-300'
                  }`}>
                    {selectedId === template.id && (
                      <svg className="w-4 h-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {filteredTemplates.length === 0 && !loading && (
              <div className="text-center py-20 text-[#a49a8d] text-sm">
                暂无模板
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateSelectionPage;

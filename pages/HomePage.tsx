import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Settings,
  FileText,
  Mic,
  Plus,
  LayoutTemplate,
  Trash2,
} from "lucide-react";
import { SwipeCell } from "react-vant";
import Button from "../components/Button";
import Mascot from "../components/Mascot";
import { COLORS } from "../constants";
import { DealRecord } from "../types";
import { dealService } from "../services/dealService";

interface HomePageProps {
  onNavigateToDetail: (deal: DealRecord) => void;
  onCreateNewDeal?: (deal: DealRecord) => void;
  onNavigateToRecording?: (deal: DealRecord) => void;
  onNavigateToTemplates?: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ 
  onNavigateToDetail, 
  onCreateNewDeal, 
  onNavigateToRecording,
  onNavigateToTemplates 
}) => {
  const [activeTab, setActiveTab] = useState<"ongoing" | "archived">("ongoing");
  const [searchTerm, setSearchTerm] = useState(""); // 输入框的值
  const [searchQuery, setSearchQuery] = useState(""); // 实际用于查询的值
  const [loading, setLoading] = useState(false);
  const [deals, setDeals] = useState<DealRecord[]>([]);

  const isFirstRender = useRef(true);

  // 统一处理所有数据获取
  useEffect(() => {
    // 首次渲染立即请求
    if (isFirstRender.current) {
      isFirstRender.current = false;
      fetchDeals();
      return;
    }

    // 只有切换Tab时才自动执行搜索
    fetchDeals();
  }, [activeTab, searchQuery]);

  const fetchDeals = async () => {
    setLoading(true);
    try {
      const res = await dealService.queryDealInstList({
        pageNo: 0,
        pageSize: 50,
        dealInstTitle: searchQuery,
        status: activeTab === "ongoing" ? ["1"] : ["2"], // 状态是字符串数组
      });
      if (res.success && res.data) {
        console.log(res.data);
        setDeals(res.data.records || []);
      }
    } catch (error) {
      console.error("Failed to fetch deals:", error);
    } finally {
      setLoading(false);
    }
  };

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // 如果清空了输入框，立即搜索
    if (value === '') {
      setSearchQuery('');
    }
  };

  // 手动触发搜索
  const handleSearch = () => {
    setSearchQuery(searchTerm);
  };

  // 支持回车键搜索
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个访谈吗？")) {
      return;
    }
    try {
      const res = await dealService.deleteDealInst(id);
      if (res.success) {
        // 删除成功后刷新列表
        fetchDeals();
      }
    } catch (error) {
      console.error("Failed to delete deal:", error);
    }
  };

  return (
    <div className="flex flex-col h-screen relative bg-[#F7F8FA]">
      {/* Top Gradient Background */}
      <div
        className="absolute top-0 left-0 right-0 h-64 z-0 pointer-events-none"
        style={{
          background: `linear-gradient(180deg, ${COLORS.backgroundStart} 0%, rgba(255,255,255,0) 100%)`,
        }}
      />

      {/* Header Area */}
      <div className="relative z-10 px-4 pt-4 pb-2">
        {/* Top Bar */}
        <div className="flex items-center gap-2 mb-4">
          {/* Search Box */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="请搜索访谈"
              value={searchTerm}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              className="w-full h-[42px] px-4 pr-11 bg-white border-2 border-indigo-400 rounded-[30px] text-sm text-slate-800 placeholder-gray-400 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <button
              onClick={handleSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-indigo-600 active:scale-95 transition-all"
            >
              <Search size={18} />
            </button>
          </div>
          <button 
            onClick={onNavigateToTemplates}
            className="flex flex-col items-center justify-center min-w-[48px] text-slate-600 hover:text-indigo-600 active:scale-95 transition-all"
          >
            <LayoutTemplate size={20} strokeWidth={2} />
            <span className="text-[11px] mt-0.5 font-medium">模板</span>
          </button>
          <button className="flex flex-col items-center justify-center min-w-[48px] text-slate-600 hover:text-indigo-600 active:scale-95 transition-all">
            <Settings size={20} strokeWidth={2} />
            <span className="text-[11px] mt-0.5 font-medium">设置</span>
          </button>
        </div>

        {/* Welcome Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-lg font-bold text-slate-800 mb-1">
              你好，我是你的访谈助手，小狸！
            </h2>
            <p className="text-xs text-slate-500">
              今日已有 {deals.filter((d) => d.status === "1").length}{" "}
              个进行中的访谈任务
            </p>
            <div className="mt-3 flex gap-2">
              <span className="inline-flex items-center px-2 py-1 rounded-md bg-indigo-50 text-indigo-600 text-[10px] font-medium">
                尽调助手
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded-md bg-orange-50 text-orange-600 text-[10px] font-medium">
                会议记录
              </span>
            </div>
          </div>
          <div className="w-24 h-24 -mr-2 -my-4 relative">
            <Mascot size="small" />
            <div className="absolute inset-0 z-20" />{" "}
            {/* Transparent overlay to prevent image interaction */}
          </div>
          {/* Decorative background circle */}
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-indigo-50 rounded-full z-0 opacity-50" />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative z-10 mt-2 min-h-0">
        {/* Tabs */}
        <div className="flex px-4 border-b border-gray-100 bg-transparent flex-shrink-0">
          <button
            className={`mr-6 py-3 text-[15px] font-bold relative transition-colors ${
              activeTab === "ongoing" ? "text-slate-800" : "text-gray-400"
            }`}
            onClick={() => setActiveTab("ongoing")}
          >
            进行中
            {activeTab === "ongoing" && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[3px] bg-indigo-600 rounded-full" />
            )}
          </button>
          <button
            className={`py-3 text-[15px] font-bold relative transition-colors ${
              activeTab === "archived" ? "text-slate-800" : "text-gray-400"
            }`}
            onClick={() => setActiveTab("archived")}
          >
            已归档
            {activeTab === "archived" && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[3px] bg-indigo-600 rounded-full" />
            )}
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24 min-h-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <p className="text-gray-400 text-sm mt-4">加载中...</p>
            </div>
          ) : (
            <>
              {deals.map((item) => (
                <SwipeCell
                  key={item.id}
                  className="mb-3"
                  rightAction={
                    <button
                      className="h-full px-6 bg-red-500 text-white flex items-center justify-center rounded-r-2xl"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 size={20} />
                    </button>
                  }
                >
                  <div
                    onClick={() => onNavigateToDetail(item)}
                    className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex items-center gap-4 active:scale-[0.99] transition-transform"
                  >
                    {/* Icon/Logo */}
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-inner bg-indigo-50 text-indigo-500 overflow-hidden">
                      {item.logo ? (
                        <img 
                          src={item.logo} 
                          alt={item.interviewCust}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FileText size={24} className="drop-shadow-sm" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[15px] font-bold text-slate-800 truncate mb-1">
                        {item.interviewCust}
                      </h3>
                      <div className="flex items-center text-xs text-gray-400">
                        <span className="mr-2">进度: {item.progress}%</span>
                        <span className="w-1 h-1 rounded-full bg-gray-300 mr-2" />
                        <span>
                          状态: {item.status === "1" ? "进行中" : "已归档"}
                        </span>
                      </div>
                    </div>

                    {/* Action */}
                    <button
                      className="w-8 h-8 rounded-full border border-indigo-100 flex items-center justify-center text-indigo-600 hover:bg-indigo-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onNavigateToRecording) {
                          onNavigateToRecording(item);
                        } else {
                          onNavigateToDetail(item);
                        }
                      }}
                    >
                      <Mic size={16} />
                    </button>
                  </div>
                </SwipeCell>
              ))}

              {deals.length === 0 && (
                <div className="text-center py-10 text-gray-400 text-sm">
                  暂无访谈记录
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Floating Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent pt-10 z-20">
        <Button
          block
          size="large"
          onClick={async () => {
            try {
              const res = await dealService.createOrUpdateDealInst({});
              if (res.success && res.data) {
                // 如果提供了 onCreateNewDeal，使用它（导航到 MaterialUploadPage）
                // 否则使用 onNavigateToDetail（导航到 DueDiligencePage）
                if (onCreateNewDeal) {
                  onCreateNewDeal(res.data);
                } else {
                  onNavigateToDetail(res.data);
                }
              }
            } catch (error) {
              console.error("Failed to create deal:", error);
            }
          }}
          className="shadow-xl shadow-indigo-500/30 !rounded-2xl h-14 text-lg"
        >
          <Plus size={20} className="mr-2" /> 新建访谈
        </Button>
      </div>
    </div>
  );
};

export default HomePage;

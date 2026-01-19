import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  Trash2,
  Check,
  Bell,
  FileText,
  Plus,
} from "lucide-react";
import { SwipeCell, PullRefresh } from "react-vant";
import Mascot from "../components/Mascot";
import { COLORS } from "../constants";
import { DealRecord } from "../types";
import { dealService } from "../services/dealService";

interface HomePageProps {
  onNavigateToDetail: (deal: DealRecord) => void;
  onCreateNewDeal?: (deal: DealRecord) => void;
  onNavigateToRecording?: (deal: DealRecord) => void;
  onNavigateToTemplates?: () => void;
  onNavigateToSettings?: () => void;
  onNavigateToMessages?: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ 
  onNavigateToDetail, 
  onNavigateToRecording,
  onNavigateToMessages,
}) => {
  const [activeTab, setActiveTab] = useState<"ongoing" | "archived">("ongoing");
  const [searchTerm, setSearchTerm] = useState(""); // 输入框的值
  const [searchQuery, setSearchQuery] = useState(""); // 实际用于查询的值
  const [loading, setLoading] = useState(false);
  const [deals, setDeals] = useState<DealRecord[]>([]);
  const [showLimitTips, setShowLimitTips] = useState(false);
  
  // 删除确认弹框
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingDealId, setDeletingDealId] = useState<string | null>(null);

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

  const fetchDeals = async (showGlobalLoading = true) => {
    if (showGlobalLoading) setLoading(true);
    try {
      // 如果是下拉刷新，人为增加一点延迟，让Loading动画展示得更清楚
      const apiPromise = dealService.queryDealInstList({
        pageNo: 0,
        pageSize: 50,
        dealInstTitle: searchQuery,
        status: activeTab === "ongoing" ? ["1"] : ["2"], 
      });
      
      const delayPromise = !showGlobalLoading 
        ? new Promise(resolve => setTimeout(resolve, 800)) 
        : Promise.resolve();

      const [res] = await Promise.all([apiPromise, delayPromise]);

      if (res.success && res.data) {
        console.log(res.data);
        setDeals(res.data.records || []);
      }
    } catch (error) {
      console.error("Failed to fetch deals:", error);
    } finally {
      if (showGlobalLoading) setLoading(false);
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
    // 显示确认弹框
    setDeletingDealId(id);
    setShowDeleteConfirm(true);
  };

  // 确认删除
  const confirmDelete = async () => {
    if (!deletingDealId) return;
    
    try {
      const res = await dealService.deleteDealInst(deletingDealId);
      if (res.success) {
        // 删除成功后刷新列表
        fetchDeals();
      }
    } catch (error) {
      console.error("Failed to delete deal:", error);
    } finally {
      setShowDeleteConfirm(false);
      setDeletingDealId(null);
    }
  };

  // 取消删除
  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeletingDealId(null);
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
      <div className="bg-gradient-to-b from-[#E0EAFF] to-[#F7F8FA] px-4 pt-12 pb-4 flex-shrink-0 relative">
        
        {/* Custom Limit Tips Toast */}
        {showLimitTips && (
           <div className="fixed top-24 left-4 right-4 z-50 animate-[slideDown_0.3s_ease-out_forwards] flex justify-center">
             <div className="bg-black/30 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2">
               <span className="text-sm font-medium tracking-wide">
                 您正有一个访谈正在进行中，暂时不支持开启新任务。
               </span>
             </div>
           </div>
        )}

        {/* Header: Search & Bell */}
        <div className="flex items-center gap-3 mb-6">
          {/* Search Box */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="请搜索访谈"
              value={searchTerm}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              className="w-full h-[44px] px-5 bg-white rounded-full text-[15px] text-slate-800 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
            />
            <button
              onClick={handleSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-indigo-600 active:scale-95 transition-all"
            >
              <Search size={20} />
            </button>
          </div>
          
          <button 
            className="relative w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm active:scale-95 transition-transform"
            onClick={onNavigateToMessages}
          >
             <Bell size={20} className="text-slate-700" />
             <div className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white" />
          </button>
        </div>

        {/* AI Analysis Banner */}
        <div className="bg-gradient-to-r from-[#EAF2FF] to-[#DCE9FF] rounded-2xl p-5 mb-2 relative overflow-hidden shadow-sm">
          <div className="relative z-10 max-w-[60%]">
             <h2 className="text-[19px] font-black text-[#1A4B8B] mb-2 leading-tight">
               AI 智能资料分析
             </h2>
             <p className="text-[11px] text-[#486DA5] leading-relaxed opacity-90">
               AI赋能，全方位深度挖掘资料细节与潜在规律，智能提炼高价值关键信息
             </p>
             <div className="mt-3 flex gap-1">
               <div className="w-1.5 h-1.5 rounded-full bg-white/60"></div>
               <div className="w-4 h-1.5 rounded-full bg-white"></div>
               <div className="w-1.5 h-1.5 rounded-full bg-white/60"></div>
             </div>
          </div>
          
          {/* Right Image */}
          <div className="absolute top-0 right-0 bottom-0 w-[45%]">
             <img 
               src="/talk-assistant/assets/home.png" 
               alt="AI Analysis" 
               className="w-full h-full object-contain object-right-bottom scale-110 translate-y-2 translate-x-2"
             />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative z-10 min-h-0 bg-[#F7F8FA] rounded-t-3xl -mt-4 px-4 pt-6">
        
        <h3 className="text-lg font-bold text-slate-800 mb-4 px-1">访谈记录</h3>

        {/* Tabs - Segmented Control Style */}
        <div className="bg-gray-100 p-1 rounded-xl flex mb-4">
          <button
            className={`flex-1 py-2 text-[14px] font-bold rounded-lg transition-all ${
              activeTab === "ongoing" 
                ? "bg-white text-indigo-600 shadow-sm" 
                : "text-gray-500 hover:text-gray-600"
            }`}
            onClick={() => setActiveTab("ongoing")}
          >
            进行中
          </button>
          <button
            className={`flex-1 py-2 text-[14px] font-bold rounded-lg transition-all ${
              activeTab === "archived" 
                ? "bg-white text-indigo-600 shadow-sm" 
                : "text-gray-500 hover:text-gray-600"
            }`}
            onClick={() => setActiveTab("archived")}
          >
            已归档
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto space-y-3 pb-24 min-h-0 -mx-4 px-4 scroll-smooth">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <p className="text-gray-400 text-sm mt-4">加载中...</p>
            </div>
          ) : (
            <PullRefresh 
              onRefresh={() => fetchDeals(false)}
              successText={
                <div className="flex items-center justify-center gap-1 text-gray-600">
                  <Check size={16} />
                  <span>加载成功</span>
                </div>
              }
            >
              {deals.map((item) => (
                <div key={item.id} className="mb-2">
                  <SwipeCell
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
                      className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex gap-4 active:scale-[0.99] transition-transform"
                    >
                      {/* Icon/Logo */}
                      <div className="w-16 h-16 rounded-xl flex-shrink-0 flex items-center justify-center shadow-inner bg-indigo-50 text-indigo-500 overflow-hidden">
                        {item.logo ? (
                          <img 
                            src={item.logo} 
                            alt={item.interviewCust}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FileText size={30} className="drop-shadow-sm" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between h-16">
                        <div className="flex justify-between items-start">
                          <h3 className="text-[16px] font-bold text-slate-800 truncate mb-1">
                            {item.interviewCust}
                          </h3>
                          {item.status === '3' && (
                            <span className="px-2.5 py-1 bg-[#E0F7FA] text-[#00B5B5] text-[11px] font-medium rounded-lg">
                              访谈中
                            </span>
                          )}
                        </div>
                        
                        <div>
                           <button
                             className="bg-[#4E3EF8] text-white text-[13px] font-medium px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-md shadow-indigo-200 active:scale-95 transition-transform"
                             onClick={(e) => {
                                e.stopPropagation();
                                
                                const activeDeal = deals.find(d => d.status === '3');
                                if (activeDeal && activeDeal.id !== item.id) {
                                  setShowLimitTips(true);
                                  setTimeout(() => setShowLimitTips(false), 3000);
                                  return;
                                }

                                if (onNavigateToRecording) {
                                  onNavigateToRecording(item);
                                } else {
                                  onNavigateToDetail(item);
                                }
                             }}
                           >
                             <Plus size={14} strokeWidth={2.5} /> 访谈录音
                           </button>
                        </div>
                      </div>
                    </div>
                  </SwipeCell>
                </div>
              ))}

              {deals.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 opacity-80">
                   <div className="w-24 h-24 relative mb-2">
                     <Mascot size="small" />
                   </div>
                   <p className="text-xs text-gray-400">小狸可以帮你做访谈记录，写尽调报告</p>
                </div>
              )}
            </PullRefresh>
          )}
          
        </div>
      </div>



      {/* 删除确认弹框 - Portal to Body */}
      {showDeleteConfirm && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* 半透明背景 */}
          <div 
            className="absolute inset-0 bg-black/40"
            onClick={cancelDelete}
          />
          
          {/* 弹框内容 */}
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-fadeIn">
            {/* 标题 */}
            <h3 className="text-center text-lg font-semibold text-slate-800 mb-4">
              提示
            </h3>
            
            {/* 提示文字 */}
            <p className="text-center text-slate-600 mb-6">
              是否确认删除当前访谈?
            </p>
            
            {/* 按钮组 */}
            <div className="flex gap-3">
              {/* 取消按钮 */}
              <button
                onClick={cancelDelete}
                className="flex-1 h-12 rounded-full border-2 border-gray-200 text-slate-700 font-medium hover:bg-gray-50 active:scale-95 transition-all"
              >
                取消
              </button>
              
              {/* 确认按钮 */}
              <button
                onClick={confirmDelete}
                className="flex-1 h-12 rounded-full bg-indigo-600 text-white font-medium hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-500/30"
              >
                确认
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default HomePage;

import React, { useState, useEffect, useRef } from "react";
import { useThrottleFn } from "../hooks/useThrottleFn";
import {
  Search,
  Trash2,
  Check,
  Bell,
  FileText,
  Plus,
  Clock,
} from "lucide-react";
import { SwipeCell, PullRefresh, Toast, Swiper } from "react-vant";
import Mascot from "../components/Mascot";

import { DealRecord } from "../types";
import { dealService } from "../services/dealService";
import { useRecordingStore } from "../store/useRecordingStore";
import { formatTime } from "../utils/dateUtils";

interface HomePageProps {
  onNavigateToDetail: (deal: DealRecord) => void;
  onNavigateToRecording?: (deal: DealRecord) => void;
  onNavigateToTemplates?: () => void;
  onNavigateToSettings?: () => void;
  onNavigateToMessages?: () => void;
  initialTab?: "ongoing" | "archived";
  onTabChange?: (tab: "ongoing" | "archived") => void;
}

const HomePage: React.FC<HomePageProps> = ({ 
  onNavigateToDetail, 
  onNavigateToRecording,
  initialTab = "ongoing",
  onTabChange,
}) => {
  const [activeTab, setActiveTab] = useState<"ongoing" | "archived">(initialTab);
  const [searchTerm, setSearchTerm] = useState(""); // 输入框的值
  const [searchQuery, setSearchQuery] = useState(""); // 实际用于查询的值
  const [loading, setLoading] = useState(false);
  const [deals, setDeals] = useState<DealRecord[]>([]);
  const [showLimitTips, setShowLimitTips] = useState(false);
  const { currentDealId } = useRecordingStore();
  
  // 分页状态
  const [pageNo, setPageNo] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // 删除确认弹框
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingDealId, setDeletingDealId] = useState<string | null>(null);

  // 新建尽调弹框


  // SwipeCell 强制刷新 key
  const [swipeCellKey, setSwipeCellKey] = useState(0);

  // Swipe Item State
  const [swipingItemId, setSwipingItemId] = useState<string | null>(null);

  // AI Banner 轮播状态
  const bannerItems = [
    {
      title: "AI资料分析",
      description: "全方位深度挖掘资料细节与潜在规律，提炼高价值关键信息"
    },
    {
      title: "智能问题生成",
      description: "基于上传资料自动生成专业访谈问题，提升尽调效率与质量"
    },
    {
      title: "实时语音转写",
      description: "访谈过程实时转写记录，自动匹配问题答案，生成结构化报告"
    }
  ];

  const isFirstRender = useRef(true);

  // 统一处理所有数据获取
  useEffect(() => {
    // 首次渲染立即请求
    if (isFirstRender.current) {
      isFirstRender.current = false;
      fetchDeals(true, true); // 首次加载，重置分页
      return;
    }

    // 只有切换Tab或搜索时才重新加载
    fetchDeals(true, true); // 重置分页
  }, [activeTab, searchQuery]);

  // 自动加载更多直到内容可滚动
  useEffect(() => {
    // 延迟检查，确保DOM已更新
    const timer = setTimeout(() => {
      if (scrollContainerRef.current && !loading && !loadingMore && hasMore && deals.length > 0) {
        const { scrollHeight, clientHeight } = scrollContainerRef.current;
        // 如果内容高度不足以产生滚动条，自动加载更多
        if (scrollHeight <= clientHeight) {
          loadMore();
        }
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [deals, loading, loadingMore, hasMore]);

  const lastScrollTop = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    
    // 检测是否滚动到底部，触发加载更多
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 50;
    if (isNearBottom && hasMore && !loadingMore && !loading) {
      loadMore();
    }
    
    lastScrollTop.current = scrollTop;
  };

  // 加载更多数据
  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    try {
      const nextPage = pageNo + 1;
      const res = await dealService.queryDealInstList({
        pageNo: nextPage,
        pageSize: 10, // 每次加载10条
        dealInstTitle: searchQuery,
        status: activeTab === "ongoing" ? ["1"] : ["5"],
      });

      if (res.success && res.data) {
        const newDeals = res.data.records || [];
        setDeals(prev => [...prev, ...newDeals]);
        setPageNo(nextPage);
        setHasMore(newDeals.length >= 10); // 返回10条说明还有更多
        
        // 强制 SwipeCell 重新渲染
        setTimeout(() => {
          setSwipeCellKey(prev => prev + 1);
        }, 100);
      }
    } catch (error) {
      console.error("Failed to load more deals:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const fetchDeals = async (showGlobalLoading = true, resetPage = false) => {
    if (showGlobalLoading) setLoading(true);
    
    const currentPage = resetPage ? 1 : pageNo;
    
    try {
      // 如果是下拉刷新，人为增加一点延迟，让Loading动画展示得更清楚
      const apiPromise = dealService.queryDealInstList({
        pageNo: currentPage,
        pageSize: 10, // 每次加载10条
        dealInstTitle: searchQuery,
        status: activeTab === "ongoing" ? ["1"] : ["5"], 
      });
      
      const delayPromise = !showGlobalLoading 
        ? new Promise(resolve => setTimeout(resolve, 800)) 
        : Promise.resolve();

      const [res] = await Promise.all([apiPromise, delayPromise]);

      if (res.success && res.data) {
        console.log(res.data);
        const newDeals = res.data.records || [];
        
        if (resetPage) {
          setDeals(newDeals);
          setPageNo(1);
        } else {
          setDeals(prev => [...prev, ...newDeals]);
        }
        
        // 判断是否还有更多数据（返回10条说明还有更多）
        setHasMore(newDeals.length >= 10);
        
        // 强制 SwipeCell 重新渲染，确保滑动功能正常
        setTimeout(() => {
          setSwipeCellKey(prev => prev + 1);
        }, 100);
      }
    } catch (error) {
      console.error("Failed to fetch deals:", error);
    } finally {
      if (showGlobalLoading) setLoading(false);
    }
  };

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // 清除之前的定时器
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // 设置新的定时器，500ms后执行搜索
    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(value);
    }, 500);
  };

  // 清除搜索定时器
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

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
    // 校验是否有正在进行的访谈（悬浮窗存在 即 currentDealId 不为空）
    if (currentDealId && currentDealId === id) {
      Toast.info('当前访谈正在录音中，无法删除');
      return;
    }
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
        Toast.success('删除成功');

        // Check if the deleted deal is the currently active one for recording
        const store = useRecordingStore.getState();
        if (store.currentDealId === deletingDealId) {
          console.log('[HomePage] Deleting active deal, resetting recording store...');
          store.reset();
        }

        // 删除成功后刷新列表（重置分页，从第1页开始加载）
        fetchDeals(true, true);
      } else {
        Toast.fail(res.message || '删除失败');
      }
    } catch (error) {
      console.error("Failed to delete deal:", error);
      Toast.fail('删除失败');
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



  // Throttled Handlers
  const handleNavigateThrottled = useThrottleFn((item: DealRecord) => {
    onNavigateToDetail(item);
  }, 1000);

  const handleRecordClickThrottled = useThrottleFn((e: React.MouseEvent, item: DealRecord) => {
    e.stopPropagation();
    
    if (item.status === '5') {
      return;
    }

    // 校验是否有正在进行的访谈（悬浮窗存在 即 currentDealId 不为空）
    if (currentDealId && currentDealId !== item.id) {
      setShowLimitTips(true);
      setTimeout(() => setShowLimitTips(false), 3000);
      return;
    }

    if (onNavigateToRecording) {
      onNavigateToRecording(item);
    } else {
      onNavigateToDetail(item);
    }
  }, 1000);

  const handleDeleteThrottled = useThrottleFn((id: string) => {
    handleDelete(id);
  }, 1000);

  const handleConfirmDeleteThrottled = useThrottleFn(confirmDelete, 1000);


  return (
    <div className="flex flex-col h-screen relative bg-[#F7F8FA]">
      {/* Top Fixed Header: Search & Bell */}
      <div className="bg-[#F7F8FA] px-4 pt-4 pb-0 flex-shrink-0 relative z-40">
        {/* Custom Limit Tips Toast */}
        {showLimitTips && (
           <div className="fixed top-20 left-4 right-4 z-[100] animate-[slideDown_0.3s_ease-out_forwards] flex justify-center">
             <div className="bg-black/30 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2">
               <span className="text-sm font-medium tracking-wide">
                 您正有一个访谈正在进行中，暂时不支持开启新任务。
               </span>
             </div>
           </div>
        )}

        <div className="flex items-center gap-3">
          {/* Search Box */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="请搜索访谈"
              value={searchTerm}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              className="w-full h-[44px] px-5 bg-white rounded-full text-[15px] text-slate-800 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all border border-gray-100"
            />
            <button
              onClick={handleSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-indigo-600 active:scale-95 transition-all"
            >
              <Search size={20} />
            </button>
          </div>
          
          <button 
            className="relative w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm border border-gray-100 active:scale-95 transition-transform"
            onClick={() => Toast.info({ 
              message: '功能开发中，敬请期待！',
            })}
          >
             <Bell size={20} className="text-slate-700" />
             <div className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white" />
          </button>
        </div>
      </div>

      {/* Main Scrollable Content Area */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto relative z-10 scroll-smooth bg-[#F7F8FA]"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
          {/* Banner inside scroll area */}
          <div className="px-4 mb-[14px] mt-[14px]">
            <div className="rounded-2xl shadow-sm overflow-hidden transform transition-transform active:scale-[0.99]">
              <Swiper 
                autoplay={3000} 
                className="h-[150px] w-full"
                style={{ borderRadius: '16px' }}
              >
                {bannerItems.map((item, index) => (
                  <Swiper.Item key={index}>
                    <div 
                      className="h-full w-full relative p-5"
                      style={{ background: 'linear-gradient(270deg, #C3D1FD 0%, #CADCF9 0%, #E6F2FF 100%)' }}
                    >
                      <div className="relative z-10 max-w-[60%] h-full flex flex-col justify-center">
                        <h2 className="text-[19px] font-black text-[#1A4B8B] mb-2 leading-tight">
                          {item.title}
                        </h2>
                        <p className="text-[11px] text-[#486DA5] leading-relaxed opacity-90 min-h-[54px] line-clamp-3">
                          {item.description}
                        </p>
                      </div>
                      
                      {/* Right Image */}
                      <div className="absolute top-0 right-0 bottom-0 w-[45%] pointer-events-none">
                        <img 
                          src="/talk-assistant/assets/home.png" 
                          alt="Analysis" 
                          className="w-full h-full object-contain object-right-bottom scale-110 -translate-y-5 translate-x-2"
                        />
                      </div>
                    </div>
                  </Swiper.Item>
                ))}
              </Swiper>
            </div>
          </div>

          {/* Sticky Header: Title + Tabs */}
          <div className="sticky top-0 z-40 bg-[#F7F8FA] pt-1 pb-2 px-4 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.02)]">
            <h3 className="text-lg font-bold text-slate-800 mb-2 px-1">访谈记录</h3>
            <div className="bg-gray-100 p-1 rounded-xl flex">
              <button
                className={`flex-1 py-1.5 text-[14px] font-bold rounded-lg transition-all ${
                  activeTab === "ongoing" 
                    ? "bg-white text-indigo-600 shadow-sm" 
                    : "text-gray-500 hover:text-gray-600"
                }`}
                onClick={() => {
                  setActiveTab("ongoing");
                  onTabChange?.("ongoing");
                }}
              >
                进行中
              </button>
              <button
                className={`flex-1 py-1.5 text-[14px] font-bold rounded-lg transition-all ${
                  activeTab === "archived" 
                    ? "bg-white text-indigo-600 shadow-sm" 
                    : "text-gray-500 hover:text-gray-600"
                }`}
                onClick={() => {
                  setActiveTab("archived");
                  onTabChange?.("archived");
                }}
              >
                已归档
              </button>
            </div>
          </div>

          {/* List Content with PullRefresh */}
          <PullRefresh 
            onRefresh={() => fetchDeals(false, true)}
            successText={
              <div className="flex items-center justify-center gap-1 text-gray-600">
                <Check size={16} />
                <span>加载成功</span>
              </div>
            }
            headHeight={60}
          >
          <div className="px-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-gray-400 text-sm mt-4">加载中...</p>
              </div>
            ) : deals.length === 0 ? (
              <div className="min-h-[40vh] flex flex-col items-center justify-center opacity-80">
                 <div className="relative mb-3 flex items-center justify-center">
                   <Mascot size="medium" />
                 </div>
                 <p className="text-xs text-gray-400">小狸可以帮你做访谈记录，写尽调报告</p>
              </div>
            ) : (
              <div className={`flex flex-col ${deals.length <= 2 ? 'pb-4' : 'pb-32'}`}>
                {deals.map((item) => {
                  const isSwiping = swipingItemId === item.id;
                  return (
                    <div key={item.id} className="mb-2">
                      <SwipeCell
                        key={`${item.id}-${swipeCellKey}`}
                        onOpen={() => setSwipingItemId(item.id)}
                        onClose={() => setSwipingItemId(null)}
                        rightAction={
                          <button
                            className="h-full px-6 bg-red-500 text-white flex items-center justify-center rounded-r-2xl"
                            onClick={() => handleDeleteThrottled(item.id)}
                          >
                            <Trash2 size={20} />
                          </button>
                        }
                      >
                        <div
                          onClick={() => handleNavigateThrottled(item)}
                          className={`bg-white flex flex-col shadow-[0_2px_8px_rgba(0,0,0,0.04)] active:scale-[0.99] transition-transform overflow-hidden rounded-l-2xl ${
                            isSwiping ? 'rounded-r-none' : 'rounded-r-2xl'
                          }`}
                        >
                          {/* Upper Section: Icon + Title/Summary */}
                          <div className="flex gap-4 p-4 pb-3">
                            {/* Icon/Logo */}
                            <div className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center shadow-inner bg-indigo-50 text-indigo-500 overflow-hidden">
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

                            {/* Text Content */}
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                              <div className="flex justify-between items-start mb-1">
                                <h3 className="text-[16px] font-bold text-slate-800 truncate pr-2 flex-1 leading-snug">
                                  {item.interviewCust}
                                </h3>
                                {/* 访谈中 标签 */}
                                {(currentDealId === item.id) && (
                                  <span className="flex-shrink-0 px-2 py-0.5 bg-[#E0F7FA] text-[#00B5B5] text-[10px] font-medium rounded-md transform translate-y-0.5 ml-1">
                                    访谈中
                                  </span>
                                )}
                              </div>
                              <p className="text-[13px] text-gray-400 truncate">
                                {item.dealSummary || "访谈小总结未生成，请刷新生成"}
                              </p>
                            </div>
                          </div>

                          {/* Divider */}
                          <div className="h-[1px] bg-gray-100 mx-4" />

                          {/* Lower Section: Time + Button */}
                          <div className="flex justify-between items-center px-4 py-3">
                            <div className="flex items-center gap-1.5 text-gray-300">
                              <Clock size={13} />
                              <span className="text-[12px] font-medium">{formatTime(item.lastModifiedDate, true)}</span>
                            </div>

                            <button
                              className={`flex items-center gap-1 pl-3 pr-3.5 py-1.5 rounded-full text-xs font-bold text-white shadow-md active:scale-95 transition-all ${
                                item.status === '5' ? 'bg-gray-300 shadow-none' : 'bg-[#4337F1]'
                              }`}
                              onClick={(e) => handleRecordClickThrottled(e, item)}
                            >
                              <Plus size={14} strokeWidth={2.5} /> 访谈录音
                            </button>
                          </div>
                        </div>
                      </SwipeCell>
                    </div>
                  );
                })}

              {/* 加载更多指示器 */}
              {loadingMore && (
                <div className="flex items-center justify-center py-4">
                  <div className="flex items-center gap-2 text-gray-400">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin"></div>
                    <span className="text-xs">加载中...</span>
                  </div>
                </div>
              )}
              
              {/* 没有更多数据提示 */}
              {!hasMore && deals.length > 0 && (
                <div className="flex items-center justify-center py-4">
                  <span className="text-xs text-gray-400">没有更多数据了</span>
                </div>
              )}
              </div>
            )}
          </div>
          </PullRefresh>
      </div>






      {/* 删除确认弹框 - Direct Render */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* 背景遮罩 */}
          <div 
            className="absolute inset-0 bg-black/40"
            onClick={cancelDelete}
          />
          
          {/* 弹框内容 */}
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-fadeIn">
            <div className="flex flex-col items-center mb-6">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                <Trash2 size={32} className="text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">确认删除？</h3>
              <p className="text-slate-500 text-center text-[14px] leading-relaxed">
                删除后该尽调记录下的所有附件、转写及报告将无法找回，请谨慎操作。
              </p>
            </div>
            
            <div className="flex gap-3 mt-2">
              <button
                onClick={cancelDelete}
                className="flex-1 h-12 rounded-full border-2 border-gray-200 text-slate-700 font-medium hover:bg-gray-50 active:scale-95 transition-all"
              >
                取消
              </button>
              
              {/* 确认按钮 */}
              <button
                onClick={handleConfirmDeleteThrottled}
                className="flex-1 h-12 rounded-full bg-red-500 text-white font-medium hover:bg-red-600 active:scale-95 transition-all shadow-lg shadow-red-500/30"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default HomePage;

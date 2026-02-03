import React, { useState, useEffect, useRef } from "react";
import { useThrottleFn } from "../hooks/useThrottleFn";
import {
  Search,
  Trash2,
  Check,
  Bell,
  FileText,
  Plus,
} from "lucide-react";
import { SwipeCell, PullRefresh, Toast } from "react-vant";
import Mascot from "../components/Mascot";

import { DealRecord } from "../types";
import { dealService } from "../services/dealService";
import { useRecordingStore } from "../store/useRecordingStore";

interface HomePageProps {
  onNavigateToDetail: (deal: DealRecord) => void;
  onCreateNewDeal?: (deal: DealRecord) => void;
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
  onCreateNewDeal,
  onNavigateToSettings,
  onNavigateToTemplates,
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [creating, setCreating] = useState(false);

  // SwipeCell 强制刷新 key
  const [swipeCellKey, setSwipeCellKey] = useState(0);

  // AI Banner 轮播状态
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const bannerItems = [
    {
      title: "资料分析",
      description: "全方位深度挖掘资料细节与潜在规律，提炼高价值关键信息"
    },
    {
      title: "自动问题生成",
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

  // AI Banner 自动轮播
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % bannerItems.length);
    }, 3000); // 每3秒切换一次

    return () => clearInterval(interval);
  }, [bannerItems.length]);

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

  // Header 显隐控制
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollTop = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 用来锁定状态切换，防止在动画过程中由于布局调整导致的频繁跳变
  const isTogglingRef = useRef(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isTogglingRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const scrollDiff = scrollTop - lastScrollTop.current;
    
    // 检测是否滚动到底部，触发加载更多
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 50;
    if (isNearBottom && hasMore && !loadingMore && !loading) {
      loadMore();
    }
    
    // 1. 只有当列表数量较多且内容显著超过视口时，才允许执行滚动隐藏逻辑
    // 门槛恢复为 6 条，缓冲区设为 200，确保隐藏后不会产生过度回弹
    if (deals.length < 6 || scrollHeight <= clientHeight + 200) {
      if (!isHeaderVisible) setIsHeaderVisible(true);
      lastScrollTop.current = scrollTop;
      return;
    }

    // 2. 顶部边界检测：回到顶部附近立即显示
    if (scrollTop <= 20) {
      if (!isHeaderVisible) setIsHeaderVisible(true);
      lastScrollTop.current = scrollTop;
      return;
    }

    // 3. 底部边界检测：如果接近底部，强制隐藏 Header
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 30;
    if (isAtBottom) {
      if (isHeaderVisible) {
        isTogglingRef.current = true;
        setIsHeaderVisible(false);
        setTimeout(() => { isTogglingRef.current = false; }, 500);
      }
      lastScrollTop.current = scrollTop;
      return;
    }

    // 4. 方向检测：向上滚动显示，向下滚动隐藏
    if (scrollDiff < -5) {
      // 明显向上滚动
      if (!isHeaderVisible) {
        isTogglingRef.current = true;
        setIsHeaderVisible(true);
        setTimeout(() => { isTogglingRef.current = false; }, 500);
      }
    } else if (scrollDiff > 5 && scrollTop > 100) {
      // 明显向下滚动，且离开顶部一定距离后再隐藏
      if (isHeaderVisible) {
        isTogglingRef.current = true;
        setIsHeaderVisible(false);
        setTimeout(() => { isTogglingRef.current = false; }, 500);
      }
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

  // 处理新建尽调
  const handleCreateDeal = async () => {
    if (!newCustomerName.trim()) {
      Toast.info('请输入客户名称');
      return;
    }

    try {
      setCreating(true);
      const res = await dealService.createOrUpdateDealInst({
        interviewCust: newCustomerName.trim(),
      });

      if (res.success && res.data) {
        Toast.success('创建成功');
        setShowCreateModal(false);
        setNewCustomerName("");
        
        // 跳转到资料上传页，并传递刚创建的 Deal
        onCreateNewDeal?.(res.data);
      } else {
        Toast.fail(res.message || '创建失败');
      }
    } catch (error) {
      console.error('Create failed:', error);
      Toast.fail('创建失败');
    } finally {
      setCreating(false);
    }
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
  const handleCreateDealThrottled = useThrottleFn(handleCreateDeal, 1000);

  return (
    <div className="flex flex-col h-screen relative bg-[#F7F8FA]">
      {/* Top Gradient Background */}
      <div
        className="absolute top-0 left-0 right-0 h-64 z-0 pointer-events-none bg-page-gradient-fade"
      />

      {/* Header Area */}
      <div className="bg-gradient-to-b from-[#E0EAFF] to-[#F7F8FA] px-4 pt-12 flex-shrink-0 relative transition-all duration-300 ease-in-out">
        
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
        <div className="flex items-center gap-3 mb-4">
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
            onClick={() => Toast.info({ 
              message: '功能开发中，敬请期待！',
            })}
          >
             <Bell size={20} className="text-slate-700" />
             <div className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white" />
          </button>
        </div>

        {/* AI Analysis Banner - Carousel - Collapsible Container */}
        <div 
          className={`overflow-hidden transition-all duration-500 ease-in-out ${
             isHeaderVisible ? 'max-h-[180px] opacity-100 mb-2' : 'max-h-0 opacity-0 mb-0'
          }`}
        >
          <div className="bg-gradient-to-r from-[#EAF2FF] to-[#DCE9FF] rounded-2xl p-5 relative shadow-sm h-full">
            <div className="relative z-10 max-w-[60%]">
              <h2 className="text-[19px] font-black text-[#1A4B8B] mb-2 leading-tight transition-all duration-500">
                {bannerItems[currentBannerIndex].title}
              </h2>
              <p className="text-[11px] text-[#486DA5] leading-relaxed opacity-90 transition-all duration-500 min-h-[54px]">
                {bannerItems[currentBannerIndex].description}
              </p>
              <div className="mt-3 flex gap-1.5">
                {bannerItems.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentBannerIndex(index)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      index === currentBannerIndex 
                        ? 'w-4 bg-white' 
                        : 'w-1.5 bg-white/60 hover:bg-white/80'
                    }`}
                    aria-label={`切换到第${index + 1}个横幅`}
                  />
                ))}
              </div>
            </div>
            
            {/* Right Image */}
            <div className="absolute top-0 right-0 bottom-0 w-[45%]">
              <img 
                src="/talk-assistant/assets/home.png" 
                alt="Analysis" 
                className="w-full h-full object-contain object-right-bottom scale-110 -translate-y-5 translate-x-2"
              />
            </div>
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
            onClick={() => {
              setActiveTab("ongoing");
              onTabChange?.("ongoing");
            }}
          >
            进行中
          </button>
          <button
            className={`flex-1 py-2 text-[14px] font-bold rounded-lg transition-all ${
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

        {/* List */}
        <div 
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto pb-32 min-h-0 -mx-4 px-4 scroll-smooth"
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <p className="text-gray-400 text-sm mt-4">加载中...</p>
            </div>
          ) : deals.length === 0 ? (
            // 空状态 - 不使用下拉刷新
            <div className="flex-1 min-h-full flex flex-col items-center justify-center opacity-80">
               <div className="relative mb-3 flex items-center justify-center">
                 <Mascot size="medium" />
               </div>
               <p className="text-xs text-gray-400">小狸可以帮你做访谈记录，写尽调报告</p>
            </div>
          ) : (
            // 有数据 - 使用下拉刷新
            <PullRefresh 
              onRefresh={() => fetchDeals(false, true)} // 下拉刷新，不显示全局loading但重置分页
              successText={
                <div className="flex items-center justify-center gap-1 text-gray-600">
                  <Check size={16} />
                  <span>加载成功</span>
                </div>
              }
              headHeight={60}
              style={{ minHeight: '100%' }}
            >
              <div className="flex flex-col pb-4">
                {deals.map((item) => (
                <div key={item.id} className="mb-2">
                  <SwipeCell
                    key={`${item.id}-${swipeCellKey}`}
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
                          {/* 优先使用全局缓存判断是否访谈中 */}
                          {(currentDealId === item.id) && (
                            <span className="px-2.5 py-1 bg-[#E0F7FA] text-[#00B5B5] text-[11px] font-medium rounded-lg">
                              访谈中
                            </span>
                          )}
                        </div>
                        
                        <div>
                           <button
                             className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-md active:scale-95 transition-all ${
                               item.status === '5' ? 'bg-gray-300' : 'bg-primary'
                             }`}
                             onClick={(e) => handleRecordClickThrottled(e, item)}
                           >
                             <Plus size={14} strokeWidth={2.5} /> 访谈录音
                           </button>
                        </div>
                      </div>
                    </div>
                  </SwipeCell>
                </div>
              ))}

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
            </PullRefresh>
          )}
          
        </div>
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

      {/* 新建尽调弹框 - Direct Render */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* 半透明背景 */}
          <div 
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowCreateModal(false)}
          />
          
          {/* 弹框内容 */}
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-fadeIn">
            {/* 标题 */}
            <h3 className="text-center text-lg font-bold text-slate-800 mb-6">
              新建尽调
            </h3>
            
            {/* 输入框 */}
            <div className="mb-6">
              <label className="block text-sm text-slate-500 mb-2 pl-1">被访企业名称</label>
              <input
                type="text"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="请输入企业名称"
                className="w-full h-12 px-4 bg-gray-50 rounded-xl text-slate-800 border-none focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                autoFocus
              />
            </div>
            
            {/* 按钮组 */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 h-11 rounded-full border border-gray-200 text-slate-600 font-medium hover:bg-gray-50 active:scale-95 transition-all"
              >
                取消
              </button>
              
              <button
                onClick={handleCreateDealThrottled}
                disabled={creating}
                className="flex-1 h-11 rounded-full bg-primary text-white font-medium active:scale-95 transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-70 disabled:active:scale-100"
              >
                {creating ? "创建中..." : "开启尽调"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;

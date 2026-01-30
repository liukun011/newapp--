import React, { useState, useEffect, useRef } from "react";
import { useThrottleFn } from "../hooks/useThrottleFn";
import {
  Search,
  Trash2,
  Check,
  Bell,
  FileText,
  Plus,
  Home,
  User,
} from "lucide-react";
import { SwipeCell, PullRefresh, Toast } from "react-vant";
import Mascot from "../components/Mascot";
import { COLORS } from "../constants";
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
      title: "AI 智能资料分析",
      description: "AI赋能，全方位深度挖掘资料细节与潜在规律，智能提炼高价值关键信息"
    },
    {
      title: "智能问题生成",
      description: "基于上传资料自动生成专业访谈问题，提升尽调效率与质量"
    },
    {
      title: "实时语音转写",
      description: "访谈过程实时转写记录，AI智能匹配问题答案，自动生成结构化报告"
    }
  ];

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

  // AI Banner 自动轮播
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % bannerItems.length);
    }, 3000); // 每3秒切换一次

    return () => clearInterval(interval);
  }, [bannerItems.length]);

  // Header 显隐控制
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollTop = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 处理滚动，控制 Header 显隐
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    
    // 底部边界检测：如果接近底部，强制隐藏 Header
    // 增加容错(scrollHeight - clientHeight - 20)
    const isAtBottom = scrollHeight > clientHeight && (scrollTop + clientHeight >= scrollHeight - 20);
    if (isAtBottom) {
      if (isHeaderVisible) {
        setIsHeaderVisible(false);
      }
      lastScrollTop.current = scrollTop;
      return;
    }

    // 如果回到了顶部（或者非常接近顶部），显示 Header
    if (scrollTop <= 10) {
      if (!isHeaderVisible) {
        setIsHeaderVisible(true);
      }
      lastScrollTop.current = scrollTop;
      return;
    }

    // 只要离开顶部一定距离，就隐藏 Header
    if (scrollTop > 60 && isHeaderVisible) {
      setIsHeaderVisible(false);
    }
    
    lastScrollTop.current = scrollTop;
  };

  const fetchDeals = async (showGlobalLoading = true) => {
    if (showGlobalLoading) setLoading(true);
    try {
      // 如果是下拉刷新，人为增加一点延迟，让Loading动画展示得更清楚
      const apiPromise = dealService.queryDealInstList({
        pageNo: 0,
        pageSize: 50,
        dealInstTitle: searchQuery,
        status: activeTab === "ongoing" ? ["1"] : ["5"], 
      });
      
      const delayPromise = !showGlobalLoading 
        ? new Promise(resolve => setTimeout(resolve, 800)) 
        : Promise.resolve();

      const [res] = await Promise.all([apiPromise, delayPromise]);

      if (res.success && res.data) {
        console.log(res.data);
        setDeals(res.data.records || []);
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
        // 删除成功后刷新列表
        fetchDeals();
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
        className="absolute top-0 left-0 right-0 h-64 z-0 pointer-events-none"
        style={{
          background: `linear-gradient(180deg, ${COLORS.backgroundStart} 0%, rgba(255,255,255,0) 100%)`,
        }}
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
              <p className="text-[11px] text-[#486DA5] leading-relaxed opacity-90 transition-all duration-500">
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
                alt="AI Analysis" 
                className="w-full h-full object-contain object-right-bottom scale-110 translate-y-2 translate-x-2"
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
          ) : (
            <PullRefresh 
              onRefresh={() => fetchDeals(false)}
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
                             className={`text-[13px] font-medium px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-md transition-transform ${
                               item.status === '5'
                                 ? 'bg-gray-100 text-gray-400 shadow-none'
                                 : 'bg-[#4E3EF8] text-white shadow-indigo-200 active:scale-95'
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

              {deals.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 opacity-80">
                   <div className="w-24 h-24 relative mb-2">
                     <Mascot size="small" />
                   </div>
                   <p className="text-xs text-gray-400">小狸可以帮你做访谈记录，写尽调报告</p>
                </div>
              )}
              </div>
            </PullRefresh>
          )}
          
        </div>
      </div>



      {/* Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-[60px] bg-white border-t border-gray-100 flex items-center justify-between px-12 z-40 pb-safe">
        {/* Home Tab (Active) */}
        <button className="flex flex-col items-center justify-center gap-1 text-[#4E3EF8]">
           <Home size={24} strokeWidth={2.5} />
           <span className="text-[10px] font-medium">首页</span>
        </button>

        {/* Center Add Button */}
        <div className="absolute left-1/2 -top-6 -translate-x-1/2 p-1.5 bg-[#F7F8FA] rounded-full">
           <button 
             onClick={() => setShowCreateModal(true)}
             className="w-14 h-14 bg-[#4E3EF8] rounded-full shadow-lg shadow-indigo-300 flex items-center justify-center text-white active:scale-95 transition-transform"
           >
             <Plus size={28} strokeWidth={2.5} />
           </button>
        </div>

        {/* Profile Tab */}
        <button 
          onClick={onNavigateToSettings}
          className="flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-gray-600"
        >
           <User size={24} />
           <span className="text-[10px] font-medium">我的</span>
        </button>
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
                className="flex-1 h-11 rounded-full bg-indigo-600 text-white font-medium hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-70 disabled:active:scale-100"
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

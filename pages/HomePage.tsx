import React, { useState, useEffect, useRef } from "react";
import { useThrottleFn } from "../hooks/useThrottleFn";
import {
  Archive,
  BarChart3,
  Bell,
  Search,
  Trash2,
  Check,
  FileText,
  Clock,
  Building2,
  Mic,
  FolderOpen,
  ClipboardList,
  Briefcase,
  UsersRound,
} from "lucide-react";
import { SwipeCell, PullRefresh, Toast, Popup, Dialog } from "react-vant";

import { DealRecord, DealReportStatusEnum, DealStatusEnum } from "../types";
import { dealService } from "../services/dealService";
import { authService } from "../services/authService";
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

const projectCardIcons = [
  FolderOpen,
  ClipboardList,
  FileText,
  Briefcase,
  UsersRound,
];

const projectCardStyles = [
  {
    iconBg: 'bg-[#2563EB1A]',
    iconText: 'text-[#2563EB]',
    iconShadow: 'shadow-[0_8px_18px_rgba(37, 99, 235,0.10)]',
  },
  {
    iconBg: 'bg-[#F4F7FA]',
    iconText: 'text-[#4C8BF5]',
    iconShadow: 'shadow-[0_8px_18px_rgba(37, 99, 235,0.10)]',
  },
  {
    iconBg: 'bg-[#2563EB1A]',
    iconText: 'text-[#2563EB]',
    iconShadow: 'shadow-[0_8px_18px_rgba(37, 99, 235,0.08)]',
  },
  {
    iconBg: 'bg-[#EEF5FF]',
    iconText: 'text-[#2563EB]',
    iconShadow: 'shadow-[0_8px_18px_rgba(29,78,216,0.09)]',
  },
  {
    iconBg: 'bg-[#F4F7FA]',
    iconText: 'text-[#4C8BF5]',
    iconShadow: 'shadow-[0_8px_18px_rgba(37, 99, 235,0.10)]',
  },
];

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
  const [summaryDeals, setSummaryDeals] = useState<DealRecord[]>([]);
  const [loadError, setLoadError] = useState("");
  const [showLimitTips, setShowLimitTips] = useState(false);
  const { currentDealId } = useRecordingStore();
  
  // 分页状态
  const [pageNo, setPageNo] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // 删除确认弹框
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingDealId, setDeletingDealId] = useState<string | null>(null);

  // 组织/组织切换相关
  const [tenantName, setTenantName] = useState(() => {
    try {
      const userInfoStr = localStorage.getItem('zov-user-info');
      const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;
      return userInfo?.tenantName || '默认组织';
    } catch (e) {
      return '默认组织';
    }
  });
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [tenants, setTenants] = useState<any[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(false);

  const userInfoStr = localStorage.getItem('zov-user-info');
  const currentUserObj = userInfoStr ? JSON.parse(userInfoStr) : null;
  const currentUserId = currentUserObj?.userId;

  const fetchTenants = async () => {
    setTenantsLoading(true);
    try {
      const res = await authService.getTenants();
      if (res.successful && res.data) {
        setTenants(res.data);
      } else {
        Toast.fail(res.message || '获取组织列表失败');
      }
    } catch (error) {
      console.error("Failed to fetch tenants:", error);
    } finally {
      setTenantsLoading(false);
    }
  };

  const handleSwitchTenant = async (tenant: any) => {
    if (String(tenant.id) === String(currentUserObj?.tenantId)) {
      setShowTenantModal(false);
      return;
    }

    try {
      Toast.loading({ message: '切换中...', duration: 0 });
      const res = await authService.switchTenant(tenant.id);
      if (res.successful && res.data) {
        // 更新本地用户信息
        const userInfoStr = localStorage.getItem('zov-user-info');
        if (userInfoStr) {
          const userInfo = JSON.parse(userInfoStr);
          userInfo.tenantName = tenant.name;
          userInfo.tenantId = tenant.id;
          localStorage.setItem('zov-user-info', JSON.stringify(userInfo));
          setTenantName(tenant.name);
        }
        // 更新 Token（如果接口返回新 Token）
        if (res.data.accessToken) {
          localStorage.setItem('zov-user-token', res.data.accessToken);
        } else if (res.data.token) {
          localStorage.setItem('zov-user-token', res.data.token);
        }

        Toast.success(`已切换到「${tenant.name}」`);
        setShowTenantModal(false);
        // 刷新尽调列表
        fetchSummaryDeals();
        fetchDeals(true, true);
      } else {
        Toast.fail(res.message || '切换失败');
      }
    } catch (error) {
      console.error("Failed to switch tenant:", error);
      Toast.fail('切换失败，请重试');
    }
  };

  // 新建尽调弹框


  // SwipeCell 强制刷新 key
  const [swipeCellKey, setSwipeCellKey] = useState(0);

  // Swipe Item State
  const [swipingItemId, setSwipingItemId] = useState<string | null>(null);

  const isFirstRender = useRef(true);

  // 统一处理所有数据获取
  useEffect(() => {
    // 检查用户信息同步
    const checkUserInfoSync = async () => {
      try {
        const res = await authService.getUserInfo();
        if (res.successful && res.data) {
          const freshUserInfo = res.data;
          const localUserInfoStr = localStorage.getItem('zov-user-info');
          const localUserInfo = localUserInfoStr ? JSON.parse(localUserInfoStr) : null;

          if (!localUserInfo || localUserInfo.tenantId !== freshUserInfo.tenantId) {
            console.log('[HomePage] Tenant ID mismatch or missing, updating full userInfo to local storage...', {
              local: localUserInfo?.tenantId,
              fresh: freshUserInfo.tenantId
            });
            // 存储完整对象，确保所有字段（tenantName, tenantId 等）同步
            localStorage.setItem('zov-user-info', JSON.stringify(freshUserInfo));
            setTenantName(freshUserInfo.tenantName || '默认组织');
            // 如果组织变了，刷新列表
            fetchDeals(true, true);
          }
        }
      } catch (error) {
        console.error("[HomePage] Failed to sync user info:", error);
      }
    };

    // 监听来自 request.ts 的组织同步成功事件 (例如 402 静默恢复后)
    const handleTenantSynced = () => {
      try {
        const userInfoStr = localStorage.getItem('zov-user-info');
        if (userInfoStr) {
          const userInfo = JSON.parse(userInfoStr);
          setTenantName(userInfo.tenantName || '默认组织');
        }
        // 同步后刷新列表
        fetchSummaryDeals();
        fetchDeals(true, true);
      } catch (e) {
        console.error('Failed to update tenant name after sync', e);
      }
    };

    window.addEventListener('tenant-synced', handleTenantSynced);

    // 初始化：首次进入同步信息并加载，后续仅加载
    if (isFirstRender.current) {
      isFirstRender.current = false;
      checkUserInfoSync();
      fetchSummaryDeals();
      fetchDeals(true, true);
    } else {
      fetchSummaryDeals();
      fetchDeals(true, true);
    }

    return () => {
      window.removeEventListener('tenant-synced', handleTenantSynced);
    };
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
  const getStatusFilter = (tab: "ongoing" | "archived") => (
    tab === "ongoing"
      ? [String(DealStatusEnum.PREPARE)]
      : [String(DealStatusEnum.ARCHIVE)]
  );

  const isArchivedDeal = (item: DealRecord) => {
    const status = String(item.status ?? '').trim().toLowerCase();
    return status === String(DealStatusEnum.ARCHIVE) || status === 'archive' || status === 'archived' || status === '已归档';
  };

  const fetchArchivedFallback = async (pageNoForQuery: number) => {
    const fallbackRes = await dealService.queryDealInstList({
      pageNo: pageNoForQuery,
      pageSize: 50,
      dealInstTitle: searchQuery,
    });

    if (fallbackRes.success && fallbackRes.data) {
      return (fallbackRes.data.records || []).filter(isArchivedDeal);
    }

    return [];
  };

  const fetchSummaryDeals = async () => {
    try {
      const res = await dealService.queryDealInstList({
        pageNo: 1,
        pageSize: 100,
        dealInstTitle: searchQuery,
      });

      if (res.success && res.data) {
        setSummaryDeals(res.data.records || []);
      }
    } catch (error) {
      console.error("Failed to fetch summary deals:", error);
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    try {
      const nextPage = pageNo + 1;
      const res = await dealService.queryDealInstList({
        pageNo: nextPage,
        pageSize: 10, // 每次加载10条
        dealInstTitle: searchQuery,
        status: getStatusFilter(activeTab),
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

  const fetchDeals = async (showGlobalLoading = true, resetPage = false, tab: "ongoing" | "archived" = activeTab) => {
    if (showGlobalLoading) setLoading(true);
    setLoadError("");
    
    const currentPage = resetPage ? 1 : pageNo;
    
    try {
      // 如果是下拉刷新，人为增加一点延迟，让Loading动画展示得更清楚
      const apiPromise = dealService.queryDealInstList({
        pageNo: currentPage,
        pageSize: 10, // 每次加载10条
        dealInstTitle: searchQuery,
        status: getStatusFilter(tab),
      });
      
      const delayPromise = !showGlobalLoading 
        ? new Promise(resolve => setTimeout(resolve, 800)) 
        : Promise.resolve();

      const [res] = await Promise.all([apiPromise, delayPromise]);

      if (res.success && res.data) {
        console.log(res.data);
        let newDeals = res.data.records || [];
        if (tab === 'archived' && newDeals.length === 0) {
          newDeals = await fetchArchivedFallback(currentPage);
        }
        
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
      } else {
        setDeals([]);
        setHasMore(false);
        setLoadError(res.message || "列表暂时无法加载");
      }
    } catch (error) {
      console.error("Failed to fetch deals:", error);
      if (tab === 'archived') {
        try {
          const fallbackDeals = await fetchArchivedFallback(currentPage);
          setDeals(fallbackDeals);
          setPageNo(1);
          setHasMore(false);
          setLoadError(fallbackDeals.length > 0 ? "" : "暂无归档项目");
        } catch (fallbackError) {
          console.error("Failed to fetch archived fallback deals:", fallbackError);
          setDeals([]);
          setHasMore(false);
          setLoadError("归档列表暂时无法加载");
        }
      } else {
        setDeals([]);
        setHasMore(false);
        setLoadError("列表暂时无法加载");
      }
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

  const switchTab = (tab: "ongoing" | "archived") => {
    setActiveTab(tab);
    onTabChange?.(tab);
    setPageNo(1);
    setHasMore(true);
    fetchDeals(true, true, tab);
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
      Toast.loading({ message: '正在删除...', duration: 0, forbidClick: true });
      const res = await dealService.deleteDealInst(deletingDealId);
      Toast.clear();
      
      if (res.success) {
        Toast.success('删除成功');

        // Check if the deleted deal is the currently active one for recording
        const store = useRecordingStore.getState();
        if (store.currentDealId === deletingDealId) {
          console.log('[HomePage] Deleting active deal, resetting recording store...');
          store.reset();
        }

        // 删除成功后刷新列表（重置分页，从第1页开始加载）
        fetchSummaryDeals();
        fetchDeals(true, true);
      } else {
        Toast.fail(res.message || '删除失败');
      }
    } catch (error) {
      Toast.clear();
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

  const handleCancelArchive = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    Dialog.confirm({
      title: '取消归档',
      message: '确定要将此记录取消归档并恢复到进行中吗？',
      onConfirm: async () => {
        try {
          Toast.loading({ message: '正在取消归档...', duration: 0, forbidClick: true });
          const res = await dealService.cancelArchive(id);
          Toast.clear();
          if (res.success) {
            Toast.success('已取消归档');
            fetchSummaryDeals();
            fetchDeals(true, true);
          } else {
            Toast.fail(res.message || '操作失败');
          }
        } catch (error) {
          Toast.clear();
          console.error("Failed to cancel archive:", error);
          Toast.fail('操作失败');
        }
      }
    });
  };

  const handleConfirmDeleteThrottled = useThrottleFn(confirmDelete, 1000);

  const overviewDeals = summaryDeals.length > 0 ? summaryDeals : deals;
  const generatedCount = overviewDeals.filter((item) => String(item.reportStatus) === DealReportStatusEnum.REPORT_GENERATED || item.report?.id).length;
  const interviewCount = overviewDeals.reduce((sum, item) => {
    const list = Array.isArray(item.interviewInstList) ? item.interviewInstList : [];
    return sum + list.filter((record: any) => String(record?.interviewInstStatus || record?.status || '') !== '1').length;
  }, 0);
  const projectCount = overviewDeals.length;

  return (
    <div className="flex flex-col h-screen relative xl-page">
      {/* Top Fixed Header: Tenant Info & Search & Bell */}
      <div className="px-4 pt-4 pb-0 flex-shrink-0 relative z-40">
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

        <div className="grid grid-cols-[1fr_44px] items-center gap-2.5 mb-3">
          <div className="relative">
            <input
              type="text"
              placeholder="搜索项目名称"
              value={searchTerm}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              className="w-full h-[40px] pl-9 pr-3 bg-[#FFFFFF]/80 rounded-[14px] text-[13px] text-[#0F2848] placeholder-[#8AA2BF] shadow-[0_3px_10px_rgba(15,40,72,0.045)] focus:outline-none focus:ring-2 focus:ring-[#4C8BF5] transition-all border border-[#E2EBF5]"
              style={{ outline: 'none', WebkitTapHighlightColor: 'transparent', WebkitAppearance: 'none' }}
            />
            <button
              onClick={handleSearch}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 text-[#8AA2BF] hover:text-[#2563EB] active:scale-95 transition-all"
            >
              <Search size={18} />
            </button>
          </div>
          <button 
            className="xl-icon-btn"
            onClick={() => Toast.info('暂无新通知')}
          >
            <Bell size={21} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {/* Main Scrollable Content Area */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto relative z-10 scroll-smooth"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
          <div className="px-4 mt-2.5">
            <div className="xl-card px-3.5 py-3">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-[11px] bg-[#2563EB1A] text-[#2563EB] flex items-center justify-center">
                    <BarChart3 size={17} strokeWidth={2.35} />
                  </div>
                  <div>
                    <h2 className="text-[14px] leading-[18px] font-medium text-[#0F2848]">工作概览</h2>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    label: '尽调项目',
                    value: projectCount,
                    Icon: Briefcase,
                  },
                  {
                    label: '生成报告',
                    value: generatedCount,
                    Icon: FileText,
                  },
                  {
                    label: '访谈记录',
                    value: interviewCount,
                    Icon: Mic,
                  },
                ].map(({ label, value, Icon }) => (
                  <div key={label} className="relative min-h-[76px] rounded-[16px] border border-[#E2EBF5] bg-[#F7FAFE] px-2.5 py-2.5 overflow-hidden">
                    <div className="absolute right-2 top-2 grid grid-cols-2 gap-[2px] opacity-30">
                      <span className="w-1 h-1 rounded-full bg-[#8AA2BF]" />
                      <span className="w-1 h-1 rounded-full bg-[#8AA2BF]" />
                      <span className="w-1 h-1 rounded-full bg-[#8AA2BF]" />
                      <span className="w-1 h-1 rounded-full bg-[#8AA2BF]" />
                    </div>
                    <div className="w-8 h-8 rounded-[12px] flex items-center justify-center mb-1.5 bg-[#2563EB] text-white shadow-[0_8px_18px_rgba(37,99,235,0.16)]">
                      <Icon size={16} strokeWidth={2.2} />
                    </div>
                    <div className="flex items-end gap-1.5">
                      <div className="text-[21px] leading-none font-medium text-[#0F2848]">{value}</div>
                      <div className="text-[10.5px] leading-[13px] font-medium text-[#0F2848] pb-[1px]">{label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="sticky top-0 z-40 pt-2.5 pb-2 px-4 bg-[#F7FAFE]">
            <div className="xl-segment flex">
              <button
                className={`flex-1 xl-segment-item transition-all ${activeTab === "ongoing" ? "is-active" : ""}`}
                onClick={() => {
                  switchTab("ongoing");
                }}
              >
                进行中 {activeTab === 'ongoing' ? deals.length : ''}
              </button>
              <button
                className={`flex-1 xl-segment-item transition-all ${activeTab === "archived" ? "is-active" : ""}`}
                onClick={() => {
                  switchTab("archived");
                }}
              >
                已归档 {activeTab === 'archived' ? deals.length : ''}
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
                <div className="w-12 h-12 border-4 border-[#4C8BF5] border-t-[#2563EB] rounded-full animate-spin"></div>
                <p className="text-[#476285] text-sm mt-4">加载中...</p>
              </div>
            ) : deals.length === 0 ? (
              <div className="min-h-[40vh] flex flex-col items-center justify-center opacity-80">
                 <div className="w-14 h-14 rounded-[20px] bg-[#2563EB1A] text-[#2563EB] flex items-center justify-center mb-3 border border-[#E2EBF5]">
                   <FileText size={26} strokeWidth={2.2} />
                 </div>
                 <p className="text-xs text-[#476285]">{loadError || (activeTab === 'archived' ? '暂无归档项目' : '暂无尽调项目')}</p>
                 {loadError && (
                   <button
                     className="mt-3 xl-btn-ghost px-4 min-h-[36px] text-[12px]"
                     onClick={() => fetchDeals(true, true)}
                   >
                     重新加载
                   </button>
                 )}
              </div>
            ) : (
              <div className={`flex flex-col ${deals.length <= 2 ? 'pb-4' : 'pb-32'}`}>
                {deals.map((item, index) => {
                  const isSwiping = swipingItemId === item.id;
                  const ProjectIcon = projectCardIcons[index % projectCardIcons.length];
                  const projectStyle = projectCardStyles[index % projectCardStyles.length];
                  return (
                    <div key={item.id} className="mb-2">
                      <SwipeCell
                        key={`${item.id}-${swipeCellKey}`}
                        onOpen={() => setSwipingItemId(item.id)}
                        onClose={() => setSwipingItemId(null)}
                        rightAction={
                          <button
                            className="h-full px-6 bg-red-500 text-white flex items-center justify-center rounded-r-[22px]"
                            onClick={() => handleDeleteThrottled(item.id)}
                          >
                            <Trash2 size={20} />
                          </button>
                        }
                      >
                        <div
                          onClick={() => handleNavigateThrottled(item)}
                          className={`xl-card flex flex-col active:scale-[0.99] transition-transform overflow-hidden rounded-l-[18px] ${
                            isSwiping ? 'rounded-r-none' : 'rounded-r-[18px]'
                          }`}
                        >
                          <div className="grid grid-cols-[42px_minmax(0,1fr)_60px] gap-3 p-3 min-h-[88px]">
                            <div className={`w-[42px] h-[42px] rounded-[14px] flex-shrink-0 flex items-center justify-center border border-white/70 self-center ${projectStyle.iconBg} ${projectStyle.iconText} ${projectStyle.iconShadow}`}>
                              <ProjectIcon size={19} strokeWidth={2.05} />
                            </div>

                            <div className="min-w-0 self-stretch flex flex-col justify-center pr-1">
                              <h3 className="text-[14.5px] leading-[19px] font-medium text-[#0F2848] truncate whitespace-nowrap">
                                {item.interviewCust}
                              </h3>
                              <div className="flex items-center gap-1.5 text-[#476285] mt-1.5">
                                <Clock size={12} />
                                <span className="text-[11.5px] font-normal leading-none">{formatTime(item.lastModifiedDate)}</span>
                              </div>
                            </div>
                            <div className="self-stretch flex flex-col items-end justify-between min-w-[60px]">
                              {(currentDealId === item.id) ? (
                                <span className="min-h-[24px] px-2 rounded-full bg-[#ECFDF5] border border-[#E2EBF5] text-[#10B981] text-[10px] font-normal flex items-center whitespace-nowrap">录音中</span>
                              ) : (
                                <span className="min-h-[24px] px-2 rounded-full bg-[#2563EB1A] border border-[#E2EBF5] text-[#2563EB] text-[10px] font-normal flex items-center whitespace-nowrap">
                                  {String(item.reportStatus) === DealReportStatusEnum.REPORT_GENERATED || item.report?.id ? '已生成' : '未生成'}
                                </span>
                              )}
                              <button
                                className="w-9 h-9 rounded-[13px] border border-[#E2EBF5] bg-[#2563EB1A] text-[#2563EB] flex items-center justify-center active:scale-95 transition-transform shadow-[0_4px_12px_rgba(37, 99, 235,0.06)]"
                                onClick={(e) => {
                                  if (activeTab === 'archived') {
                                    handleCancelArchive(e, item.id);
                                  } else {
                                    handleRecordClickThrottled(e, item);
                                  }
                                }}
                                aria-label={activeTab === 'archived' ? '取消归档' : '进入录音'}
                              >
                                {activeTab === 'archived' ? <Archive size={18} strokeWidth={2.2} /> : <Mic size={18} strokeWidth={2.25} />}
                              </button>
                            </div>
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
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-[#2563EB] rounded-full animate-spin"></div>
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
              <h3 className="text-xl font-medium text-[#0F2848] mb-2">确认删除？</h3>
              <p className="text-[#476285] text-center text-[14px] leading-relaxed">
                删除后该尽调记录下的所有附件、转写及报告将无法找回，请谨慎操作。
              </p>
            </div>
            
            <div className="flex gap-3 mt-2">
              <button
                onClick={cancelDelete}
                className="flex-1 h-12 rounded-[16px] border border-[#E2EBF5] text-[#476285] font-normal hover:bg-[#2563EB1A] active:scale-95 transition-all"
              >
                取消
              </button>
              
              {/* 确认按钮 */}
              <button
                onClick={handleConfirmDeleteThrottled}
                className="flex-1 h-12 rounded-[16px] bg-red-500 text-white font-normal hover:bg-red-600 active:scale-95 transition-all shadow-lg shadow-red-500/20"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tenant/Organization Switcher Drawer */}
      <Popup
        visible={showTenantModal}
        onClose={() => setShowTenantModal(false)}
        position="bottom"
        closeOnClickOverlay
        className="!bg-transparent"
      >
        <div className="mx-2 mb-2 overflow-hidden rounded-t-[22px] border border-[#E2EBF5] bg-[#FFFFFF] shadow-[0_-18px_42px_rgba(15,40,72,0.18)]">
          <div className="mx-auto mt-4 h-1 w-10 rounded-full bg-[#E2EBF5]" />
          {/* Modal Header */}
          <div className="px-4 pb-2 pt-6 flex items-center justify-between flex-shrink-0">
            <h3 className="text-[15px] leading-none font-medium text-[#0F2848]">切换组织</h3>
            <button
              onClick={() => setShowTenantModal(false)}
              className="h-8 min-w-8 rounded-full border border-[#E2EBF5] bg-[#FFFFFF] px-2.5 text-[12px] text-[#2563EB]"
            >
              关闭
            </button>
          </div>

          {/* List Area */}
          <div className="max-h-[42vh] overflow-y-auto px-3 pb-5 pt-2 space-y-2">
            {tenantsLoading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-7 h-7 border-2 border-[#4C8BF5] border-t-[#2563EB] rounded-full animate-spin mb-3" />
                <p className="text-[#8AA2BF] text-xs">加载中...</p>
              </div>
            ) : tenants.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 opacity-70">
                <Building2 size={34} className="text-[#8AA2BF] mb-3" />
                <p className="text-[#8AA2BF] text-xs">暂无可选组织</p>
              </div>
            ) : (
              tenants.map((tenant) => {
                const isActive = String(tenant.id) === String(currentUserObj?.tenantId);
                return (
                  <div 
                    key={tenant.id}
                    onClick={() => handleSwitchTenant(tenant)}
                    className={`flex min-h-[60px] items-center gap-3 rounded-[14px] border transition-all active:scale-[0.99] ${
                      isActive 
                        ? 'bg-[#2563EB1A] border-[#4C8BF5] px-3 py-2.5 shadow-[0_6px_16px_rgba(37, 99, 235,0.10)]' 
                        : 'bg-[#FFFFFF] border-[#E2EBF5] px-3 py-2.5'
                    }`}
                  >
                    {/* Organization Icon */}
                    <div className={`w-9 h-9 rounded-[9px] flex items-center justify-center flex-shrink-0 ${
                      isActive ? 'bg-[#2563EB] text-[#FFFFFF] shadow-[0_5px_12px_rgba(37, 99, 235,0.10)]' : 'bg-[#F7FAFE] text-[#8AA2BF]'
                    }`}>
                      <Building2 size={18} strokeWidth={2} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3 mb-0.5">
                        <h4 className={`text-[14px] leading-[18px] font-medium truncate ${isActive ? 'text-[#2563EB]' : 'text-[#0F2848]'}`}>
                          {tenant.name}
                        </h4>
                        {isActive && <Check size={16} className="text-[#2563EB] shrink-0" strokeWidth={2.6} />}
                      </div>
                      <p className={`text-[11px] leading-none font-normal ${isActive ? 'text-[#2563EB]/62' : 'text-[#8AA2BF]'}`}>
                        {(tenant.tenantAdmin || (currentUserId && String(tenant.createdBy) === String(currentUserId))) ? '管理员' : '成员'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Popup>

    </div>
  );
};

export default HomePage;

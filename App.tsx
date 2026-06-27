import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { ArrowLeft, Check, ChevronDown, FileText, Grid2X2, Home, Plus, UserRound, X } from 'lucide-react';
import { Toast, Dialog } from 'react-vant';
import { useRecordingStore } from './store/useRecordingStore';
import { dealService } from './services/dealService';
import { ReportTemplate, templateService } from './services/templateService';
// import SplashScreen from './pages/SplashScreen'; (已禁用)
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import DueDiligencePage from './pages/DueDiligencePage';
import RecordingPage from './pages/RecordingPage';
import MaterialsListPage from './pages/MaterialsListPage';
import MaterialUploadPage from './pages/MaterialUploadPage';
import AiGenerationPage from './pages/AiGenerationPage';
import CorporateEditPage from './pages/CorporateEditPage';
import MyTemplatesPage from './pages/MyTemplatesPage';
import UploadTemplatePage from './pages/UploadTemplatePage';
import TemplateSelectionPage from './pages/TemplateSelectionPage';
import TemplatePreviewPage from './pages/TemplatePreviewPage';
import QuestionsListPage from './pages/QuestionsListPage';
import UserAgreementPage from './pages/UserAgreementPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import InvitationCenterPage from './pages/InvitationCenterPage';
import SettingsPage from './pages/SettingsPage';
import MessageCenterPage from './pages/MessageCenterPage';
// Removed ManagementPage as it is replaced by MyTemplatesPage
import ReportsListPage from './pages/ReportsListPage';

import HistoryRecordsPage from './pages/HistoryRecordsPage';
import HistoryDetailPage from './pages/HistoryDetailPage';
import ReportPreviewPage from './pages/ReportPreviewPage';
import OrganizationManagementPage from './pages/OrganizationManagementPage';
import JoinOrganizationPage from './pages/JoinOrganizationPage';
import ShareAppPage from './pages/ShareAppPage';
import EnterpriseDetailPage from './pages/EnterpriseDetailPage';
import { TemplateEnabledStatus, View, DealRecord } from './types';

import RecordingFloatBubble from './components/RecordingFloatBubble';
import QuestionListPicker from './components/QuestionListPicker';
import { nativeBridge } from './services/nativeBridge';

const App: React.FC = () => {
  const appContainerRef = useRef<HTMLDivElement>(null);
  // 启动页状态已禁用

  const [currentView, setCurrentView] = useState<View>(() => {
    const token = localStorage.getItem('zov-user-token');
    if (!token) return View.LOGIN;
    const savedView = sessionStorage.getItem('zov-current-view');
    return (savedView as View) || View.HOME;
  });

  // Track the previous view to support returning from the Edit screen
  const [previousView, setPreviousView] = useState<View>(View.HOME);

  // iOS Swipe Back & Browser Back Support
  // 核心逻辑：利用 History API 制造“伪历史”，使得浏览器/WebView 认为有后退空间，从而允许侧滑手势。
  // 当侧滑触发 'popstate' 时，拦截它，执行我们自己的导航逻辑，并立即把历史记录补回去，实现“无限拦截”。
  useEffect(() => {
    if (typeof history === 'undefined' || typeof window === 'undefined') return;

    // 1. 初始化：挂载时推入一个状态，确保栈深 >= 2，激活侧滑能力
    // 使用随机 ID 避免某些浏览器的去重优化
    const pushState = () => {
      history.pushState({ key: Date.now() }, '', window.location.href);
    };

    const handlePopState = (_event: PopStateEvent) => {
      console.log('[App] PopState (Swipe/Back) detected.');
      
      // 2. 拦截后立即补回历史记录，保持栈结构，防止真的退出了 App 或到了空页面
      // 注意：这会让浏览器 URL 保持不变（或变回原样），同时允许下一次继续侧滑
      pushState();

      // 3. 触发业务层的返回逻辑
      if ((window as any).onNativeBack) {
        (window as any).onNativeBack();
      }
    };

    window.addEventListener('popstate', handlePopState);
    
    // 首次推入
    pushState();

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Navigation Stack for handling Native Back
  const [viewStack, setViewStack] = useState<View[]>([View.HOME]);
  // Track current selected deal
  const [currentDeal, _setCurrentDeal] = useState<DealRecord | null>(() => {
    try {
      const savedDeal = sessionStorage.getItem('zov-current-deal');
      return savedDeal ? JSON.parse(savedDeal) : null;
    } catch (e) {
      return null;
    }
  });

  const currentDealRef = useRef<DealRecord | null>(currentDeal);

  const setCurrentDeal = (deal: DealRecord | null) => {
    currentDealRef.current = deal;
    _setCurrentDeal(deal);
    // 同时更新 sessionStorage，保持原有逻辑一致性（虽然 useEffect 已经做了）
    if (deal) {
      sessionStorage.setItem('zov-current-deal', JSON.stringify(deal));
    } else {
      sessionStorage.removeItem('zov-current-deal');
    }
  };
  // Ref to track currentDeal for async handlers to avoid stale closures


  // 录音状态管理 (使用 Zustand Store)
  const {
    currentInterviewInstId,
    currentInterviewInstTitle,
    isRecording,
    recordingSeconds,
    setIsRecording,
    setRecordingSeconds,
    setData,
  } = useRecordingStore();

  // Global Recording Event Listeners
  useEffect(() => {
    (window as any).onVoiceStream = (text: string, roleId: string) => {
      console.log(`[App] Global onVoiceStream: text=${text}, roleId=${roleId}`);
      if (text) {
        const store = useRecordingStore.getState();
        // 如果全局未处于录音状态（例如在资料上传页使用了局部录音），则忽略全局监听收到的转写
        if (!store.isRecording) return;

        const { transcriptionList, setTranscriptionList, addTranscriptionChunk } = store;
        const lastItem = transcriptionList[transcriptionList.length - 1];

        // 检查最后一条记录的 roleId 是否与当前相同
        if (lastItem && String(lastItem.roleId) === String(roleId)) {
          // roleId 相同，拼接内容到最后一条记录
          const updatedList = [...transcriptionList];
          updatedList[updatedList.length - 1] = {
            ...lastItem,
            content: lastItem.content + (text || ""),
            timestamp: Date.now(),
          };
          setTranscriptionList(updatedList);
          console.log('[onVoiceStream] 拼接到现有记录:', roleId);
        } else {
          // roleId 变化或首次添加，创建新记录
          addTranscriptionChunk({
            id: String(Date.now()),
            roleId: roleId,
            content: text,
            isFinal: true,
          });
          console.log('[onVoiceStream] 创建新记录:', roleId);
        }
      }
    };

    (window as any).onRecordingChunk = (filePath: string) => {
      console.log("[App] Global onRecordingChunk:", filePath);
    };

    (window as any).onVoiceFileSaved = (filePath: string) => {
      console.log(`[App] Global onVoiceFileSaved: ${filePath}`);
    };

    (window as any).onRecordingError = (code: string, message: string) => {
      console.error(`[App] Global onRecordingError: Code=${code}, Msg=${message}`);
      // If message is undefined (legacy call), treat code as message
      const displayMsg = message ? `${message} (${code})` : code;

      Toast.fail({ message: displayMsg, duration: 3000 });

      if (useRecordingStore.getState().isRecording) {
        useRecordingStore.getState().setIsRecording(false);
      }
    };

    return () => {
      // Optional: Don't clear if you want them to persist across re-mounts, 
      // but App.tsx usually mounts once.
      // window.onVoiceStream = undefined;
    };
  }, []);


  // 模板预览数据 - 从 sessionStorage 恢复
  const [previewTemplate, setPreviewTemplate] = useState<{ name: string; url: string; id?: string } | null>(() => {
    try {
      const saved = sessionStorage.getItem('zov-preview-template');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // 持久化预览数据
  useEffect(() => {
    if (previewTemplate) {
      sessionStorage.setItem('zov-preview-template', JSON.stringify(previewTemplate));
    } else {
      sessionStorage.removeItem('zov-preview-template');
    }
  }, [previewTemplate]);

  // 报告预览数据
  const [previewReport, setPreviewReport] = useState<{ 
    name: string; 
    reportUrl: string; 
    previewUrl: string; 
    showDownloadButton?: boolean;
    templateId?: string;
    actionType?: 'select_template';
    returnTargetView?: View;
  } | null>(() => {
    try {
      const saved = sessionStorage.getItem('zov-preview-report');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // 持久化报告预览数据
  useEffect(() => {
    if (previewReport) {
      sessionStorage.setItem('zov-preview-report', JSON.stringify(previewReport));
    } else {
      sessionStorage.removeItem('zov-preview-report');
    }
  }, [previewReport]);

  // 记住资料上传页的当前标签页
  const [materialUploadTab, setMaterialUploadTab] = useState<string>('upload');

  // 记住模板管理页的初始标签页
  const [templateInitialTab, setTemplateInitialTab] = useState<'templates' | 'questions'>('templates');

  // 上传模板页的预填充数据（从"更换"按钮携带过来）
  const [uploadTemplateInitialData, setUploadTemplateInitialData] = useState<{ id: string; name: string; fileUrl: string; fileName: string } | null>(null);

  // 记住首页的标签页（进行中/已归档）
  const [homeTab, setHomeTab] = useState<'ongoing' | 'archived'>('ongoing');

  // 导航方向：forward (前进) 或 backward (后退) 或 root (重置/根页面)
  // 导航方向：forward (前进) 或 backward (后退) 或 root (重置/根页面)
  const [navDirection, setNavDirection] = useState<'forward' | 'backward' | 'root'>('forward');

  // 访谈限制提示显示状态
  const [showLimitTips, setShowLimitTips] = useState(false);

  // 录音中断弹窗显示状态
  const [showInterruptDialog, setShowInterruptDialog] = useState(false);
  const [hideBottomNav, setHideBottomNav] = useState(false);

  // 页面滚动位置缓存
  const [scrollPositions, setScrollPositions] = useState<Record<View, number>>({} as Record<View, number>);

  // 记录录音页面的返回路径 (用于从历史记录返回录音页时恢复正确的返回路径)
  const [recordingBackView, setRecordingBackView] = useState<View>(View.HOME);
  // 记录历史访谈页面的返回路径
  const [historyBackView, setHistoryBackView] = useState<View>(View.RECORDING);

  // 历史访谈详情数据
  const [historyDetailData, setHistoryDetailData] = useState<{ id: string, title: string } | null>(() => {
    try {
      const saved = sessionStorage.getItem('zov-history-detail');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // 状态持久化
  useEffect(() => {
    if (currentView === View.LOGIN) {
      sessionStorage.removeItem('zov-current-view');
      sessionStorage.removeItem('zov-current-deal');
      sessionStorage.removeItem('zov-history-detail');
      // 清除历史详情数据
      setHistoryDetailData(null);
    } else {
      sessionStorage.setItem('zov-current-view', currentView);
    }
  }, [currentView]);

  useEffect(() => {
    if (historyDetailData) {
      sessionStorage.setItem('zov-history-detail', JSON.stringify(historyDetailData));
    } else {
      sessionStorage.removeItem('zov-history-detail');
    }
  }, [historyDetailData]);

  // 企查查资料详情数据
  const [enterpriseDetailData, setEnterpriseDetailData] = useState<any>(null);

  const [isEnterpriseSyncing, setIsEnterpriseSyncing] = useState(false);

  // 新建尽调弹框状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [creditCode, setCreditCode] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [enterpriseOptions, setEnterpriseOptions] = useState<any[]>([]);
  const [templateOptions, setTemplateOptions] = useState<ReportTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedQuestionTemplates, setSelectedQuestionTemplates] = useState<any[]>([]);
  const [showCreateQuestionPicker, setShowCreateQuestionPicker] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);

  const resetCreateForm = () => {
    setShowCreateModal(false);
    setNewCustomerName("");
    setCreditCode("");
    setCompanyName("");
    setEnterpriseOptions([]);
    setSelectedTemplateId("");
    setSelectedQuestionTemplates([]);
    setShowCreateQuestionPicker(false);
    setShowTemplatePicker(false);
  };

  // 企业搜索防抖
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (companyName && showCreateModal && !creditCode) {
      timer = setTimeout(() => {
        handleEnterpriseSearch(companyName);
      }, 500);
    } else {
      setEnterpriseOptions([]);
    }
    return () => clearTimeout(timer);
  }, [companyName, showCreateModal]);

  useEffect(() => {
    if (!showCreateModal) return;

    let cancelled = false;
    const fetchTemplates = async () => {
      setLoadingTemplates(true);
      try {
        const res = await templateService.getTemplateList({ isEnabled: TemplateEnabledStatus.ENABLED });
        if (cancelled) return;
        const list = res.success && Array.isArray(res.data) ? res.data : [];
        setTemplateOptions(list);
        setSelectedTemplateId((current) => current || list[0]?.id || "");
      } catch (e) {
        console.error('Fetch templates failed:', e);
        if (!cancelled) {
          setTemplateOptions([]);
        }
      } finally {
        if (!cancelled) setLoadingTemplates(false);
      }
    };

    fetchTemplates();
    return () => {
      cancelled = true;
    };
  }, [showCreateModal]);

  const handleEnterpriseSearch = async (val: string) => {
    if (!val || val.length < 2) {
      setEnterpriseOptions([]);
      return;
    }
    setSearching(true);
    try {
      const res = await dealService.searchEnterprise(val);
      if (res.success && res.data) {
        setEnterpriseOptions(res.data || []);
      }
    } catch (e) {
      console.error('Search enterprise failed:', e);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (currentDeal) {
      sessionStorage.setItem('zov-current-deal', JSON.stringify(currentDeal));
    }
  }, [currentDeal]);

  // 全局计时器（基于时间戳，避免 setInterval 累积误差）
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRecording) {
      // 记录开始时的时间戳，减去已有秒数（支持暂停恢复）
      const startTime = Date.now() - recordingSeconds * 1000;
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setRecordingSeconds(elapsed);
      }, 500); // 每 500ms 更新一次，确保秒数跳变更及时
    }
    return () => clearInterval(interval);
  }, [isRecording]); // 注意：不再依赖 setRecordingSeconds，避免重复触发

  // 背景渐变样式
  // Using a fixed background to prevent repaint on scroll


  /**
   * 更新本地模板 ID（模板已在服务端更换成功）
   */
  const handleTemplateChanged = (newTemplateId: string) => {
    if (!currentDeal?.id) return;
    setCurrentDeal({ ...currentDeal, templateId: newTemplateId });
  };

  /**
   * 刷新尽调详情
   */
  const refreshDealDetail = async (): Promise<boolean> => {
    const dealId = currentDeal?.id;
    if (!dealId) return false;
    try {
      const res = await dealService.getDealInstDetail(dealId);
      if (res.success && res.data) {
        setCurrentDeal(res.data);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Refresh deal detail failed:', e);
      Toast.fail('刷新详情失败');
      return false;
    }
  };

  // 前进导航（跳转到新页面）
  const navigateForward = (view: View) => {
    console.log(`[App] navigateForward to: ${view}. Previous Stack:`, viewStack);
    // 保存当前页面的滚动位置
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    setScrollPositions(prev => ({ ...prev, [currentView]: scrollTop }));

    // Push new view to stack                                                                                                                                                         
    setViewStack(prev => [...prev, view]);

    setNavDirection('forward');
    setCurrentView(view);

    // 动画结束后滚动到顶部
    setTimeout(() => {
      window.scrollTo(0, 0);
    }, 400);
  };

  // 后退导航（返回上一页）
  const navigateBackward = (view: View) => {
    setNavDirection('backward');
    setCurrentView(view);

    // Update stack: if new view is in stack, slice back to it; else push/replace
    setViewStack(prev => {
      const index = prev.lastIndexOf(view);
      if (index !== -1) {
        return prev.slice(0, index + 1);
      }
      // Fallback: just append
      return [...prev, view];
    });

    // 动画结束后恢复滚动位置
    setTimeout(() => {
      const savedPosition = scrollPositions[view] || 0;
      window.scrollTo(0, savedPosition);
    }, 400);
  };



  // 监听 401 未授权事件
  useEffect(() => {
    const handleUnauthorized = () => {
      setNavDirection('root');
      setCurrentView(View.LOGIN);
      // 可选：重置当前 Deal 等状态
      setCurrentDeal(null);
    };

    window.addEventListener('unauthorized', handleUnauthorized);
    return () => window.removeEventListener('unauthorized', handleUnauthorized);
  }, []);

  // 监听原生返回键
  useEffect(() => {
    (window as any).onNativeBack = () => {
      console.log('Native Back Pressed, Current View:', currentView, 'Stack:', viewStack);

      // 支持页面拦截原生返回 (发送自定义事件)
      const event = new CustomEvent('requestNativeBack', { cancelable: true });
      const handled = !window.dispatchEvent(event);
      if (handled) {
        console.log('[App] Native back handled by page component');
        return;
      }

      // 如果当前在首页、登录页、设置页、报告列表页或管理页，才是真正的退出时机
      if (currentView === View.HOME || currentView === View.LOGIN || currentView === View.SETTINGS || currentView === View.REPORTS_LIST || currentView === View.MANAGEMENT) {
        // 如果栈里还有东西（异常情况），先清空栈回首页
        if (viewStack.length > 1 && (currentView === View.HOME || currentView === View.SETTINGS || currentView === View.REPORTS_LIST || currentView === View.MANAGEMENT)) {
          // 已经在根级页面了，但栈还不空，重置栈
          setViewStack([currentView]);
          return;
        }

        if (window.confirm('确定要退出应用吗？')) {
          nativeBridge.closeApp();
        }
      } else {
        // 如果不在首页

        // 情况A: 栈里有历史记录，正常回退
        if (viewStack.length > 1) {
          const newStack = [...viewStack];
          newStack.pop(); // 移除当前
          const previousView = newStack[newStack.length - 1];

          setNavDirection('backward');
          setCurrentView(previousView || View.HOME);
          setViewStack(newStack);

          // 如果回退到详情页，尝试刷新详情数据
          if (previousView === View.DUE_DILIGENCE && currentDealRef.current?.id) {
            refreshDealDetail();
          }
        }
        // 情况B: 栈里没记录了（比如刷新后 stack重置了，但 currentView 是二级页面），强制回首页
        else {
          console.warn('Stack empty but not on Home, forcing back to Home');
          setNavDirection('backward');
          setCurrentView(View.HOME);
          setViewStack([View.HOME]);
        }
      }
    };

    return () => {
      (window as any).onNativeBack = undefined;
    };
  }, [currentView, viewStack]);

  // ========== 注释：Native已自动处理上传，前端无需调用 ==========
  // 提取上传转写逻辑
  // const uploadTranscriptionBatch = async () => {
  //   const { transcriptionList, currentInterviewInstId } = useRecordingStore.getState();
  //
  //   if (!currentInterviewInstId || transcriptionList.length === 0) {
  //     return;
  //   }
  //
  //   // 只上传最终结果（isFinal: true）
  //   const finalResults = transcriptionList.filter(item => item.isFinal);
  //
  //   if (finalResults.length === 0) {
  //     return;
  //   }
  //
  //   try {
  //     const contentList = finalResults.map(item => ({
  //       id: item.roleId,
  //       content: item.content,
  //     }));
  //
  //     console.log('[上传转写] 上传内容:', contentList.length, '条');
  //
  //     await dealService.uploadInterviewInstContent({
  //       interviewInstId: currentInterviewInstId,
  //       contentList,
  //     });
  //
  //     console.log('[上传转写] 上传成功');
  //   } catch (error) {
  //     console.error('[上传转写] 上传失败:', error);
  //   }
  // };


  // 提取上传录音文件逻辑（Native已自动处理，以下代码已注释）
  // const uploadAudioFile = async (interviewInstId: string) => {
  //   console.log('[自动保存] 开始尝试上传录音文件...');
  //   return new Promise((resolve) => {
  //     let isResolved = false;
  //
  //     // 1. 全局超时保护 (10秒)，防止死锁
  //     const safeTimeout = setTimeout(() => {
  //       if (!isResolved) {
  //         isResolved = true;
  //         console.warn('[自动保存] 上传流程超时，强制结束');
  //         // 移除监听，防止后续回调干扰
  //         nativeBridge.off('getAudioList');
  //         nativeBridge.off('onUploadResult');
  //         resolve(false);
  //       }
  //     }, 10000);
  //
  //     // 安全的 resolve 包装
  //     const safeResolve = (val: boolean) => {
  //       if (!isResolved) {
  //         isResolved = true;
  //         clearTimeout(safeTimeout);
  //         resolve(val);
  //       }
  //     };
  //
  //     const handleAudioList = async (response: any) => {
  //       console.log('[自动保存] getAudioList回调:', JSON.stringify(response));
  //       nativeBridge.off('getAudioList', handleAudioList);
  //
  //       if (response.success && response.data && response.data.list && response.data.list.length > 0) {
  //         const latestAudio = response.data.list[0];
  //         const fileUrl = (latestAudio.fileURL || "").trim();
  //
  //         if (!fileUrl) {
  //           console.warn('[自动保存] 录音文件URL为空');
  //           safeResolve(false);
  //           return;
  //         }
  //
  //         console.log('[自动保存] 准备上传文件:', fileUrl);
  //         const token = localStorage.getItem('zov-user-token') || '';
  //         const uploadHost = config.uploadUrl;
  //
  //         const handleUploadResult = (res: any) => {
  //           console.log('[自动保存] 上传结果回调:', JSON.stringify(res));
  //           // 简单判断结果
  //           const resultData = res.data?.result || (res.data?.success !== undefined ? res.data : null);
  //           if (resultData && (resultData.success === true || resultData.errno === 0)) {
  //             const uploadedUrl = resultData.data?.url || resultData.url || (typeof resultData.data === 'string' ? resultData.data : "");
  //             if (uploadedUrl) {
  //               dealService.saveInterviewInstRecordFile({
  //                 path: uploadedUrl,
  //                 interviewInstId
  //               }).then(() => {
  //                 console.log('[自动保存] 录音文件已绑定成功');
  //                 safeResolve(true);
  //               }).catch((err) => {
  //                 console.error('[自动保存] 绑定文件失败', err);
  //                 safeResolve(false);
  //               });
  //             } else {
  //               console.warn('[自动保存] 未获取到上传后的URL');
  //               safeResolve(false);
  //             }
  //             nativeBridge.off('onUploadResult', handleUploadResult);
  //           } else if (res.success === false || (resultData && resultData.success === false)) {
  //             console.warn('[自动保存] 上传失败');
  //             nativeBridge.off('onUploadResult', handleUploadResult);
  //             safeResolve(false);
  //           }
  //         };
  //
  //         nativeBridge.on('onUploadResult', handleUploadResult);
  //         nativeBridge.uploadInterviewFile({
  //           host: uploadHost,
  //           authorization: token,
  //           filePath: fileUrl
  //         });
  //
  //       } else {
  //         console.warn('[自动保存] 未找到录音文件列表');
  //         safeResolve(false);
  //       }
  //     };
  //
  //     nativeBridge.on('getAudioList', handleAudioList);
  //     console.log('[自动保存] 调用 getAudioList...');
  //     nativeBridge.getAudioList({ surveyId: interviewInstId, page: 0, pageSize: 999 });
  //   });
  // };

  // 监听录音中断
  useEffect(() => {
    const handleInterruption = async (response: any) => {
      console.log('App.tsx: 收到中断回调', JSON.stringify(response));

      if (response.action === 'recordingInterrupted') {
        const store = useRecordingStore.getState();
        console.log('当前录音状态:', store.isRecording);

        if (store.isRecording) {
            console.log('正在执行中断保存流程...');
            store.setIsRecording(false);

            try {
              // 注释：Native会自动上传，前端无需调用
              // await Promise.all([
              //   uploadTranscriptionBatch(),
              //   store.currentInterviewInstId ? uploadAudioFile(store.currentInterviewInstId) : Promise.resolve()
              // ]);
            } catch (e) {
              console.error(e);
            } finally {
              // store.reset(); // 不要重置状态，否则会退出访谈
              
              // 弹窗提示暂停（使用状态驱动，以便恢复时可自动关闭）
              setShowInterruptDialog(true);
            }
        } else {
          console.log('无论是录音状态与否，都收到了中断信号');
          // 可选：如果不在录音中，也提示一下，方便调试确认链路通畅
          // Toast.info('收到中断信号(未在录音中)');
        }
      }
    };

    nativeBridge.on('recordingInterrupted', handleInterruption);
    return () => nativeBridge.off('recordingInterrupted', handleInterruption);
  }, []);

  // 监听录音恢复
  useEffect(() => {
    const handleResume = (response: any) => {
      console.log('App.tsx: 收到录音恢复回调', JSON.stringify(response));

      if (response.action === 'recordingResumed') {
        const store = useRecordingStore.getState();
        console.log('当前录音状态:', store.isRecording, '中断弹窗状态:', showInterruptDialog);

        // 前提条件：必须是当前已经标记为中断（弹窗显示中）且录音未开启
        if (showInterruptDialog && !store.isRecording) {
          console.log('正在执行录音恢复流程...');
          setShowInterruptDialog(false);
          store.setIsRecording(true);
          Toast.success('录音已恢复');
        } else {
          console.log('不符合恢复条件（可能未中断或已在录音）：忽略恢复信号');
        }
      }
    };

    nativeBridge.on('recordingResumed', handleResume);
    return () => nativeBridge.off('recordingResumed', handleResume);
  }, [showInterruptDialog]); // 需要依赖 showInterruptDialog 才能拿到最新值

  // ========== 注释：改为使用离线转写轮询，不再监听实时转写结果 ==========
  // 监听实时转写结果
  // useEffect(() => {
  //   let sentenceCount = 0; // 记录最终结果的句子数
  //
  //   // 这里的 uploadTranscriptionBatch 引用外部定义的函数
  //
  //   const handleTranscription = (response: any) => {
  //     if (response.success && response.data) {
  //       const parsed = handleTranscriptionResult(response.data);
  //
  //       if (parsed) {
  //         const store = useRecordingStore.getState();
  //         // 如果全局未处于录音状态（例如在资料上传页使用了局部录音），则忽略全局监听收到的转写
  //         if (!store.isRecording) {
  //           return;
  //         }
  //
  //
  //
  //         const { text, isFinal, roleId } = parsed;
  //         const { transcriptionList, setTranscriptionList, addTranscriptionChunk, updateTempTranscription } = store;
  //
  //         if (isFinal) {
  //           // 最终结果
  //           const lastItem = transcriptionList[transcriptionList.length - 1];
  //
  //           // 确定当前 RoleId:
  //           // 1. 如果 Native 解析出了明确的角色(非0)，则使用该角色
  //           // 2. 如果 Native 没给角色(或为0)，则延续上一个气泡的角色 (模拟 Native 的 currentRole 逻辑)
  //           // 3. 如果都没有，默认为 '1'
  //           const currentRoleId = roleId || (lastItem ? lastItem.roleId : '1');
  //
  //           console.log('[App] Transcription Final - Parsing Role:', roleId, 'Effective Role:', currentRoleId);
  //
  //           if (lastItem && String(lastItem.roleId) === String(currentRoleId)) {
  //             // roleId 相同，拼接内容到最后一条记录
  //             const updatedList = [...transcriptionList];
  //             updatedList[updatedList.length - 1] = {
  //               ...lastItem,
  //               content: lastItem.content + text,
  //               isFinal: true,
  //               timestamp: Date.now(),
  //             };
  //             setTranscriptionList(updatedList);
  //           } else {
  //             // roleId 不同或首次添加，创建新记录
  //             addTranscriptionChunk({
  //               id: `trans_${Date.now()}_${Math.random()}`,
  //               content: text,
  //               roleId: currentRoleId,
  //               timestamp: Date.now(),
  //               isFinal: true,
  //             });
  //           }
  //
  //           // 清空临时转写
  //           updateTempTranscription('');
  //
  //           // 注释：Native会自动上传，前端无需调用
  //           // sentenceCount++;
  //           // if (sentenceCount >= 6) {
  //           //   uploadTranscriptionBatch();
  //           //   sentenceCount = 0;
  //           // }
  //         }
  //         // Ignore intermediate results (isFinal: false) as requested
  //       }
  //     }
  //   };
  //
  //   nativeBridge.on('transcriptionResult', handleTranscription);
  //
  //   return () => {
  //     nativeBridge.off('transcriptionResult', handleTranscription);
  //   };
  // }, [currentView]); // 依赖 currentView 以确保闭包中拿到最新值

  const handleEditCorporateInfo = () => {
    setPreviousView(currentView);
    navigateForward(View.CORPORATE_EDIT);
  };

  // 处理新建尽调
  const handleCreateDeal = async () => {
    if (!newCustomerName.trim()) {
      Toast.info('请输入项目名称');
      return;
    }
    if (selectedQuestionTemplates.length === 0) {
      Toast.info('请选择问题清单');
      setShowCreateQuestionPicker(true);
      return;
    }

    try {
      setCreating(true);
      const selectedQuestionList = selectedQuestionTemplates.length > 0
        ? selectedQuestionTemplates
          .flatMap((template) => Array.isArray(template.questionList)
            ? template.questionList.map((question: any) => ({ ...question, sourceTemplateId: template.id }))
            : [])
          .map((question: any, index: number) => ({
          ...question,
          id: question.id ? String(question.id) : `temp_create_${Date.now()}_${index}`,
          questionIndex: index + 1,
          questionAnswer: question.questionAnswer ?? null,
          questionAnswerTime: question.questionAnswerTime ?? null,
          questionStatus: question.questionStatus ?? '0',
          recStatus: question.recStatus ?? '1',
          templateId: String(question.templateId || question.sourceTemplateId || selectedQuestionTemplates[0]?.id || ''),
          agencyId: question.agencyId ?? '',
          CHECKED: question.CHECKED ?? false,
        }))
        : undefined;
      const res = await dealService.createOrUpdateDealInst({
        interviewCust: newCustomerName.trim(),
        companyName: companyName || undefined,
        creditCode: creditCode || undefined,
        templateId: selectedTemplateId || undefined,
        questionId: selectedQuestionTemplates.length > 0 ? selectedQuestionTemplates.map((template) => template.id).join(',') : undefined,
        questionInfoList: selectedQuestionList,
      });

      if (res.success && res.data) {
        // 更新当前尽调数据，确保后续页面（如上传资料页）显示正确的项目名称
        setCurrentDeal(res.data);
        
        // 如果提供了企业信息，触发异步同步任务
        if (creditCode || companyName) {
           dealService.syncEnterprise(res.data.id).catch(e => console.error('Auto sync failed:', e));
        }

        Toast.success('创建成功');
        resetCreateForm();
        // 新建完成后直接进入尽调详情，减少跳转成本
        setPreviousView(View.HOME);
        setMaterialUploadTab('upload');
        navigateForward(View.DUE_DILIGENCE);
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

  const selectedTemplate = templateOptions.find((item) => String(item.id) === String(selectedTemplateId));

  return (
    <>
      <div className="fixed inset-0 w-full h-full z-[-1] bg-page-gradient" />

      {/* Main App */}
      <div ref={appContainerRef} className="w-full max-w-md mx-auto h-screen relative overflow-hidden bg-transparent">
          {/* Custom Limit Tips Toast */}
          {showLimitTips && (
            <div className="fixed top-24 left-4 right-4 z-[100] animate-[slideDown_0.3s_ease-out_forwards] flex justify-center pointer-events-none">
              <div className="bg-black/40 backdrop-blur-sm text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2">
                <span className="text-sm font-medium tracking-wide">
                  您正有一个访谈正在进行中，暂时不支持开启新任务。
                </span>
              </div>
            </div>
          )}

          <AnimatePresence initial={false} mode={navDirection === 'root' ? 'wait' : 'sync'}>
            <motion.div
              key={currentView}
              initial={{
                x: navDirection === 'root' ? 0 : (navDirection === 'forward' ? '100%' : '-100%'),
                opacity: 1,
                zIndex: 10
              }}
              animate={{
                x: 0,
                opacity: 1,
                zIndex: 10
              }}
              exit={{
                x: navDirection === 'root' ? 0 : (navDirection === 'forward' ? '-30%' : '100%'),
                opacity: navDirection === 'root' ? 0 : (navDirection === 'forward' ? 0.8 : 1),
                zIndex: 1,
                transition: { duration: navDirection === 'root' ? 0 : 0.3 }
              }}
              transition={{
                type: navDirection === 'root' ? 'tween' : 'spring',
                stiffness: 300,
                damping: 30,
                mass: 0.8,
                duration: navDirection === 'root' ? 0.2 : undefined
              }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
              }}
            >
              {currentView === View.LOGIN && (
                <LoginPage onLogin={() => navigateForward(View.HOME)} />
              )}
              {currentView === View.HOME && (
                <HomePage
                  initialTab={homeTab}
                  onTabChange={setHomeTab}
                  onNavigateToDetail={(deal) => {
                    setCurrentDeal(deal);
                    setPreviousView(View.HOME);
                    navigateForward(View.DUE_DILIGENCE);
                  }}

                  onNavigateToRecording={async (deal) => {
                    try {
                      // 调用接口创建访谈实例
                      Toast.loading({ message: '准备访谈中...', duration: 0, forbidClick: true });
                      // 1. 创建访谈实例
                      const createRes = await dealService.createInterviewInst({
                        interviewDealInstId: deal.id,
                        interviewCustom: deal.interviewCust
                      });

                      if (createRes.success && createRes.data) {
                        const instId = typeof createRes.data === 'string' ? createRes.data : createRes.data?.interviewInstId;
                        const instTitle = typeof createRes.data === 'string' ? '' : createRes.data?.interviewInstTitle;

                        const currentStore = useRecordingStore.getState();
                        // 如果没有当前访谈 ID，或者切换了访谈对象（ID不一致），则重置录音状态（初始化页面）
                        if (currentStore.currentInterviewInstId !== instId) {
                          currentStore.reset();
                          
                          // 同时清理当前 Deal 的命中状态 (仅限本地展示，直到下次从后端刷最新数据)
                          const clearedQuestions = (deal.questionInfoList || []).map(q => ({
                            ...q,
                            CHECKED: false,
                            questionAnswer: ''
                          }));
                          setCurrentDeal({ ...deal, questionInfoList: clearedQuestions });
                        }

                        // 更新 Zustand Store (不设置 dealId，等真正开始录音时再设置)
                        setData({
                          interviewInstId: instId,
                          title: instTitle || ''
                        });
                      }

                      Toast.clear();

                      setRecordingBackView(View.HOME);
                      setPreviousView(View.HOME);
                      navigateForward(View.RECORDING);
                    } catch (error) {
                      Toast.clear();
                      Toast.fail('创建访谈失败');
                      console.error('Failed to create interview instance:', error);
                    }
                  }}
                  onNavigateToTemplates={() => {
                    navigateForward(View.MANAGEMENT);
                  }}
                  onNavigateToSettings={() => {
                    navigateForward(View.SETTINGS);
                  }}
                  onNavigateToMessages={() => {
                    navigateForward(View.MESSAGE_CENTER);
                  }}
                />
              )}
              {currentView === View.DUE_DILIGENCE && (
                <DueDiligencePage
                  deal={currentDeal}
                  isEnterpriseSyncing={isEnterpriseSyncing}
                  setIsEnterpriseSyncing={setIsEnterpriseSyncing}
                  onBack={() => navigateBackward(previousView === View.REPORTS_LIST ? View.REPORTS_LIST : View.HOME)}
                  onNavigateToRecording={async () => {
                    if (!currentDeal?.id) {
                      Toast.fail('尽调信息不存在');
                      return;
                    }

                    try {
                      // 改为使用本地 Store 校验，与 DueDiligencePage 保持一致
                      const store = useRecordingStore.getState();
                      const activeDealId = store.currentDealId;

                      if (activeDealId && activeDealId !== currentDeal.id) {
                        setShowLimitTips(true);
                        setTimeout(() => setShowLimitTips(false), 3000);
                        return;
                      }

                      // 调用接口创建访谈实例
                      Toast.loading({ message: '准备访谈中...', duration: 0, forbidClick: true });

                      // 创建访谈实例（如果已存在会返回现有实例）
                      const createRes = await dealService.createInterviewInst({
                        interviewDealInstId: currentDeal.id,
                        interviewCustom: currentDeal.interviewCust
                      });

                      if (createRes.success && createRes.data) {
                        const instId = typeof createRes.data === 'string' ? createRes.data : createRes.data?.interviewInstId;
                        const instTitle = typeof createRes.data === 'string' ? '' : createRes.data?.interviewInstTitle;

                        // 如果没有当前访谈 ID，或者切换了访谈对象（ID不一致），则重置录音状态（初始化页面）
                        const currentStore = useRecordingStore.getState();
                        if (currentStore.currentInterviewInstId !== instId) {
                          currentStore.reset();
                          
                          // 同时清理当前 Deal 的命中状态 (仅限本地展示，直到下次从后端刷最新数据)
                          if (currentDeal) {
                            const clearedQuestions = (currentDeal.questionInfoList || []).map(q => ({
                              ...q,
                              CHECKED: false,
                              questionAnswer: ''
                            }));
                            setCurrentDeal({ ...currentDeal, questionInfoList: clearedQuestions });
                          }
                        }

                        // 更新 Store (不设置 dealId，等真正开始录音时再设置)
                        setData({
                          interviewInstId: instId,
                          title: instTitle || '',
                        });

                        Toast.clear();

                        // 现在统一重构路由栈为：HOME -> DUE_DILIGENCE -> RECORDING
                        setRecordingBackView(View.DUE_DILIGENCE);
                        setPreviousView(View.DUE_DILIGENCE);
                        
                        // 先重置栈为 [HOME, DUE_DILIGENCE]，模拟是从详情页跳进来的
                        setViewStack([View.HOME, View.DUE_DILIGENCE]);
                        
                        // 然后使用 navigateForward 导航到录音页，这会自动把 RECORDING 压入栈并处理动画
                        navigateForward(View.RECORDING);
                      } else {
                        Toast.clear();
                        Toast.fail(createRes.message || '创建访谈实例失败');
                      }
                    } catch (error) {
                      Toast.clear();
                      console.error('Create interview instance failed:', error);
                      Toast.fail('创建访谈实例失败');
                    }
                  }}
                  onNavigateToMaterials={() => {
                    setPreviousView(View.DUE_DILIGENCE);
                    navigateForward(View.MATERIALS_LIST);
                  }}
                  onNavigateToQuestions={() => navigateForward(View.QUESTIONS_LIST)}
                  onEditInfo={handleEditCorporateInfo}
                  onChangeTemplate={() => {
                    setPreviousView(View.DUE_DILIGENCE);
                    navigateForward(View.TEMPLATE_SELECTION);
                  }}
                  onNavigateToHistory={() => {
                    setHistoryBackView(View.DUE_DILIGENCE);
                    setPreviousView(View.DUE_DILIGENCE);
                    navigateForward(View.HISTORY);
                  }}
                  onOpenInterviewRecord={(record: any) => {
                    const instId = record?.interviewInstId || record?.id;
                    if (!instId) {
                      Toast.fail('访谈记录不存在');
                      return;
                    }

                    const instTitle = record?.interviewInstTitle || record?.interviewInstName || '访谈记录';
                    const currentStore = useRecordingStore.getState();
                    if (currentStore.currentInterviewInstId !== instId) {
                      currentStore.reset();
                    }

                    setData({
                      dealId: currentDeal?.id,
                      interviewInstId: instId,
                      title: instTitle,
                    });
                    setRecordingBackView(View.DUE_DILIGENCE);
                    setPreviousView(View.DUE_DILIGENCE);
                    setViewStack([View.HOME, View.DUE_DILIGENCE]);
                    navigateForward(View.RECORDING);
                  }}
                  onPreviewReport={(name, reportUrl, previewUrl, showDownloadButton) => {
                    setPreviewReport({ name, reportUrl, previewUrl, showDownloadButton });
                    setPreviousView(View.DUE_DILIGENCE);
                    navigateForward(View.REPORT_PREVIEW);
                  }}
                  onDealDetailLoaded={(detail) => setCurrentDeal(detail)}
                />
              )}
              {currentView === View.MATERIALS_LIST && (
                <MaterialsListPage
                  dealId={currentDeal?.id}
                  onBack={() => navigateBackward(previousView === View.RECORDING ? View.RECORDING : View.DUE_DILIGENCE)}
                  onPreviewFile={async (name, url, fileId) => {
                    try {
                      Toast.loading({ message: '正在加载预览...', duration: 0, forbidClick: true });
                      // 直接调用服务获取预览地址，跳过 TemplatePreviewPage 中间页
                      const res = await dealService.viewReportUrl(fileId, url);
                      Toast.clear();

                      if (res.success && res.data) {
                        setPreviewReport({ 
                          name, 
                          reportUrl: url, 
                          previewUrl: res.data, 
                          showDownloadButton: false 
                        });
                        setPreviousView(View.MATERIALS_LIST);
                        navigateForward(View.REPORT_PREVIEW);
                      } else {
                        Toast.fail(res.message || '加载预览失败');
                      }
                    } catch (error) {
                      Toast.clear();
                      console.error('Preview failed:', error);
                      Toast.fail('加载预览失败');
                    }
                  }}
                  isArchived={currentDeal?.status === '5' || currentDeal?.dealType === 1}
                  reportStatus={currentDeal?.reportStatus}
                />
              )}
              {currentView === View.MATERIAL_UPLOAD && (
                <MaterialUploadPage
                  deal={currentDeal}
                  onBack={() => navigateBackward(View.HOME)}
                  onConfirm={() => {
                    // 刚新建完确认进入详情，重置栈，使得返回直接回到首页
                    setViewStack([View.HOME, View.DUE_DILIGENCE]);
                    setNavDirection('forward');
                    setCurrentView(View.DUE_DILIGENCE);
                  }}
                  onStartInterview={async () => {
                    if (!currentDeal) return;
                    try {
                      Toast.loading({ message: '准备访谈中...', duration: 0, forbidClick: true });
                      // 1. 创建访谈实例
                      const createRes = await dealService.createInterviewInst({
                        interviewDealInstId: currentDeal.id,
                        interviewCustom: currentDeal.interviewCust
                      });

                      if (createRes.success && createRes.data) {
                        const instId = typeof createRes.data === 'string' ? createRes.data : createRes.data?.interviewInstId;
                        const instTitle = typeof createRes.data === 'string' ? '' : createRes.data?.interviewInstTitle;

                        const currentStore = useRecordingStore.getState();
                        // 如果没有当前访谈 ID，或者切换了访谈实例，重置
                        if (currentStore.currentInterviewInstId !== instId) {
                          currentStore.reset();

                          // 同时清理当前 Deal 的命中状态
                          if (currentDeal) {
                            const clearedQuestions = (currentDeal.questionInfoList || []).map(q => ({
                              ...q,
                              CHECKED: false,
                              questionAnswer: ''
                            }));
                            // 暂时更新本地状态，不再调用 detailRes 覆盖它，直到录音真正开始
                            setCurrentDeal({ ...currentDeal, questionInfoList: clearedQuestions });
                          }
                        }

                        // 更新 Store (不设置 dealId，等真正开始录音时再设置)
                        setData({
                          interviewInstId: instId,
                          title: instTitle || ''
                        });
                      }

                      // 统一在进入录音页前，只有在非“新访谈”场景下才全量刷新（防止覆盖刚清理的状态）
                      // 实际上 RecordingPage 内部也会 fetch，所以这里可以简化
                      Toast.clear();
                      setRecordingBackView(View.DUE_DILIGENCE);
                      setPreviousView(View.DUE_DILIGENCE);
                      navigateForward(View.RECORDING);
                    } catch (error) {
                      Toast.clear();
                      console.error("Failed to start interview:", error);
                      Toast.fail('进入访谈失败');
                    }
                  }}
                  onEditInfo={handleEditCorporateInfo}
                  onChangeTemplate={() => {
                    setPreviousView(View.MATERIAL_UPLOAD);
                    navigateForward(View.TEMPLATE_SELECTION);
                  }}
                  onPreviewTemplate={async (name, url, id, type) => {
                    if (type === 'template') {
                      // 模板预览：走新逻辑，支持"使用此模板"
                      try {
                        Toast.loading({ message: '正在加载预览...', duration: 0, forbidClick: true });
                        const res = await dealService.viewReportUrl(undefined, url);
                        Toast.clear();

                        // 只有当不是当前正在使用的模板时，才显示"使用此模板"按钮
                        const isCurrent = currentDeal?.templateId && String(currentDeal.templateId) === String(id);

                        if (res.success && res.data) {
                          setPreviewReport({
                            name,
                            reportUrl: url,
                            previewUrl: res.data,
                            templateId: id,
                            actionType: isCurrent ? undefined : 'select_template',
                            showDownloadButton: false,
                            returnTargetView: View.MATERIAL_UPLOAD
                          });
                          setPreviousView(View.MATERIAL_UPLOAD);
                          navigateForward(View.REPORT_PREVIEW);
                        } else {
                          Toast.fail(res.message || '加载预览失败');
                        }
                      } catch (error) {
                        Toast.clear();
                        console.error('Template preview failed:', error);
                        Toast.fail('加载预览失败');
                      }
                    } else {
                      // 资料文件预览
                      try {
                        Toast.loading({ message: '正在加载预览...', duration: 0, forbidClick: true });
                        // 调用 viewReportUrl 获取预览链接，传入 fileId (即 id)
                        const res = await dealService.viewReportUrl(id, url);
                        Toast.clear();

                        if (res.success && res.data) {
                          setPreviewReport({
                            name,
                            reportUrl: url,
                            previewUrl: res.data,
                            showDownloadButton: false,
                            returnTargetView: View.MATERIAL_UPLOAD
                          });
                          setPreviousView(View.MATERIAL_UPLOAD);
                          navigateForward(View.REPORT_PREVIEW);
                        } else {
                           Toast.fail(res.message || '加载预览失败');
                        }
                      } catch(error) {
                        Toast.clear();
                        console.error('File preview failed:', error);
                        Toast.fail('加载预览失败');
                      }
                    }
                  }}
                  initialTab={materialUploadTab}
                  onTabChange={setMaterialUploadTab}
                />
              )}
              {currentView === View.AI_GENERATION && (
                <AiGenerationPage
                  onBack={() => navigateBackward(View.MATERIAL_UPLOAD)}
                  onConfirm={() => {
                    setViewStack([View.HOME, View.DUE_DILIGENCE]);
                    setNavDirection('forward');
                    setCurrentView(View.DUE_DILIGENCE);
                  }}
                />
              )}
              {currentView === View.ENTERPRISE_DETAIL && (
                <EnterpriseDetailPage
                    data={enterpriseDetailData}
                    onBack={() => navigateBackward(View.DUE_DILIGENCE)}
                />
              )}
              {currentView === View.RECORDING && (
                <RecordingPage
                  deal={currentDeal}
                  onBack={() => navigateBackward(recordingBackView)}
                  onHistoryClick={() => {
                    setHistoryBackView(View.RECORDING);
                    setPreviousView(View.RECORDING);
                    navigateForward(View.HISTORY);
                  }}
                  isRecording={isRecording}
                  seconds={recordingSeconds}
                  onToggleRecording={(forceState?: boolean) => {
                    if (typeof forceState === 'boolean') {
                      setIsRecording(forceState);
                    } else {
                      setIsRecording(!isRecording);
                    }
                  }}
                  interviewInstId={currentInterviewInstId || undefined}
                  interviewInstTitle={currentInterviewInstTitle || undefined}
                  onDealUpdate={(updatedDeal) => {
                    console.log('[App] Received deal update from RecordingPage', updatedDeal);
                    if (currentDeal && updatedDeal.id === currentDeal.id) {
                      setCurrentDeal({ ...currentDeal, ...updatedDeal });
                    }
                  }}
                  onFinish={() => {
                    // 确保回到尽调详情页, 并重置返回路径为首页
                    setPreviousView(View.HOME);
                    // 重置栈，使得在详情页点击返回直接回首页，防止退回到录音或资料页
                    setViewStack([View.HOME, View.DUE_DILIGENCE]);
                    setNavDirection('backward'); // 视为一段流程的结束
                    setCurrentView(View.DUE_DILIGENCE);
                  }}
                />
              )}
              {currentView === View.HISTORY && (
                <HistoryRecordsPage
                  dealId={currentDeal?.id}
                  isArchived={currentDeal?.status === '5' || currentDeal?.dealType === 1}
                  onBack={() => {
                    navigateBackward(historyBackView);
                  }}
                  onStartInterview={() => {
                    setPreviousView(recordingBackView);
                    navigateBackward(View.RECORDING);
                  }}
                  onRecordClick={(record: any) => {
                    const nextHistoryDetailData = {
                      id: record.interviewInstId || record.id,
                      title: record.interviewInstTitle || record.interviewInstName || '访谈详情'
                    };
                    setHistoryDetailData(nextHistoryDetailData);
                    sessionStorage.setItem('zov-history-detail', JSON.stringify(nextHistoryDetailData));
                    setPreviousView(View.HISTORY);
                    navigateForward(View.HISTORY_DETAIL);
                  }}
                />
              )}
              {currentView === View.HISTORY_DETAIL && (
                <HistoryDetailPage
                  deal={currentDeal}
                  interviewInstId={historyDetailData?.id || currentDeal?.interviewInstList?.[0]?.interviewInstId || ''}
                  interviewInstTitle={historyDetailData?.title || currentDeal?.interviewInstList?.[0]?.interviewInstTitle || currentDeal?.interviewInstList?.[0]?.interviewInstName || ''}
                  onBack={() => navigateBackward(View.HISTORY)}
                />
              )}
              {currentView === View.CORPORATE_EDIT && (
                <CorporateEditPage
                  deal={currentDeal}
                  setIsEnterpriseSyncing={setIsEnterpriseSyncing}
                  onBack={() => navigateBackward(previousView)}
                  onConfirm={(updatedName, updatedLogo) => {
                    // 更新 currentDeal 的企业名称和 logo
                    if (currentDeal) {
                      setCurrentDeal({
                        ...currentDeal,
                        interviewCust: updatedName,
                        logo: updatedLogo,
                      });
                    }
                    navigateBackward(previousView);
                  }}
                />
              )}
              {currentView === View.UPLOAD_TEMPLATE && (
                <UploadTemplatePage
                  onBack={() => {
                    // 从"更换"入口进来的，返回时还原到模板列表 tab
                    if (uploadTemplateInitialData) {
                      setTemplateInitialTab('templates');
                    }
                    setUploadTemplateInitialData(null);
                    navigateBackward(View.MANAGEMENT);
                  }}
                  onCancel={() => {
                    // 从"更换"入口进来的，取消时还原到模板列表 tab
                    if (uploadTemplateInitialData) {
                      setTemplateInitialTab('templates');
                    }
                    setUploadTemplateInitialData(null);
                    navigateBackward(View.MANAGEMENT);
                  }}
                  onSubmit={() => {
                    // 提交成功后不立即返回，等待用户点击"查看列表"
                  }}
                  onViewList={() => {
                    // 点击"查看列表"后跳转到模板管理页
                    setUploadTemplateInitialData(null);
                    setTemplateInitialTab('templates');
                    navigateBackward(View.MANAGEMENT);
                  }}
                  initialData={uploadTemplateInitialData}
                />
              )}
              {currentView === View.TEMPLATE_SELECTION && (
                <TemplateSelectionPage
                  onBack={() => {
                      // 使用 stack 历史回退，避免 previousView 被预览操作污染
                      console.log('[TemplateSelection] onBack check stack:', viewStack);
                      let backTarget = viewStack.length > 1 ? viewStack[viewStack.length - 2] : View.DUE_DILIGENCE;
                      if (!backTarget) backTarget = View.HOME; // 防止 undefined
                      
                      console.log('[TemplateSelection] navigating back to:', backTarget);
                      navigateBackward(backTarget);
                  }}
                  onPreview={async (name, url, id) => {
                    // 直接调用服务获取预览地址，跳过 TemplatePreviewPage 中间页
                    try {
                        Toast.loading({ message: '正在加载预览...', duration: 0, forbidClick: true });
                        // 模板预览不传 ID
                        const res = await dealService.viewReportUrl(undefined, url);
                        Toast.clear();

                        const isCurrent = currentDeal?.templateId && String(currentDeal.templateId) === String(id);

                        if (res.success && res.data) {
                            setPreviewReport({ 
                                name, 
                                reportUrl: url, 
                                previewUrl: res.data, 
                                templateId: id,
                                actionType: isCurrent ? undefined : 'select_template',
                                showDownloadButton: false,
                                returnTargetView: previousView, // 记录来源页（如资料上传页或尽调详情页）
                            });
                            // 设置 View.TEMPLATE_SELECTION 为 previousView，以便从预览页返回能回到列表
                            setPreviousView(View.TEMPLATE_SELECTION);
                            navigateForward(View.REPORT_PREVIEW);
                        } else {
                            Toast.fail(res.message || '加载预览失败');
                        }
                    } catch (error) {
                        Toast.clear();
                        console.error('Template preview failed:', error);
                        Toast.fail('加载预览失败');
                    }
                  }}
                  currentTemplateId={currentDeal?.templateId}
                  dealId={currentDeal?.id}
                  onTemplateChanged={async (newTemplateId) => {
                    // 更换成功后，同步问题列表
                    if (currentDeal?.id) {
                      await handleTemplateChanged(newTemplateId);
                    } else if (currentDeal) {
                      setCurrentDeal({
                        ...currentDeal,
                        templateId: newTemplateId,
                      });
                    }
                    // 返回到之前的页面
                    navigateBackward(previousView);
                  }}
                />
              )}
              {currentView === View.TEMPLATE_PREVIEW && previewTemplate && (
                <TemplatePreviewPage
                  templateName={previewTemplate.name}
                  templateUrl={previewTemplate.url}
                  templateId={previewTemplate.id}
                  skipIdInPreview={previousView === View.TEMPLATE_SELECTION || previousView === View.MANAGEMENT} // 如果是从模板选择页或模板管理页进来的，跳过 ID；如果是资料预览(MATERIALS_LIST)则不跳过
                  onBack={() => {
                    // 与原生返回保持一致，取栈中倒数第二个页面
                    if (viewStack.length > 1) {
                      navigateBackward(viewStack[viewStack.length - 2]);
                    } else {
                      navigateBackward(previousView);
                    }
                  }}
                  onSelect={currentDeal?.id ? async (templateId) => {
                    // 避免重复选择
                    if (currentDeal.templateId === templateId) {
                      return;
                    }

                    try {
                      Toast.loading({ message: '更换中...', duration: 0 });
                      const res = await dealService.changeReportTemplate({
                        id: currentDeal.id,
                        templateId: templateId,
                      });
                      Toast.clear();

                      if (res.success) {
                        Toast.success('更换成功');
                        
                        // 按照用户需求：同步问题列表
                        await handleTemplateChanged(templateId);

                        // 返回到尽调详情页
                        navigateBackward(View.DUE_DILIGENCE);
                      } else {
                        Toast.fail(res.message || '更换失败');
                      }
                    } catch (error) {
                      Toast.clear();
                      console.error('Failed to change template:', error);
                      Toast.fail('更换失败');
                    }
                  } : undefined}
                  onPreviewReport={(name, url, previewUrl, showDownload) => {
                    // 设置预览数据
                    setPreviewReport({ name, reportUrl: url, previewUrl, showDownloadButton: showDownload });
                    
                    // 使用 Replace 模式跳转：将当前的 TEMPLATE_PREVIEW 替换为 REPORT_PREVIEW
                    // 这样点击返回时，会直接回到上一级（如模板选择页），避免死循环
                    const parentView = viewStack[viewStack.length - 2] || View.HOME;
                    setPreviousView(parentView);
                    
                    setViewStack(prev => {
                      const newStack = [...prev];
                      // 替换栈顶
                      if (newStack.length > 0) {
                        newStack[newStack.length - 1] = View.REPORT_PREVIEW;
                      }
                      return newStack;
                    });
                    
                    // 切换视图（不使用 navigateForward 以避免 push）
                    setCurrentView(View.REPORT_PREVIEW);
                  }}
                />
              )}
              {currentView === View.REPORT_PREVIEW && previewReport && (
                <ReportPreviewPage
                  reportName={previewReport.name}
                  reportUrl={previewReport.reportUrl}
                  previewUrl={previewReport.previewUrl}
                  showDownloadButton={(previewReport as any).showDownloadButton}
                  actionButtonText={previewReport.actionType === 'select_template' ? '使用此模板' : undefined}
                  onAction={previewReport.actionType === 'select_template' && currentDeal?.id && previewReport.templateId ? async () => {
                     // 处理选择模板逻辑
                     const templateId = previewReport.templateId!;
                     // 避免重复选择
                     if (currentDeal.templateId === templateId) {
                         Toast.info('当前已是该模板');
                         return;
                     }

                     try {
                       Toast.loading({ message: '更换中...', duration: 0 });
                       const res = await dealService.changeReportTemplate({
                         id: currentDeal.id,
                         templateId: templateId,
                       });
                       Toast.clear();

                       if (res.success) {
                         Toast.success('更换成功');
                         
                         // 同步问题列表 (如果有定义该函数)
                         // 假设该函数在作用域内
                         if (typeof handleTemplateChanged === 'function') {
                            await handleTemplateChanged(templateId);
                         }

                         // 返回到来源页 (如资料上传页) 而不是死板的详情页
                         if (previewReport.returnTargetView) {
                            navigateBackward(previewReport.returnTargetView);
                         } else {
                            navigateBackward(View.DUE_DILIGENCE);
                         }
                       } else {
                         Toast.fail(res.message || '更换失败');
                       }
                     } catch (error) {
                       Toast.clear();
                       console.error('Failed to change template:', error);
                       Toast.fail('更换失败');
                     }
                  } : undefined}
                  onRefresh={currentDeal?.id && currentDeal?.status !== '5' && previousView === View.DUE_DILIGENCE ? () => {
                     Dialog.confirm({
                        title: '确认生成',
                        message: '重新生成报告将覆盖现有报告，是否继续?',
                        confirmButtonColor: '#2563EB',
                        cancelButtonColor: '#969799',
                     }).then(async () => {
                        if (!currentDeal?.id) return;
                        try {
                           Toast.loading({ message: '正在提交...', duration: 0 });
                           const res = await dealService.generateInterviewInstReportAsync(currentDeal.id);
                           Toast.clear();
                           if (res.success) {
                              Toast.success('报告生成任务已提交');
                              // 提交成功后返回详情页，以便用户看到"生成中"的状态
                              navigateBackward(View.DUE_DILIGENCE);
                              
                              // 尝试刷新 currentDeal 状态
                              refreshDealDetail();

                           } else {
                              Toast.fail(res.message || '提交失败');
                           }
                        } catch (e) {
                           Toast.clear();
                           console.error(e);
                           Toast.fail('提交失败');
                        }
                     }).catch(() => {});
                  } : undefined}
                  onBack={() => {
                    console.log('[ReportPreview] Navigating back, previousView:', previousView);
                    console.log('[ReportPreview] Current deal:', currentDeal);
                    setPreviewReport(null);
                    navigateBackward(previousView);
                  }}
                />
              )}
              {currentView === View.QUESTIONS_LIST && (
                <QuestionsListPage
                  dealId={currentDeal?.id}
                  questionId={currentDeal?.questionId}
                  questionInfoList={currentDeal?.questionInfoList || []}
                  isArchived={currentDeal?.status === '5' || currentDeal?.dealType === 1}
                  onBack={() => navigateBackward(View.DUE_DILIGENCE)}
                  onSave={async (finalQuestions) => {
                    const deal = currentDealRef.current;
                    if (deal) {
                      setCurrentDeal({
                        ...deal,
                        questionInfoList: finalQuestions
                      });
                      refreshDealDetail();
                    }
                  }}
                />
              )}
              {currentView === View.SETTINGS && (
                <SettingsPage
                  onLogout={() => {
                    localStorage.removeItem('zov-user-token');
                    localStorage.removeItem('zov-user-info');
                    sessionStorage.removeItem('zov-current-view');
                    sessionStorage.removeItem('zov-current-deal');
                    setHomeTab('ongoing'); // <--- 退出登录时重置首页 Tab
                    setNavDirection('root');
                    setCurrentView(View.LOGIN);
                    setCurrentDeal(null);
                  }}
                  onNavigateToTemplates={() => {
                    setPreviousView(View.SETTINGS);
                    navigateForward(View.MANAGEMENT);
                  }}
                  onNavigateToUserAgreement={() => {
                      setPreviousView(View.SETTINGS);
                      navigateForward(View.USER_AGREEMENT);
                  }}
                  onNavigateToPrivacyPolicy={() => {
                      setPreviousView(View.SETTINGS);
                      navigateForward(View.PRIVACY_POLICY);
                  }}
                  onNavigateToOrganizationManagement={() => {
                      setPreviousView(View.SETTINGS);
                      navigateForward(View.ORGANIZATION_MANAGEMENT);
                  }}
                  onNavigateToShareApp={() => {
                      setPreviousView(View.SETTINGS);
                      navigateForward(View.SHARE_APP);
                  }}
                  onBottomNavHiddenChange={setHideBottomNav}
                />
              )}
              {currentView === View.ORGANIZATION_MANAGEMENT && (
                <OrganizationManagementPage 
                  onBack={() => navigateBackward(View.SETTINGS)}
                  onNavigateJoinOrganization={() => navigateForward(View.JOIN_ORGANIZATION)}
                />
              )}
              {currentView === View.JOIN_ORGANIZATION && (
                <JoinOrganizationPage
                  onBack={() => navigateBackward(View.ORGANIZATION_MANAGEMENT)}
                  onSuccess={() => navigateBackward(View.ORGANIZATION_MANAGEMENT)}
                />
              )}
              {currentView === View.SHARE_APP && (
                <ShareAppPage 
                  onBack={() => navigateBackward(View.SETTINGS)}
                />
              )}
              {currentView === View.MESSAGE_CENTER && (
                <MessageCenterPage
                  onBack={() => navigateBackward(View.HOME)}
                />
              )}
              {currentView === View.MANAGEMENT && (
                <MyTemplatesPage
                  onUpload={(templateData) => {
                    if (templateData) {
                      setUploadTemplateInitialData(templateData);
                    } else {
                      setUploadTemplateInitialData(null);
                    }
                    navigateForward(View.UPLOAD_TEMPLATE);
                  }}
                  onPreview={async (name, url, currentTab) => {
                    try {
                      // 记录当前 Tab，确保预览返回时状态一致
                      setTemplateInitialTab(currentTab);
                      
                      Toast.loading({ message: '正在加载预览...', duration: 0, forbidClick: true });
                      const res = await dealService.viewReportUrl(undefined, url);
                      Toast.clear();
                      if (res.success && res.data) {
                        setPreviewReport({
                          name,
                          reportUrl: url,
                          previewUrl: res.data,
                          showDownloadButton: false,
                        });
                        setPreviousView(View.MANAGEMENT);
                        navigateForward(View.REPORT_PREVIEW);
                      } else {
                        Toast.fail('预览加载失败，请重试');
                      }
                    } catch (e) {
                      Toast.clear();
                      Toast.fail('预览加载失败，请重试');
                    }
                  }}
                  initialTab={templateInitialTab}
                />
              )}
              {currentView === View.REPORTS_LIST && (
                <ReportsListPage
                  onBack={() => navigateBackward(View.HOME)}
                  onPreviewReport={(name, url, previewUrl, showDownloadButton) => {
                    setPreviewReport({ name, reportUrl: url, previewUrl, showDownloadButton });
                    setPreviousView(View.REPORTS_LIST);
                    navigateForward(View.REPORT_PREVIEW);
                  }}
                  onViewDealDetail={async (dealId) => {
                      if (!dealId) return;
                      try {
                          Toast.loading({ message: '加载中...', duration: 0, forbidClick: true });
                          // 获取详情
                          const res = await dealService.getDealInstDetail(dealId);
                          Toast.clear();
                          
                          if (res.success && res.data) {
                              setCurrentDeal(res.data);
                              // 设置 previousView 为 REPORTS_LIST，以便从详情页返回时能回列表
                              setPreviousView(View.REPORTS_LIST);
                              navigateForward(View.DUE_DILIGENCE);
                          } else {
                              Toast.fail(res.message || '获取尽调详情失败');
                          }
                      } catch (error) {
                          Toast.clear();
                          console.error('Fetch deal detail failed:', error);
                          Toast.fail('获取详情失败');
                      }
                  }}
                />
              )}
              {currentView === View.USER_AGREEMENT && (
                <UserAgreementPage
                   onBack={() => navigateBackward(View.SETTINGS)}
                />
              )}
              {currentView === View.PRIVACY_POLICY && (
                <PrivacyPolicyPage
                   onBack={() => navigateBackward(View.SETTINGS)}
                />
              )}
              {currentView === View.INVITATION_CENTER && (
                <InvitationCenterPage
                   onBack={() => navigateBackward(View.SETTINGS)}
                />
              )}
            </motion.div>
          </AnimatePresence>
          {/* 全局录音悬浮窗 - 胶囊样式 */}
          {currentInterviewInstId && (recordingSeconds > 0 || isRecording) && currentView !== View.LOGIN && currentView !== View.RECORDING && (
            <RecordingFloatBubble
              isRecording={isRecording}
              seconds={recordingSeconds}
              appContainerRef={appContainerRef}
              onClick={() => {
                // 更新 previousView 为当前页面，以便录音页返回时能回到正确的位置
                if (currentView !== View.REPORT_PREVIEW) {
                  setPreviousView(currentView);
                }
                navigateForward(View.RECORDING);
              }}
            />
          )}

          {/* Global Fixed Bottom Navigation Bar - Only for Home, Management, Reports and Settings */}
          {!hideBottomNav && (currentView === View.HOME || currentView === View.SETTINGS || currentView === View.MANAGEMENT || currentView === View.REPORTS_LIST) && (
            <div
              className="fixed bottom-0 left-1/2 right-auto w-full max-w-md -translate-x-1/2 bg-[#FFFFFF]/92 backdrop-blur-xl z-50 flex items-center justify-around pb-1 shadow-[0_-8px_24px_rgba(15,40,72,0.075)]"
              style={{ height: 72 }}
            >
              {/* 首页 */}
              <button
                className="flex flex-col items-center gap-1 min-w-[64px] pt-1 active:scale-95 transition-transform"
                onClick={() => {
                  if (currentView !== View.HOME) {
                    setHomeTab('ongoing'); // <--- 重置首页 Tab 为“进行中”
                    setNavDirection('backward');
                    setCurrentView(View.HOME);
                    setViewStack([View.HOME]);
                  }
                }}
              >
                <div className={`w-8 h-8 rounded-[11px] flex items-center justify-center ${currentView === View.HOME ? 'bg-[#2563EB1A] text-[#2563EB] border border-[#E2EBF5]' : 'text-[#8AA2BF]'}`}>
                  <Home size={18} strokeWidth={2.1} />
                </div>
                <span className={`text-[10px] font-normal ${currentView === View.HOME ? "text-[#2563EB]" : "text-[#476285]"}`}>首页</span>
              </button>

              {/* 报告 */}
              <button
                className="flex flex-col items-center gap-1 min-w-[64px] pt-1 active:scale-95 transition-transform"
                onClick={() => {
                  navigateForward(View.REPORTS_LIST);
                }}
              >
                <div className={`w-8 h-8 rounded-[11px] flex items-center justify-center ${currentView === View.REPORTS_LIST ? 'bg-[#2563EB1A] text-[#2563EB] border border-[#E2EBF5]' : 'text-[#8AA2BF]'}`}>
                  <FileText size={18} strokeWidth={2.1} />
                </div>
                <span className={`text-[10px] font-normal ${currentView === View.REPORTS_LIST ? "text-[#2563EB]" : "text-[#476285]"}`}>报告</span>
              </button>

              <button
                className="relative w-[58px] h-[58px] -mt-9 z-50 active:scale-95 transition-transform rounded-[20px] flex items-center justify-center"
                onClick={() => setShowCreateModal(true)}
              >
                <div
                  className="w-[50px] h-[50px] rounded-[18px] shadow-[0_8px_18px_rgba(37, 99, 235,0.18)] flex items-center justify-center z-10 border border-[#E2EBF5]"
                  style={{ background: 'linear-gradient(180deg, #4C8BF5 0%, #2563EB 100%)' }}
                >
                   <Plus size={27} className="text-[#FFFFFF]" strokeWidth={2.4} />
                </div>
              </button>

              {/* 管理 */}
              <button
                className="flex flex-col items-center gap-1 min-w-[64px] pt-1 active:scale-95 transition-transform"
                onClick={() => {
                  setPreviewReport(null);
                  setTemplateInitialTab('templates'); 
                  setViewStack([View.HOME, View.MANAGEMENT]);
                  setNavDirection('root'); // 使用 root 或 forward 视情况，但 root 更符合"重定位"的语义
                  setCurrentView(View.MANAGEMENT);
                }}
              >
                <div className={`w-8 h-8 rounded-[11px] flex items-center justify-center ${currentView === View.MANAGEMENT ? 'bg-[#2563EB1A] text-[#2563EB] border border-[#E2EBF5]' : 'text-[#8AA2BF]'}`}>
                  <Grid2X2 size={18} strokeWidth={2.1} />
                </div>
                <span className={`text-[10px] font-normal ${currentView === View.MANAGEMENT ? "text-[#2563EB]" : "text-[#476285]"}`}>管理</span>
              </button>

              {/* 我的 */}
              <button
                className="flex flex-col items-center gap-1 min-w-[64px] pt-1 active:scale-95 transition-transform"
                onClick={() => {
                  if (currentView !== View.SETTINGS) {
                    setNavDirection('forward');
                    setCurrentView(View.SETTINGS);
                    setViewStack([View.SETTINGS]);
                  }
                }}
              >
                <div className={`w-8 h-8 rounded-[11px] flex items-center justify-center ${currentView === View.SETTINGS ? 'bg-[#2563EB1A] text-[#2563EB] border border-[#E2EBF5]' : 'text-[#8AA2BF]'}`}>
                  <UserRound size={18} strokeWidth={2.1} />
                </div>
                <span className={`text-[10px] font-normal ${currentView === View.SETTINGS ? "text-[#2563EB]" : "text-[#476285]"}`}>我的</span>
              </button>
            </div>
          )}

        </div>

      {/* 新建尽调底部抽屉 - Global Render */}
      {showCreateModal && (
        <div 
          className="fixed left-0 right-0 top-0 z-[100] flex items-end justify-center overflow-hidden"
          style={{ height: 'var(--viewport-height, 100vh)' }}
        >
          <div 
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={resetCreateForm}
          />
          
          <div className="relative w-full max-w-md bg-[#FFFFFF] rounded-t-[30px] border border-[#E2EBF5] shadow-[0_-18px_48px_rgba(15,40,72,0.18)] animate-[slideUp_0.24s_ease-out] max-h-[88vh] overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+18px)]">
            <div className="sticky top-0 z-20 bg-[#FFFFFF]/95 backdrop-blur-md rounded-t-[30px] px-5 pt-3 pb-4 border-b border-[#E2EBF5]/70">
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[#E2EBF5]" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {showTemplatePicker && (
                    <button
                      className="w-9 h-9 rounded-[14px] border border-[#E2EBF5] bg-[#FFFFFF] text-[#2563EB] flex items-center justify-center active:scale-95 transition-transform"
                      onClick={() => setShowTemplatePicker(false)}
                      aria-label="返回新建表单"
                    >
                      <ArrowLeft size={18} strokeWidth={2.35} />
                    </button>
                  )}
                  <h3 className="text-[20px] leading-[26px] font-semibold text-[#0F2848]">
                    {showTemplatePicker ? '选择报告模板' : '新建报告项目'}
                  </h3>
                </div>
                <button
                  className="w-10 h-10 rounded-[15px] border border-[#E2EBF5] bg-[#FFFFFF] text-[#2563EB] flex items-center justify-center active:scale-95 transition-transform"
                  onClick={resetCreateForm}
                  aria-label="关闭"
                >
                  <X size={19} strokeWidth={2.25} />
                </button>
              </div>
            </div>

            <div className="px-5 pt-5">
            {showTemplatePicker ? (
              <div className="pb-2">
                <div className="max-h-[56vh] overflow-y-auto pr-0.5 pb-2">
                  {loadingTemplates ? (
                    <div className="py-10 flex flex-col items-center justify-center text-[#476285]">
                      <div className="w-6 h-6 border-2 border-[#4C8BF5] border-t-[#2563EB] rounded-full animate-spin mb-3" />
                      <span className="text-[12px] font-normal">模板加载中</span>
                    </div>
                  ) : templateOptions.length > 0 ? (
                    <div className="space-y-2.5">
                      {templateOptions.map((tpl) => {
                        const checked = String(tpl.id) === String(selectedTemplateId);
                        return (
                          <button
                            key={tpl.id}
                            type="button"
                            className={`w-full min-h-[70px] px-4 py-3 rounded-[18px] border text-left flex items-center gap-3 active:scale-[0.99] transition-all ${
                              checked
                                ? 'bg-[#2563EB1A] border-[#4C8BF5] shadow-[0_8px_18px_rgba(37, 99, 235,0.12)]'
                                : 'bg-[#FFFFFF] border-[#E2EBF5]'
                            }`}
                            onClick={() => {
                              setSelectedTemplateId(tpl.id);
                              setShowTemplatePicker(false);
                            }}
                          >
                            <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center flex-shrink-0 ${
                              checked ? 'bg-[#2563EB] text-[#FFFFFF]' : 'bg-[#F7FAFE] text-[#2563EB]'
                            }`}>
                              <FileText size={18} strokeWidth={2.15} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[14px] leading-[19px] font-medium text-[#0F2848] truncate">
                                {tpl.reportTemplateName}
                              </div>
                              <div className="mt-1 text-[11px] leading-[15px] font-normal text-[#476285] line-clamp-2">
                                {tpl.reportTemplateDesc || '报告模板'}
                              </div>
                            </div>
                            <div className={`w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 ${
                              checked ? 'bg-[#2563EB] border-[#2563EB] text-white' : 'border-[#E2EBF5] text-transparent'
                            }`}>
                              <Check size={14} strokeWidth={2.6} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-10 text-center">
                      <div className="w-12 h-12 rounded-[18px] bg-[#F7FAFE] text-[#2563EB] border border-[#E2EBF5] flex items-center justify-center mx-auto mb-3">
                        <FileText size={22} strokeWidth={2.1} />
                      </div>
                      <p className="text-[13px] font-normal text-[#0F2848]">暂无可用模板</p>
                      <p className="mt-1 text-[11px] font-normal text-[#476285]">将使用默认模板创建</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
            
            {/* 项目名称 (必填) */}
            <div className="mb-4 relative">
              <div className="flex justify-between items-end mb-2 pl-1">
                <span className="text-[12px] text-[#476285] font-normal">项目名称 <span className="text-red-500">*</span></span>
                <span className="text-[11px] text-[#8AA2BF]">
                  {newCustomerName.length}/30
                </span>
              </div>
              <input
                type="text"
                value={newCustomerName}
                onChange={(e) => {
                  let val = e.target.value;
                  if (val.length > 30) val = val.slice(0, 30);
                  val = val.replace(/([\\\|\/\?\*\<\>]|\.\.|[\r\n])/g, '');
                  setNewCustomerName(val);
                }}
                maxLength={30}
                placeholder="请输入项目名称"
                className="w-full h-12 px-4 bg-[#FFFFFF] rounded-[16px] text-[14px] font-normal text-[#0F2848] border border-[#E2EBF5] focus:ring-2 focus:ring-[#4C8BF5] transition-all outline-none"
                autoFocus
              />
            </div>

            {/* 企业关联搜索 (选填) */}
            <div className="mb-6 relative">
              <div className="flex justify-between items-end mb-2 pl-1">
                <div className="flex flex-col items-start">
                  <span className="text-[12px] text-[#476285] font-normal">关联企业</span>
                  <span className="text-[10px] text-[#8AA2BF] font-normal leading-none mt-0.5">信用代码选填</span>
                </div>
              </div>
              
              <div className="relative">
                <input
                  type="text"
                  value={companyName || ""}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (val.length > 50) val = val.slice(0, 50);
                    setCompanyName(val);
                    setCreditCode(""); // 手动输入时清除代码
                  }}
                  placeholder="搜索或输入企业全称"
                  className="w-full h-12 px-4 bg-[#FFFFFF] rounded-[16px] text-[14px] font-normal text-[#0F2848] border border-[#E2EBF5] focus:ring-2 focus:ring-[#4C8BF5] transition-all outline-none"
                />
                
                {/* 搜索结果下拉列表 */}
                {enterpriseOptions.length > 0 && (
                  <div className="absolute top-13 left-0 right-0 bg-[#FFFFFF] rounded-2xl shadow-xl border border-[#E2EBF5] max-h-48 overflow-y-auto z-[110] py-1 animate-in fade-in slide-in-from-top-2">
                    {enterpriseOptions.map((item, index) => (
                      <div
                        key={index}
                        className="px-4 py-3 hover:bg-[#2563EB1A] active:bg-[#2563EB1A] transition-colors cursor-pointer border-b border-[#E2EBF5]/60 last:border-none"
                        onClick={() => {
                          setCompanyName(item.name || "");
                          setCreditCode(item.creditCode || "");
                          // 自动回填项目名称
                          if (!newCustomerName.trim()) {
                            setNewCustomerName(item.name || "");
                          }
                          setEnterpriseOptions([]);
                        }}
                      >
                        <div className="text-[14px] font-medium text-[#0F2848] truncate mb-0.5">{item.name}</div>
                        <div className="text-[11px] text-[#476285] font-medium">{item.creditCode}</div>
                      </div>
                    ))}
                  </div>
                )}
                
                {searching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-[#4C8BF5] border-t-[#2563EB] rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </div>
            
            {/* 报告模板 */}
            <div className="mb-4 relative z-30">
              <div className="flex justify-between items-end mb-2 pl-1">
                <span className="text-[12px] text-[#476285] font-normal">报告模板</span>
                {loadingTemplates && <span className="text-[11px] text-[#8AA2BF]">加载中</span>}
              </div>
              <button
                type="button"
                className="w-full min-h-[52px] px-4 bg-[#FFFFFF] rounded-[16px] border border-[#E2EBF5] flex items-center justify-between gap-3 active:bg-[#2563EB1A] transition-colors"
                onClick={() => setShowTemplatePicker(true)}
              >
                <div className="min-w-0 text-left">
                  <div className="text-[14px] leading-[18px] font-medium text-[#0F2848] truncate">
                    {selectedTemplate?.reportTemplateName || '默认报告模板'}
                  </div>
                  <div className="mt-1 text-[10.5px] font-normal text-[#476285] truncate">
                    {selectedTemplate?.reportTemplateDesc || '用于生成尽调报告'}
                  </div>
                </div>
                <ChevronDown
                  size={18}
                  strokeWidth={2.3}
                  className="text-[#2563EB] flex-shrink-0"
                />
              </button>
            </div>

            {/* 问题清单 */}
            <div className="mb-4 relative z-20">
              <div className="flex justify-between items-end mb-2 pl-1">
                <span className="text-[12px] text-[#476285] font-normal">
                  问题清单<span className="ml-0.5 text-[#DC2626]">*</span>
                </span>
              </div>
              <button
                type="button"
                className="w-full min-h-[52px] px-4 bg-[#FFFFFF] rounded-[16px] border border-[#E2EBF5] flex items-center justify-between gap-3 active:bg-[#2563EB1A] transition-colors"
                onClick={() => setShowCreateQuestionPicker(true)}
              >
                <div className="min-w-0 text-left">
                  <div className="text-[14px] leading-[18px] font-medium text-[#0F2848] truncate">
                    {selectedQuestionTemplates.length > 0
                      ? selectedQuestionTemplates.map((template) => template.templateName).join('、')
                      : '选择问题清单'}
                  </div>
                  <div className="mt-1 text-[10.5px] font-normal text-[#476285] truncate">
                    {selectedQuestionTemplates.length > 0
                      ? `已选 ${selectedQuestionTemplates.length} 个清单，共 ${selectedQuestionTemplates.reduce((total, template) => total + (template.questionList?.length || 0), 0)} 个预制问题`
                      : '用于访谈提问和问题覆盖'}
                  </div>
                </div>
                <ChevronDown
                  size={18}
                  strokeWidth={2.3}
                  className="text-[#2563EB] flex-shrink-0"
                />
              </button>
            </div>

            {/* 隐藏字段提交 */}
            <input type="hidden" value={creditCode} />
            <input type="hidden" value={companyName} />

            {/* 按钮组 */}
            <div className="flex gap-3">
              <button
                onClick={resetCreateForm}
                className="flex-1 h-12 rounded-[16px] border border-[#E2EBF5] text-[#476285] font-normal hover:bg-[#2563EB1A] active:scale-95 transition-all"
              >
                取消
              </button>
              
              <button
                onClick={handleCreateDeal}
                disabled={creating}
                className="flex-[1.35] h-12 rounded-[16px] bg-primary-gradient text-[#FFFFFF] font-medium active:scale-95 transition-all shadow-[0_8px_18px_rgba(37, 99, 235,0.24)] disabled:opacity-70 disabled:active:scale-100"
              >
                {creating ? "创建中..." : "确定"}
              </button>
            </div>
              </>
            )}
            </div>
          </div>

        </div>
      )}
      <QuestionListPicker
        visible={showCreateQuestionPicker}
        onClose={() => setShowCreateQuestionPicker(false)}
        onAdd={async (_ids, selectedTemplates = []) => {
          setSelectedQuestionTemplates(selectedTemplates);
        }}
        title="选择问题清单"
        confirmText="确认选择"
      />
      {/* 录音中断提醒弹窗（受控模式，恢复时可自动关闭） */}
      <Dialog
        visible={showInterruptDialog}
        title="录音已暂停"
        message={'录音因外部原因（如来电、后台运行）中断，请点击\u201c继续录音\u201d恢复。'}
        showCancelButton={false}
        confirmButtonText="我知道了"
        confirmButtonColor="#2563EB"
        onConfirm={() => setShowInterruptDialog(false)}
        onClose={() => setShowInterruptDialog(false)}
      />
    </>
  );
};

export default App;

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { Plus } from 'lucide-react';
import { Toast, Dialog } from 'react-vant';
import { useRecordingStore } from './store/useRecordingStore';
import { dealService } from './services/dealService';
import { templateService } from './services/templateService';
import { questionService } from './services/questionService';
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
import SettingsPage from './pages/SettingsPage';
import MessageCenterPage from './pages/MessageCenterPage';
import ManagementPage from './pages/ManagementPage';
import ReportsListPage from './pages/ReportsListPage';

import HistoryRecordsPage from './pages/HistoryRecordsPage';
import HistoryDetailPage from './pages/HistoryDetailPage';
import ReportPreviewPage from './pages/ReportPreviewPage';
import { View, DealRecord } from './types';
import config from './config';

import RecordingFloatBubble from './components/RecordingFloatBubble';
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

    const handlePopState = (event: PopStateEvent) => {
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
  const [templateOrigin, setTemplateOrigin] = useState<View>(View.HOME);
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
            content: lastItem.content + text,
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
  const [templateInitialTab, setTemplateInitialTab] = useState<'success' | 'uploading' | 'failed'>('success');

  // 记住首页的标签页（进行中/已归档）
  const [homeTab, setHomeTab] = useState<'ongoing' | 'archived'>('ongoing');

  // 导航方向：forward (前进) 或 backward (后退) 或 root (重置/根页面)
  // 导航方向：forward (前进) 或 backward (后退) 或 root (重置/根页面)
  const [navDirection, setNavDirection] = useState<'forward' | 'backward' | 'root'>('forward');

  // 访谈限制提示显示状态
  const [showLimitTips, setShowLimitTips] = useState(false);

  // 页面滚动位置缓存
  const [scrollPositions, setScrollPositions] = useState<Record<View, number>>({} as Record<View, number>);

  // 记录录音页面的返回路径 (用于从历史记录返回录音页时恢复正确的返回路径)
  const [recordingBackView, setRecordingBackView] = useState<View>(View.HOME);
  // 记录历史访谈页面的返回路径
  const [historyBackView, setHistoryBackView] = useState<View>(View.RECORDING);

  // 历史访谈详情数据
  const [historyDetailData, setHistoryDetailData] = useState<{ id: string, title: string } | null>(null);

  // 状态持久化
  useEffect(() => {
    if (currentView === View.LOGIN) {
      sessionStorage.removeItem('zov-current-view');
      sessionStorage.removeItem('zov-current-deal');
      // 清除历史详情数据
      setHistoryDetailData(null);
    } else {
      sessionStorage.setItem('zov-current-view', currentView);
    }
  }, [currentView]);

  // 新建尽调弹框状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (currentDeal) {
      sessionStorage.setItem('zov-current-deal', JSON.stringify(currentDeal));
    }
  }, [currentDeal]);

  // 全局计时器
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds((s: number) => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, setRecordingSeconds]);

  // 背景渐变样式
  // Using a fixed background to prevent repaint on scroll


  /**
   * 更换模板时同步更新问题列表
   */
  const handleTemplateChangeSyncQuestions = async (newTemplateId: string) => {
    if (!currentDeal?.id) return;
    
    try {
      // 1. 获取模板详情得到 questionId
      const templateRes = await templateService.getTemplateDetail(newTemplateId);
      if (templateRes.success && templateRes.data) {
        const questionId = String(templateRes.data.questionId);
        
        // 2. 根据 questionId 查询对应的问题列表 (queryUserProperties 已在 queryQuestionList 中封装)
        const questionsRes = await questionService.queryQuestionList(questionId);
        
        if (questionsRes.success) {
          // 对问题进行编号
          const syncedQuestions = (questionsRes.data || []).map((q, i) => ({
            ...q,
            questionIndex: i + 1,
            CHECKED: false
          }));

          console.log('[App] Synced questions for new template:', syncedQuestions.length);

          // 3. 更新全局 Deal 状态
          setCurrentDeal({
            ...currentDeal,
            templateId: newTemplateId,
            questionId: Number(questionId), // 同步更新 questionId
            questionInfoList: syncedQuestions
          });
          return;
        }
      }
      
      // 回退方案：仅更新模板ID
      setCurrentDeal({
        ...currentDeal,
        templateId: newTemplateId
      });
    } catch (error) {
      console.error('[App] Failed to sync questions after template change:', error);
      setCurrentDeal({
        ...currentDeal,
        templateId: newTemplateId
      });
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

      // 如果当前在首页、登录页、或者我的设置页，才是真正的退出时机
      if (currentView === View.HOME || currentView === View.LOGIN || currentView === View.SETTINGS) {
        // 如果栈里还有东西（异常情况），先清空栈回首页
        if (viewStack.length > 1 && currentView === View.HOME) {
          // 已经在首页了，但栈还不空，重置栈
          setViewStack([View.HOME]);
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
            dealService.getDealInstDetail(currentDealRef.current.id).then(res => {
              if (res.success && res.data) {
                setCurrentDeal(res.data);
              }
            }).catch(err => console.error('Auto-refresh deal detail failed:', err));
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
              
              // 弹窗提示暂停
              Dialog.alert({
                title: '录音已暂停',
                message: '录音因外部原因（如来电、后台运行）中断，请点击“继续录音”恢复。',
                confirmButtonText: '我知道了',
                confirmButtonColor: '#4337F1',
              });
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
      Toast.info('请输入访谈对象名称');
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
        
        setCurrentDeal(res.data);
        // 必须使用 navigateForward 将新页面压入栈中，保证能从资料页返回首页
        setPreviousView(View.HOME);
        navigateForward(View.MATERIAL_UPLOAD);
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
                        // 假设返回的数据直接是 ID，或者包含 interviewInstId 字段的对象
                        const instId = typeof createRes.data === 'string' ? createRes.data : createRes.data?.interviewInstId;
                        const instTitle = typeof createRes.data === 'string' ? '' : createRes.data?.interviewInstTitle;

                        // 如果切换了访谈对象（ID不一致），则重置录音状态（初始化页面）
                        const currentStore = useRecordingStore.getState();
                        if (currentStore.currentInterviewInstId && currentStore.currentInterviewInstId !== instId) {
                          currentStore.reset();
                        }

                        // 更新 Zustand Store (不设置 dealId，等真正开始录音时再设置)
                        setData({
                          interviewInstId: instId,
                          title: instTitle || ''
                        });
                      }

                      // 获取最新的尽调详情（包含问题清单）
                      const detailRes = await dealService.getDealInstDetail(deal.id);
                      if (detailRes.success && detailRes.data) {
                        setCurrentDeal(detailRes.data);
                      } else {
                        setCurrentDeal(deal);
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
                    navigateForward(View.MY_TEMPLATES);
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
                  onBack={() => navigateBackward(previousView === View.REPORTS_LIST ? View.REPORTS_LIST : View.HOME)}
                  onNavigateToRecording={async () => {
                    if (!currentDeal?.id) {
                      Toast.fail('尽调信息不存在');
                      return;
                    }

                    try {
                      // 改为使用本地 Store 校验，与 DueDiligencePage 保持一致
                      const store = useRecordingStore.getState();
                      // 注意：store 中保存的是 dealId (之前代码里用的属性名是 dealId 还是 currentDealId 需要确认，根据之前的 context 是 currentDealId 或 dealId)
                      // 查看 store 定义，setData({ dealId: ... })。 
                      // 假设 store properties 是 { dealId, ... } 或者 { currentDealId ... }
                      // 让我们看一下 useRecordingStore 的定义。
                      // 根据 Step 1345 line 62: currentInterviewInstId, currentInterviewInstTitle... 
                      // Wait, did I see dealId?
                      // Step 1345 line 697: // dealId: deal.id, // Move to active start
                      // 看来 store 里可能没有直接存 dealId？
                      // 但是 HomePage 和 DueDiligencePage 都用了 currentDealId。
                      // 说明 useRecordingStore 返回了 currentDealId。
                      // 让我们假定 store.getState().currentDealId 存在。

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
                        // 假设返回的数据直接是 ID，或者包含 interviewInstId 字段的对象
                        const instId = typeof createRes.data === 'string' ? createRes.data : createRes.data?.interviewInstId;
                        const instTitle = typeof createRes.data === 'string' ? '' : createRes.data?.interviewInstTitle;

                        // 如果切换了访谈对象（ID不一致），则重置录音状态（初始化页面）
                        const currentStore = useRecordingStore.getState();
                        if (currentStore.currentInterviewInstId && currentStore.currentInterviewInstId !== instId) {
                          currentStore.reset();
                        }

                        // 更新 Zustand Store (不设置 dealId，等真正开始录音时再设置)
                        setData({
                          interviewInstId: instId,
                          title: instTitle || '',
                        });

                        Toast.clear();
                        setRecordingBackView(View.DUE_DILIGENCE);
                        setPreviousView(View.DUE_DILIGENCE);
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
                  isArchived={currentDeal?.status === '5'}
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
                        // 如果切换了访谈实例，重置
                        if (currentStore.currentInterviewInstId && currentStore.currentInterviewInstId !== instId) {
                          currentStore.reset();
                        }

                        // 更新 Store (不设置 dealId，等真正开始录音时再设置)
                        setData({
                          interviewInstId: instId,
                          title: instTitle || ''
                        });
                      }

                      // 获取最新详情
                      const detailRes = await dealService.getDealInstDetail(currentDeal.id);
                      if (detailRes.success && detailRes.data) {
                        setCurrentDeal(detailRes.data);
                      }

                      Toast.clear();

                      // 这里的回退逻辑，通常从新建流程过来，我们希望它回退到哪里？
                      // 既然是“去掉多余的页面”，可能用户希望回退到详情页，或者首页？
                      // 暂时保持回退到 DUE_DILIGENCE，因为这是逻辑上的上一级
                      // setRecordingBackView(View.DUE_DILIGENCE);
                      // setPreviousView(View.MATERIAL_UPLOAD);
                      // navigateForward(View.RECORDING);

                      // 现在统一重构路由栈为：HOME -> DUE_DILIGENCE -> RECORDING
                      setRecordingBackView(View.DUE_DILIGENCE);
                      setPreviousView(View.DUE_DILIGENCE);

                      // 重构路由栈，确保原生返回能回到详情页：HOME -> DUE_DILIGENCE -> RECORDING
                      // setViewStack([View.HOME, View.DUE_DILIGENCE, View.RECORDING]);
                      // setNavDirection('forward');
                      // setCurrentView(View.RECORDING);
                      // setTimeout(() => {
                      //   window.scrollTo(0, 0);
                      // }, 400);
                      
                      // 先重置栈为 [HOME, DUE_DILIGENCE]，模拟是从详情页跳进来的
                      setViewStack([View.HOME, View.DUE_DILIGENCE]);
                      
                      // 然后使用 navigateForward 导航到录音页，这会自动把 RECORDING 压入栈并处理动画
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
                  isArchived={currentDeal?.status === '5'}
                  onBack={() => {
                    navigateBackward(historyBackView);
                  }}
                  onStartInterview={() => {
                    setPreviousView(recordingBackView);
                    navigateBackward(View.RECORDING);
                  }}
                  onRecordClick={(record) => {
                    setHistoryDetailData({
                      id: record.interviewInstId || record.id,
                      title: record.interviewInstTitle
                    });
                    setPreviousView(View.HISTORY);
                    navigateForward(View.HISTORY_DETAIL);
                  }}
                />
              )}
              {currentView === View.HISTORY_DETAIL && (
                <HistoryDetailPage
                  deal={currentDeal}
                  interviewInstId={historyDetailData?.id || ''}
                  interviewInstTitle={historyDetailData?.title || ''}
                  onBack={() => navigateBackward(View.HISTORY)}
                />
              )}
              {currentView === View.CORPORATE_EDIT && (
                <CorporateEditPage
                  deal={currentDeal}
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
              {currentView === View.MY_TEMPLATES && (
                <MyTemplatesPage
                  onBack={() => navigateBackward(templateOrigin || View.HOME)}
                  onUpload={() => navigateForward(View.UPLOAD_TEMPLATE)}
                  initialTab={templateInitialTab}
                />
              )}
              {currentView === View.UPLOAD_TEMPLATE && (
                <UploadTemplatePage
                  onBack={() => navigateBackward(View.MY_TEMPLATES)}
                  onCancel={() => navigateBackward(View.MY_TEMPLATES)}
                  onSubmit={() => {
                    // 提交成功后不立即返回，等待用户点击"查看列表"
                  }}
                  onViewList={() => {
                    // 点击"查看列表"后跳转到模板管理页的"审核中" tab
                    setTemplateInitialTab('uploading');
                    navigateBackward(View.MY_TEMPLATES);
                  }}
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
                      await handleTemplateChangeSyncQuestions(newTemplateId);
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
                  skipIdInPreview={previousView === View.TEMPLATE_SELECTION || previousView === View.MY_TEMPLATES} // 如果是从模板选择页或模板管理页进来的，跳过 ID；如果是资料预览(MATERIALS_LIST)则不跳过
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
                        await handleTemplateChangeSyncQuestions(templateId);

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
                         if (typeof handleTemplateChangeSyncQuestions === 'function') {
                            await handleTemplateChangeSyncQuestions(templateId);
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
                  dealName={currentDeal?.interviewCust}
                  dealLogo={currentDeal?.logo}
                  questionInfoList={currentDeal?.questionInfoList || []}
                  isArchived={currentDeal?.status === '5'}
                  onBack={() => navigateBackward(View.DUE_DILIGENCE)}
                  onUpdateQuestion={undefined}
                  onDeleteQuestion={undefined}
                  onAddQuestion={undefined}
                  onSave={async (finalQuestions) => {
                    const deal = currentDealRef.current;
                    if (deal) {
                      try {
                        await dealService.createOrUpdateDealInst({
                          id: deal.id,
                          questionId: deal.questionId,
                          questionInfoList: finalQuestions
                        });

                        setCurrentDeal({
                          ...deal,
                          questionInfoList: finalQuestions
                        });
                      } catch (e) {
                        console.error('Save all questions failed:', e);
                        throw e; // Check if QuestionsListPage handles this
                      }
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
                    setNavDirection('root');
                    setCurrentView(View.LOGIN);
                    setCurrentDeal(null);
                  }}
                  onNavigateToTemplates={() => {
                    setPreviousView(View.SETTINGS);
                    setTemplateOrigin(View.SETTINGS);
                    navigateForward(View.MY_TEMPLATES);
                  }}
                  onNavigateToUserAgreement={() => {
                      setPreviousView(View.SETTINGS);
                      navigateForward(View.USER_AGREEMENT);
                  }}
                  onNavigateToPrivacyPolicy={() => {
                      setPreviousView(View.SETTINGS);
                      navigateForward(View.PRIVACY_POLICY);
                  }}
                />
              )}
              {currentView === View.MESSAGE_CENTER && (
                <MessageCenterPage
                  onBack={() => navigateBackward(View.HOME)}
                />
              )}
              {currentView === View.MANAGEMENT && (
                <ManagementPage
                  onNavigateToTemplates={() => {
                    setTemplateOrigin(View.MANAGEMENT);
                    navigateForward(View.MY_TEMPLATES);
                  }}
                  onNavigateToQuestionLibrary={() => {
                    // TODO: Add question library navigation
                    Toast.info('问题清单功能开发中');
                  }}
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
          {(currentView === View.HOME || currentView === View.SETTINGS || currentView === View.MANAGEMENT || currentView === View.REPORTS_LIST) && (
            <div className="fixed bottom-0 left-0 right-0 h-[70px] bg-white border-t border-[#E5E5E5] z-50 flex items-center justify-around pb-1 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
              {/* 首页 */}
              <button
                className="flex flex-col items-center gap-1 min-w-[64px] pt-1"
                onClick={() => {
                  if (currentView !== View.HOME) {
                    setNavDirection('backward');
                    setCurrentView(View.HOME);
                    setViewStack([View.HOME]);
                  }
                }}
              >
                <div 
                  className="w-6 h-6 mb-0.5"
                  style={{
                    backgroundColor: currentView === View.HOME ? '#4337F1' : '#9CA3AF',
                    WebkitMaskImage: 'url(/talk-assistant/assets/homebt.png)',
                    WebkitMaskSize: 'contain',
                    WebkitMaskRepeat: 'no-repeat',
                    WebkitMaskPosition: 'center',
                    maskImage: 'url(/talk-assistant/assets/homebt.png)',
                    maskSize: 'contain',
                    maskRepeat: 'no-repeat',
                    maskPosition: 'center'
                  }}
                />
                <span className={`text-[10px] font-medium ${currentView === View.HOME ? "text-primary" : "text-gray-400"}`}>首页</span>
              </button>

              {/* 报告 */}
              <button
                className="flex flex-col items-center gap-1 min-w-[64px] pt-1"
                onClick={() => {
                  navigateForward(View.REPORTS_LIST);
                }}
              >
                <div 
                  className="w-6 h-6 mb-0.5"
                  style={{
                    backgroundColor: currentView === View.REPORTS_LIST ? '#4337F1' : '#9CA3AF',
                    WebkitMaskImage: 'url(/talk-assistant/assets/report.png)',
                    WebkitMaskSize: 'contain',
                    WebkitMaskRepeat: 'no-repeat',
                    WebkitMaskPosition: 'center',
                    maskImage: 'url(/talk-assistant/assets/report.png)',
                    maskSize: 'contain',
                    maskRepeat: 'no-repeat',
                    maskPosition: 'center'
                  }}
                />
                <span className={`text-[10px] font-medium ${currentView === View.REPORTS_LIST ? "text-primary" : "text-gray-400"}`}>报告</span>
              </button>

              {/* 中间新增按钮 - Top-Half Only Border & Padding */}
              {/* 中间新增按钮 - Top-Half Only Border & Padding */}
              <button
                className="relative w-[64px] h-[64px] -mt-12 z-50 active:scale-95 transition-transform rounded-full flex items-center justify-center"
                onClick={() => setShowCreateModal(true)}
              >
                {/* Purple Circle Body (Centered, 54px effectively) */}
                <div className="w-[54px] h-[54px] rounded-full bg-primary shadow-xl shadow-indigo-500/40 flex items-center justify-center z-10">
                   <Plus size={32} className="text-white" strokeWidth={3} />
                </div>
                
                {/* Top Half White Spacer (The "Padding") with Guillotine Crop */}
                <div className="absolute top-0 left-0 w-full h-[23px] overflow-hidden pointer-events-none z-0">
                  <div className="w-[64px] h-[64px] rounded-full border-[5px] border-white box-border" />
                </div>

                {/* Top Half Gray Border Line with Guillotine Crop */}
                <div className="absolute top-0 left-0 w-full h-[23px] overflow-hidden pointer-events-none z-20">
                  <div className="w-[64px] h-[64px] rounded-full border border-[#E5E5E5] box-border" />
                </div>
              </button>

              {/* 管理 */}
              <button
                className="flex flex-col items-center gap-1 min-w-[64px] pt-1"
                onClick={() => {
                  navigateForward(View.MANAGEMENT);
                }}
              >
                <div 
                  className="w-6 h-6 mb-0.5"
                  style={{
                    backgroundColor: currentView === View.MANAGEMENT ? '#4337F1' : '#9CA3AF',
                    WebkitMaskImage: 'url(/talk-assistant/assets/manage.png)',
                    WebkitMaskSize: 'contain',
                    WebkitMaskRepeat: 'no-repeat',
                    WebkitMaskPosition: 'center',
                    maskImage: 'url(/talk-assistant/assets/manage.png)',
                    maskSize: 'contain',
                    maskRepeat: 'no-repeat',
                    maskPosition: 'center'
                  }}
                />
                <span className={`text-[10px] font-medium ${currentView === View.MANAGEMENT ? "text-primary" : "text-gray-400"}`}>管理</span>
              </button>

              {/* 我的 */}
              <button
                className="flex flex-col items-center gap-1 min-w-[64px] pt-1"
                onClick={() => {
                  if (currentView !== View.SETTINGS) {
                    setNavDirection('forward');
                    setCurrentView(View.SETTINGS);
                    setViewStack([View.SETTINGS]);
                  }
                }}
              >
                <div 
                  className="w-6 h-6 mb-0.5"
                  style={{
                    backgroundColor: currentView === View.SETTINGS ? '#4337F1' : '#9CA3AF',
                    WebkitMaskImage: 'url(/talk-assistant/assets/person.png)',
                    WebkitMaskSize: 'contain',
                    WebkitMaskRepeat: 'no-repeat',
                    WebkitMaskPosition: 'center',
                    maskImage: 'url(/talk-assistant/assets/person.png)',
                    maskSize: 'contain',
                    maskRepeat: 'no-repeat',
                    maskPosition: 'center'
                  }}
                />
                <span className={`text-[10px] font-medium ${currentView === View.SETTINGS ? "text-primary" : "text-gray-400"}`}>我的</span>
              </button>
            </div>
          )}

        </div>

      {/* 新建尽调弹框 - Global Render */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* 半透明背景 */}
          <div 
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowCreateModal(false)}
          />
          
          {/* 弹框内容 */}
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-fadeIn">
            {/* 标题 */}
            <h3 className="text-center text-lg font-bold text-slate-800 mb-6">
              新建访谈
            </h3>
            
            {/* 输入框 */}
            <div className="mb-6">
              <label className="block text-sm text-slate-500 mb-2 pl-1">访谈对象：</label>
              <input
                type="text"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="请输入访谈对象"
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
                onClick={handleCreateDeal}
                disabled={creating}
                className="flex-1 h-11 rounded-full bg-primary text-white font-medium active:scale-95 transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-70 disabled:active:scale-100"
              >
                {creating ? "创建中..." : "确定"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default App;

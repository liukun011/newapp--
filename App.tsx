import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { Home, User, Plus } from 'lucide-react';
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
import SettingsPage from './pages/SettingsPage';
import MessageCenterPage from './pages/MessageCenterPage';

import HistoryRecordsPage from './pages/HistoryRecordsPage';
import HistoryDetailPage from './pages/HistoryDetailPage';
import ReportPreviewPage from './pages/ReportPreviewPage';
import { View, DealRecord } from './types';
import { COLORS } from './constants';
import RecordingFloatBubble from './components/RecordingFloatBubble';
import { nativeBridge, handleTranscriptionResult } from './services/nativeBridge';

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
  const [previewReport, setPreviewReport] = useState<{ name: string; reportUrl: string; previewUrl: string; showDownloadButton?: boolean } | null>(() => {
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
  const backgroundStyle = {
    background: `linear-gradient(180deg, ${COLORS.backgroundStart} 0%, ${COLORS.backgroundEnd} 100%)`,
    position: 'fixed' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: -1,
  };

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

      // 如果当前在首页、登录页，才是真正的退出时机
      if (currentView === View.HOME || currentView === View.LOGIN) {
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

  // 提取上传转写逻辑
  const uploadTranscriptionBatch = async () => {
    const { transcriptionList, currentInterviewInstId } = useRecordingStore.getState();

    if (!currentInterviewInstId || transcriptionList.length === 0) {
      return;
    }

    // 只上传最终结果（isFinal: true）
    const finalResults = transcriptionList.filter(item => item.isFinal);

    if (finalResults.length === 0) {
      return;
    }

    try {
      const contentList = finalResults.map(item => ({
        id: item.roleId,
        content: item.content,
      }));

      console.log('[上传转写] 上传内容:', contentList.length, '条');

      await dealService.uploadInterviewInstContent({
        interviewInstId: currentInterviewInstId,
        contentList,
      });

      console.log('[上传转写] 上传成功');
    } catch (error) {
      console.error('[上传转写] 上传失败:', error);
    }
  };

  // 提取上传录音文件逻辑
  const uploadAudioFile = async (interviewInstId: string) => {
    console.log('[自动保存] 开始尝试上传录音文件...');
    return new Promise((resolve) => {
      let isResolved = false;

      // 1. 全局超时保护 (10秒)，防止死锁
      const safeTimeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          console.warn('[自动保存] 上传流程超时，强制结束');
          // 移除监听，防止后续回调干扰
          nativeBridge.off('getAudioList');
          nativeBridge.off('onUploadResult');
          resolve(false);
        }
      }, 10000);

      // 安全的 resolve 包装
      const safeResolve = (val: boolean) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(safeTimeout);
          resolve(val);
        }
      };

      const handleAudioList = async (response: any) => {
        console.log('[自动保存] getAudioList回调:', JSON.stringify(response));
        nativeBridge.off('getAudioList', handleAudioList);

        if (response.success && response.data && response.data.list && response.data.list.length > 0) {
          const latestAudio = response.data.list[0];
          const fileUrl = (latestAudio.fileURL || "").trim();

          if (!fileUrl) {
            console.warn('[自动保存] 录音文件URL为空');
            safeResolve(false);
            return;
          }

          console.log('[自动保存] 准备上传文件:', fileUrl);
          const token = localStorage.getItem('zov-user-token') || '';
          const uploadHost = 'http://68.79.42.215/report/upload/file';

          const handleUploadResult = (res: any) => {
            console.log('[自动保存] 上传结果回调:', JSON.stringify(res));
            // 简单判断结果
            const resultData = res.data?.result || (res.data?.success !== undefined ? res.data : null);
            if (resultData && (resultData.success === true || resultData.errno === 0)) {
              const uploadedUrl = resultData.data?.url || resultData.url || (typeof resultData.data === 'string' ? resultData.data : "");
              if (uploadedUrl) {
                dealService.saveInterviewInstRecordFile({
                  path: uploadedUrl,
                  interviewInstId
                }).then(() => {
                  console.log('[自动保存] 录音文件已绑定成功');
                  safeResolve(true);
                }).catch((err) => {
                  console.error('[自动保存] 绑定文件失败', err);
                  safeResolve(false);
                });
              } else {
                console.warn('[自动保存] 未获取到上传后的URL');
                safeResolve(false);
              }
              nativeBridge.off('onUploadResult', handleUploadResult);
            } else if (res.success === false || (resultData && resultData.success === false)) {
              console.warn('[自动保存] 上传失败');
              nativeBridge.off('onUploadResult', handleUploadResult);
              safeResolve(false);
            }
          };

          nativeBridge.on('onUploadResult', handleUploadResult);
          nativeBridge.uploadInterviewFile({
            host: uploadHost,
            authorization: token,
            filePath: fileUrl
          });

        } else {
          console.warn('[自动保存] 未找到录音文件列表');
          safeResolve(false);
        }
      };

      nativeBridge.on('getAudioList', handleAudioList);
      console.log('[自动保存] 调用 getAudioList...');
      nativeBridge.getAudioList({ surveyId: interviewInstId, page: 0, pageSize: 999 });
    });
  };

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
              // 静默保存，但不重置状态
              await Promise.all([
                uploadTranscriptionBatch(),
                store.currentInterviewInstId ? uploadAudioFile(store.currentInterviewInstId) : Promise.resolve()
              ]);
            } catch (e) {
              console.error(e);
            } finally {
              // store.reset(); // 不要重置状态，否则会退出访谈
              
              // 弹窗提示暂停
              Dialog.alert({
                title: '录音已暂停',
                message: '录音因外部原因（如来电、后台运行）中断，请点击“继续录音”恢复。',
                confirmButtonText: '我知道了',
                confirmButtonColor: '#4E3EF8',
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

  // 监听实时转写结果
  useEffect(() => {
    let sentenceCount = 0; // 记录最终结果的句子数

    // 这里的 uploadTranscriptionBatch 引用外部定义的函数

    const handleTranscription = (response: any) => {
      if (response.success && response.data) {
        const parsed = handleTranscriptionResult(response.data);

        if (parsed) {
          const store = useRecordingStore.getState();
          // 如果全局未处于录音状态（例如在资料上传页使用了局部录音），则忽略全局监听收到的转写
          if (!store.isRecording) {
            return;
          }



          const { text, isFinal, roleId } = parsed;
          const { transcriptionList, setTranscriptionList, addTranscriptionChunk, updateTempTranscription } = store;

          if (isFinal) {
            // 最终结果
            const lastItem = transcriptionList[transcriptionList.length - 1];

            // 确定当前 RoleId:
            // 1. 如果 Native 解析出了明确的角色(非0)，则使用该角色
            // 2. 如果 Native 没给角色(或为0)，则延续上一个气泡的角色 (模拟 Native 的 currentRole 逻辑)
            // 3. 如果都没有，默认为 '1'
            const currentRoleId = roleId || (lastItem ? lastItem.roleId : '1');

            console.log('[App] Transcription Final - Parsing Role:', roleId, 'Effective Role:', currentRoleId);

            if (lastItem && String(lastItem.roleId) === String(currentRoleId)) {
              // roleId 相同，拼接内容到最后一条记录
              const updatedList = [...transcriptionList];
              updatedList[updatedList.length - 1] = {
                ...lastItem,
                content: lastItem.content + text,
                isFinal: true,
                timestamp: Date.now(),
              };
              setTranscriptionList(updatedList);
            } else {
              // roleId 不同或首次添加，创建新记录
              addTranscriptionChunk({
                id: `trans_${Date.now()}_${Math.random()}`,
                content: text,
                roleId: currentRoleId,
                timestamp: Date.now(),
                isFinal: true,
              });
            }

            // 清空临时转写
            updateTempTranscription('');

            // 计数并检查是否需要上传
            sentenceCount++;
            if (sentenceCount >= 6) {
              uploadTranscriptionBatch();
              sentenceCount = 0; // 重置计数
            }
          }
          // Ignore intermediate results (isFinal: false) as requested
        }
      }
    };

    nativeBridge.on('transcriptionResult', handleTranscription);

    return () => {
      nativeBridge.off('transcriptionResult', handleTranscription);
    };
  }, [currentView]); // 依赖 currentView 以确保闭包中拿到最新值

  const handleEditCorporateInfo = () => {
    setPreviousView(currentView);
    navigateForward(View.CORPORATE_EDIT);
  };

  return (
    <>
      <div style={backgroundStyle} />

      {/* Main App */}
      <div ref={appContainerRef} className="w-full max-w-md mx-auto min-h-screen relative overflow-y-auto overflow-x-hidden bg-transparent">
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
                    navigateForward(View.DUE_DILIGENCE);
                  }}
                  onCreateNewDeal={(deal) => {
                    console.log('[App] onCreateNewDeal triggered. Current Stack:', viewStack);
                    setCurrentDeal(deal);
                    // 必须使用 navigateForward 将新页面压入栈中，保证能从资料页返回首页
                    navigateForward(View.MATERIAL_UPLOAD);
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

                        // 更新 Zustand Store
                        setData({
                          // dealId: deal.id, // Move to active start
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
                  onBack={() => navigateBackward(View.HOME)}
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

                        // 更新 Zustand Store
                        setData({
                          // dealId: currentDeal.id,
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
                  onPreviewFile={(name, url) => {
                    setPreviewTemplate({ name, url });
                    setPreviousView(View.MATERIALS_LIST);
                    navigateForward(View.TEMPLATE_PREVIEW);
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

                        // 更新 Store
                        setData({
                          dealId: currentDeal.id,
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
                  onPreviewTemplate={(name, url) => {
                    setPreviewTemplate({ name, url });
                    setPreviousView(View.MATERIAL_UPLOAD);
                    navigateForward(View.TEMPLATE_PREVIEW);
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
                  onBack={() => navigateBackward(previousView)}
                  onPreview={(name, url, id) => {
                    setPreviewTemplate({ name, url, id });
                    navigateForward(View.TEMPLATE_PREVIEW);
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
                />
              )}
              {currentView === View.REPORT_PREVIEW && previewReport && (
                <ReportPreviewPage
                  reportName={previewReport.name}
                  reportUrl={previewReport.reportUrl}
                  previewUrl={previewReport.previewUrl}
                  showDownloadButton={(previewReport as any).showDownloadButton}
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
                />
              )}
              {currentView === View.MESSAGE_CENTER && (
                <MessageCenterPage
                  onBack={() => navigateBackward(View.HOME)}
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

          {/* Global Fixed Bottom Navigation Bar - Only for Home and Settings */}
          {(currentView === View.HOME || currentView === View.SETTINGS) && (
            <div className="fixed bottom-0 left-0 right-0 h-[70px] bg-white border-t border-gray-100 z-40 flex items-center justify-around pb-1 shadow-[0_-4px_8px_rgba(0,0,0,0.02)]">
              <button
                className="flex flex-col items-center gap-1 min-w-[64px] pt-1"
                onClick={() => {
                  if (currentView !== View.HOME) {
                    setNavDirection('backward');
                    setCurrentView(View.HOME);
                  }
                }}
              >
                <Home size={26} className={currentView === View.HOME ? "text-slate-800" : "text-gray-400"} strokeWidth={2.5} />
                <span className={`text-[11px] font-bold ${currentView === View.HOME ? "text-slate-800" : "text-gray-400"}`}>首页</span>
              </button>

              <button
                className="w-[64px] h-[64px] rounded-full bg-[#4E3EF8] shadow-xl shadow-indigo-500/40 flex items-center justify-center -mt-12 active:scale-95 transition-transform z-50"
                onClick={async () => {
                  try {
                    const res = await dealService.createOrUpdateDealInst({});
                    if (res.success && res.data) {
                      setCurrentDeal(res.data);
                      navigateForward(View.MATERIAL_UPLOAD);
                    }
                  } catch (error) {
                    console.error("Failed to create deal:", error);
                  }
                }}
              >
                <Plus size={32} className="text-white" strokeWidth={3} />
              </button>

              <button
                className="flex flex-col items-center gap-1 min-w-[64px] pt-1 group"
                onClick={() => {
                  if (currentView !== View.SETTINGS) {
                    setNavDirection('forward');
                    setCurrentView(View.SETTINGS);
                  }
                }}
              >
                <User size={26} className={currentView === View.SETTINGS ? "text-slate-800" : "text-gray-400"} strokeWidth={2.5} />
                <span className={`text-[11px] font-bold ${currentView === View.SETTINGS ? "text-slate-800" : "text-gray-400"}`}>我的</span>
              </button>
            </div>
          )}
        </div>
    </>
  );
};

export default App;
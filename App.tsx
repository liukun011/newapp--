import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { Home, User, Plus } from 'lucide-react';
import { Toast } from 'react-vant';
import { useRecordingStore } from './store/useRecordingStore';
import { dealService } from './services/dealService';
import SplashScreen from './pages/SplashScreen';
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
import { View, DealRecord, QuestionInfo } from './types';
import { COLORS } from './constants';
import RecordingFloatBubble from './components/RecordingFloatBubble';

const App: React.FC = () => {
  const appContainerRef = useRef<HTMLDivElement>(null);
  // 启动页状态

  const [showSplash, setShowSplash] = useState(true);

  const [currentView, setCurrentView] = useState<View>(() => {
    const token = localStorage.getItem('zov-user-token');
    if (!token) return View.LOGIN;
    const savedView = sessionStorage.getItem('zov-current-view');
    return (savedView as View) || View.HOME;
  });
  // Track the previous view to support returning from the Edit screen
  const [previousView, setPreviousView] = useState<View>(View.HOME);
  const [templateOrigin, setTemplateOrigin] = useState<View>(View.HOME);
  // Track current selected deal
  const [currentDeal, setCurrentDeal] = useState<DealRecord | null>(() => {
    try {
      const savedDeal = sessionStorage.getItem('zov-current-deal');
      return savedDeal ? JSON.parse(savedDeal) : null;
    } catch (e) {
      return null;
    }
  });
  // 录音状态管理 (使用 Zustand Store)
  const {
    currentInterviewInstId,
    currentInterviewInstTitle,
    isRecording,
    recordingSeconds,
    setIsRecording,
    setRecordingSeconds,
    setData,
    addTranscriptionChunk
  } = useRecordingStore();

  // DEBUG: Check why bubble is not showing
  useEffect(() => {
    console.log('[App] Debug State:', {
      currentInterviewInstId,
      isRecording,
      recordingSeconds,
      currentView,
      showBubble: currentInterviewInstId && (recordingSeconds > 0 || isRecording) && currentView !== View.LOGIN && currentView !== View.RECORDING
    });
  }, [currentInterviewInstId, isRecording, recordingSeconds, currentView]);

  // Global Recording Event Listeners
  useEffect(() => {
    window.onVoiceStream = (text: string, roleId: string) => {
      console.log(`[App] Global onVoiceStream: text=${text}, roleId=${roleId}`);
      if (text) {
        addTranscriptionChunk({
          id: Date.now(), // or some UUID
          roleId: roleId,
          content: text
        });
      }
    };

    window.onRecordingChunk = (filePath: string) => {
      console.log("[App] Global onRecordingChunk:", filePath);
    };

    window.onVoiceFileSaved = (filePath: string) => {
      console.log(`[App] Global onVoiceFileSaved: ${filePath}`);
    };

    window.onRecordingError = (code: string, message: string) => {
      console.error(`[App] Global onRecordingError: Code=${code}, Msg=${message}`);
      // If message is undefined (legacy call), treat code as message
      const displayMsg = message ? `${message} (${code})` : code;

      Toast.fail(displayMsg);

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
  const [previewTemplate, setPreviewTemplate] = useState<{ name: string; url: string } | null>(() => {
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
  const [previewReport, setPreviewReport] = useState<{ name: string; reportUrl: string; previewUrl: string } | null>(() => {
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

  // 状态持久化
  useEffect(() => {
    if (currentView === View.LOGIN) {
      sessionStorage.removeItem('zov-current-view');
      sessionStorage.removeItem('zov-current-deal');
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

  // Background Gradient Style
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

  // 前进导航（跳转到新页面）
  const navigateForward = (view: View) => {
    // 保存当前页面的滚动位置
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    setScrollPositions(prev => ({ ...prev, [currentView]: scrollTop }));

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

    // 动画结束后恢复滚动位置
    setTimeout(() => {
      const savedPosition = scrollPositions[view] || 0;
      window.scrollTo(0, savedPosition);
    }, 400);
  };

  // 启动页定时器
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1500); // 1.5秒后隐藏启动页

    return () => clearTimeout(timer);
  }, []);

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
    window.onNativeBack = () => {
      console.log('Native Back Pressed, Current View:', currentView);

      // 如果当前在首页、登录页，或者是特定的根级页面，弹出退出确认
      // 根据业务逻辑，View.HOME 是应用内首页，无法再回退
      if (currentView === View.HOME || currentView === View.LOGIN) {
        if (window.confirm('确定要退出应用吗？')) {
          window.Android?.closeApp?.();
        }
      } else {
        // 如果不在首页，执行类似网页后退的逻辑
        // 简单处理：返回首页
        setNavDirection('backward');
        setCurrentView(View.HOME);
      }
    };

    return () => {
      window.onNativeBack = undefined;
    };
  }, [currentView]); // 依赖 currentView 以确保闭包中拿到最新值

  const handleEditCorporateInfo = () => {
    setPreviousView(currentView);
    navigateForward(View.CORPORATE_EDIT);
  };

  return (
    <>
      <div style={backgroundStyle} />

      {/* Splash Screen with fade out animation */}
      {showSplash ? (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 9999,
            backgroundColor: 'white',
          }}
        >
          <SplashScreen />
        </motion.div>
      ) : (
        /* Main App - only render after splash is hidden */
        <div ref={appContainerRef} className="w-full max-w-md mx-auto min-h-screen relative overflow-hidden bg-transparent">
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
                  onNavigateToDetail={(deal) => {
                    setCurrentDeal(deal);
                    navigateForward(View.DUE_DILIGENCE);
                  }}
                  onCreateNewDeal={(deal) => {
                    setCurrentDeal(deal);
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
                          dealId: deal.id,
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
                      // 先查询全量尽调列表
                      const listRes = await dealService.queryDealInstList({
                        pageNo: 1,
                        pageSize: 99999,
                      });

                      // 从全量列表中过滤出正在访谈中的尽调（status='3'）
                      const allDeals = listRes.success && listRes.data?.records ? listRes.data.records : [];
                      const activeDeals = allDeals.filter(deal => deal.status === '3');
                      const hasOtherActiveInterview = activeDeals.some(deal => deal.id !== currentDeal.id);

                      // 如果有其他尽调正在访谈中，且当前尽调不在访谈中，则不允许进入
                      if (hasOtherActiveInterview && currentDeal.status !== '3') {
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
                          dealId: currentDeal.id,
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
                  onNavigateToMaterials={() => navigateForward(View.MATERIALS_LIST)}
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
                  onPreviewReport={(name, reportUrl, previewUrl) => {
                    setPreviewReport({ name, reportUrl, previewUrl });
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
                      setRecordingBackView(View.DUE_DILIGENCE);
                      setPreviousView(View.MATERIAL_UPLOAD);
                      navigateForward(View.RECORDING);
                    } catch (error) {
                      Toast.clear();
                      console.error("Failed to start interview:", error);
                      Toast.fail('进入访谈失败');
                    }
                  }}
                  onGenerateAI={() => setCurrentView(View.AI_GENERATION)}
                  onEditInfo={handleEditCorporateInfo}
                  onChangeTemplate={() => {
                    setPreviousView(View.MATERIAL_UPLOAD);
                    setCurrentView(View.TEMPLATE_SELECTION);
                  }}
                  onPreviewTemplate={(name, url) => {
                    setPreviewTemplate({ name, url });
                    setPreviousView(View.MATERIAL_UPLOAD);
                    setCurrentView(View.TEMPLATE_PREVIEW);
                  }}
                  initialTab={materialUploadTab}
                  onTabChange={setMaterialUploadTab}
                />
              )}
              {currentView === View.AI_GENERATION && (
                <AiGenerationPage
                  onBack={() => navigateBackward(View.MATERIAL_UPLOAD)}
                  onConfirm={() => setCurrentView(View.DUE_DILIGENCE)}
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
                  onToggleRecording={() => setIsRecording(!isRecording)}
                  interviewInstId={currentInterviewInstId || undefined}
                  interviewInstTitle={currentInterviewInstTitle || undefined}
                  onFinish={() => {
                    // 确保回到尽调详情页, 并重置返回路径为首页
                    setPreviousView(View.HOME);
                    navigateBackward(View.DUE_DILIGENCE);
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
                    setData({
                      dealId: currentDeal?.id,
                      interviewInstId: record.interviewInstId || record.id,
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
                  interviewInstId={currentInterviewInstId || ''}
                  interviewInstTitle={currentInterviewInstTitle || ''}
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
                    setCurrentView(previousView);
                  }}
                />
              )}
              {currentView === View.MY_TEMPLATES && (
                <MyTemplatesPage
                  onBack={() => navigateBackward(templateOrigin || View.HOME)}
                  onUpload={() => setCurrentView(View.UPLOAD_TEMPLATE)}
                  initialTab={templateInitialTab}
                />
              )}
              {currentView === View.UPLOAD_TEMPLATE && (
                <UploadTemplatePage
                  onBack={() => navigateBackward(View.MY_TEMPLATES)}
                  onCancel={() => setCurrentView(View.MY_TEMPLATES)}
                  onSubmit={() => {
                    // 提交成功后不立即返回，等待用户点击"查看列表"
                  }}
                  onViewList={() => {
                    // 点击"查看列表"后跳转到模板管理页的"审核中" tab
                    setTemplateInitialTab('uploading');
                    setCurrentView(View.MY_TEMPLATES);
                  }}
                />
              )}
              {currentView === View.TEMPLATE_SELECTION && (
                <TemplateSelectionPage
                  onBack={() => navigateBackward(previousView)}
                  onPreview={(name, url) => {
                    setPreviewTemplate({ name, url });
                    setCurrentView(View.TEMPLATE_PREVIEW);
                  }}
                  currentTemplateId={currentDeal?.templateId}
                  dealId={currentDeal?.id}
                  onTemplateChanged={(newTemplateId) => {
                    // 更新 currentDeal 的 templateId
                    if (currentDeal) {
                      setCurrentDeal({
                        ...currentDeal,
                        templateId: newTemplateId,
                      });
                    }
                    // 更换成功后返回到之前的页面
                    navigateBackward(previousView);
                  }}
                />
              )}
              {currentView === View.TEMPLATE_PREVIEW && previewTemplate && (
                <TemplatePreviewPage
                  templateName={previewTemplate.name}
                  templateUrl={previewTemplate.url}
                  onBack={() => navigateBackward(previousView)}
                />
              )}
              {currentView === View.REPORT_PREVIEW && previewReport && (
                <ReportPreviewPage
                  reportName={previewReport.name}
                  reportUrl={previewReport.reportUrl}
                  previewUrl={previewReport.previewUrl}
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
                  onUpdateQuestion={(updatedQuestion) => {
                    if (currentDeal) {
                      const updatedList = currentDeal.questionInfoList?.map(q =>
                        q.id === updatedQuestion.id ? updatedQuestion : q
                      ) || [];
                      setCurrentDeal({
                        ...currentDeal,
                        questionInfoList: updatedList,
                      });
                    }
                  }}
                  onDeleteQuestion={(questionId) => {
                    if (currentDeal) {
                      const updatedList = currentDeal.questionInfoList?.filter(q =>
                        q.id !== questionId
                      ) || [];
                      setCurrentDeal({
                        ...currentDeal,
                        questionInfoList: updatedList,
                      });
                    }
                  }}
                  onAddQuestion={(questionName) => {
                    if (currentDeal) {
                      const newQuestion: QuestionInfo = {
                        id: `temp_${Date.now()}`,
                        questionName: questionName,
                        questionIndex: (currentDeal.questionInfoList?.length || 0) + 1,
                        recStatus: '1',
                        questionAnswer: null,
                        questionAnswerTime: null,
                        questionStatus: '0',
                        templateId: '',
                        agencyId: '',
                        CHECKED: false,
                      };
                      const updatedList = [...(currentDeal.questionInfoList || []), newQuestion];
                      setCurrentDeal({
                        ...currentDeal,
                        questionInfoList: updatedList,
                      });
                    }
                  }}
                />
              )}
              {currentView === View.SETTINGS && (
                <SettingsPage
                  onLogout={() => {
                    localStorage.removeItem('zov-user-token');
                    localStorage.removeItem('zov-userinfo');
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
                setNavDirection('forward');
                setCurrentView(View.RECORDING);
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
                      setNavDirection('forward');
                      setCurrentView(View.MATERIAL_UPLOAD);
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
      )}
    </>
  );
};

export default App;
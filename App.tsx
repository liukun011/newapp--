import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { View, DealRecord } from './types';
import { COLORS } from './constants';

const App: React.FC = () => {
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
  // Track current selected deal
  const [currentDeal, setCurrentDeal] = useState<DealRecord | null>(() => {
    try {
      const savedDeal = sessionStorage.getItem('zov-current-deal');
      return savedDeal ? JSON.parse(savedDeal) : null;
    } catch (e) {
      return null;
    }
  });
  // 模板预览数据
  const [previewTemplate, setPreviewTemplate] = useState<{ name: string; url: string } | null>(null);
  // 记住资料上传页的当前标签页
  const [materialUploadTab, setMaterialUploadTab] = useState<string>('upload');
  
  // 导航方向：forward (前进) 或 backward (后退) 或 root (重置/根页面)
  const [navDirection, setNavDirection] = useState<'forward' | 'backward' | 'root'>('forward');
  
  // 页面滚动位置缓存
  const [scrollPositions, setScrollPositions] = useState<Record<View, number>>({} as Record<View, number>);

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
        <div className="w-full max-w-md mx-auto min-h-screen relative overflow-hidden bg-transparent">
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
                onNavigateToRecording={(deal) => {
                  setCurrentDeal(deal);
                  setPreviousView(View.HOME);
                  navigateForward(View.RECORDING);
                }}
                onNavigateToTemplates={() => {
                  navigateForward(View.MY_TEMPLATES);
                }}
                onNavigateToSettings={() => {
                  navigateForward(View.SETTINGS);
                }}
              />
            )}
            {currentView === View.DUE_DILIGENCE && (
              <DueDiligencePage 
                deal={currentDeal}
                onBack={() => navigateBackward(View.HOME)}
                onNavigateToRecording={() => {
                  setPreviousView(View.DUE_DILIGENCE);
                  navigateForward(View.RECORDING);
                }}
                onNavigateToMaterials={() => navigateForward(View.MATERIALS_LIST)}
                onNavigateToQuestions={() => navigateForward(View.QUESTIONS_LIST)}
                onEditInfo={handleEditCorporateInfo}
                onChangeTemplate={() => {
                  setPreviousView(View.DUE_DILIGENCE);
                  navigateForward(View.TEMPLATE_SELECTION);
                }}
                onDealDetailLoaded={(detail) => setCurrentDeal(detail)}
              />
            )}
        {currentView === View.MATERIALS_LIST && (
          <MaterialsListPage 
            dealId={currentDeal?.id}
            onBack={() => navigateBackward(View.DUE_DILIGENCE)}
            onGenerateReport={() => setCurrentView(View.AI_GENERATION)}
          />
        )}
        {currentView === View.MATERIAL_UPLOAD && (
          <MaterialUploadPage 
            deal={currentDeal}
            onBack={() => navigateBackward(View.HOME)}
            onStartInterview={() => {
              setPreviousView(View.DUE_DILIGENCE);
              setCurrentView(View.RECORDING);
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
          <RecordingPage onBack={() => navigateBackward(previousView)} />
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
            onBack={() => navigateBackward(View.HOME)}
            onUpload={() => setCurrentView(View.UPLOAD_TEMPLATE)}
          />
        )}
        {currentView === View.UPLOAD_TEMPLATE && (
          <UploadTemplatePage 
            onBack={() => navigateBackward(View.MY_TEMPLATES)}
            onCancel={() => setCurrentView(View.MY_TEMPLATES)}
            onSubmit={() => {
              // 提交成功后返回模板列表
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
        {currentView === View.QUESTIONS_LIST && (
          <QuestionsListPage 
            dealName={currentDeal?.interviewCust}
            dealLogo={currentDeal?.logo}
            questionInfoList={currentDeal?.questionInfoList || []}
            onBack={() => navigateBackward(View.DUE_DILIGENCE)}
          />
        )}
        {currentView === View.SETTINGS && (
          <SettingsPage 
            onBack={() => navigateBackward(View.HOME)}
            onLogout={() => {
              localStorage.removeItem('zov-user-token');
              localStorage.removeItem('zov-userinfo');
              sessionStorage.removeItem('zov-current-view');
              sessionStorage.removeItem('zov-current-deal');
              setNavDirection('root');
              setCurrentView(View.LOGIN);
              setCurrentDeal(null);
            }}
          />
        )}
          </motion.div>
        </AnimatePresence>
      </div>
      )}
    </>
  );
};

export default App;
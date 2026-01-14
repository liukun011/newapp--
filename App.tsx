import React, { useState } from 'react';
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
import { View, DealRecord } from './types';
import { COLORS } from './constants';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.LOGIN);
  // Track the previous view to support returning from the Edit screen
  const [previousView, setPreviousView] = useState<View>(View.HOME);
  // Track current selected deal
  const [currentDeal, setCurrentDeal] = useState<DealRecord | null>(null);
  // 模板预览数据
  const [previewTemplate, setPreviewTemplate] = useState<{ name: string; url: string } | null>(null);

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

  const handleEditCorporateInfo = () => {
    setPreviousView(currentView);
    setCurrentView(View.CORPORATE_EDIT);
  };

  return (
    <>
      <div style={backgroundStyle} />
      <div className="w-full max-w-md mx-auto min-h-screen relative overflow-hidden bg-transparent">
        {currentView === View.LOGIN && (
          <LoginPage onLogin={() => setCurrentView(View.HOME)} />
        )}
        {currentView === View.HOME && (
          <HomePage 
            onNavigateToDetail={(deal) => {
              setCurrentDeal(deal);
              setCurrentView(View.DUE_DILIGENCE);
            }}
            onCreateNewDeal={(deal) => {
              setCurrentDeal(deal);
              setCurrentView(View.MATERIAL_UPLOAD);
            }}
            onNavigateToRecording={(deal) => {
              setCurrentDeal(deal);
              setPreviousView(View.HOME);
              setCurrentView(View.RECORDING);
            }}
            onNavigateToTemplates={() => {
              setCurrentView(View.MY_TEMPLATES);
            }}
          />
        )}
        {currentView === View.DUE_DILIGENCE && (
          <DueDiligencePage 
            deal={currentDeal}
            onBack={() => setCurrentView(View.HOME)}
            onNavigateToRecording={() => {
              setPreviousView(View.DUE_DILIGENCE);
              setCurrentView(View.RECORDING);
            }}
            onNavigateToMaterials={() => setCurrentView(View.MATERIALS_LIST)}
            onEditInfo={handleEditCorporateInfo}
            onChangeTemplate={() => {
              setPreviousView(View.DUE_DILIGENCE);
              setCurrentView(View.TEMPLATE_SELECTION);
            }}
          />
        )}
        {currentView === View.MATERIALS_LIST && (
          <MaterialsListPage 
            dealId={currentDeal?.id}
            onBack={() => setCurrentView(View.DUE_DILIGENCE)}
            onGenerateReport={() => setCurrentView(View.AI_GENERATION)}
          />
        )}
        {currentView === View.MATERIAL_UPLOAD && (
          <MaterialUploadPage 
            deal={currentDeal}
            onBack={() => setCurrentView(View.HOME)}
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
          />
        )}
        {currentView === View.AI_GENERATION && (
          <AiGenerationPage 
            onBack={() => setCurrentView(View.MATERIAL_UPLOAD)}
            onConfirm={() => setCurrentView(View.DUE_DILIGENCE)}
          />
        )}
        {currentView === View.RECORDING && (
          <RecordingPage onBack={() => setCurrentView(previousView)} />
        )}
        {currentView === View.CORPORATE_EDIT && (
          <CorporateEditPage 
            deal={currentDeal}
            onBack={() => setCurrentView(previousView)}
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
            onBack={() => setCurrentView(View.HOME)}
            onUpload={() => setCurrentView(View.UPLOAD_TEMPLATE)}
          />
        )}
        {currentView === View.UPLOAD_TEMPLATE && (
          <UploadTemplatePage 
            onBack={() => setCurrentView(View.MY_TEMPLATES)}
            onCancel={() => setCurrentView(View.MY_TEMPLATES)}
            onSubmit={() => {
              // 提交成功后返回模板列表
              setCurrentView(View.MY_TEMPLATES);
            }}
          />
        )}
        {currentView === View.TEMPLATE_SELECTION && (
          <TemplateSelectionPage 
            onBack={() => setCurrentView(previousView)}
            onPreview={(name, url) => {
              setPreviewTemplate({ name, url });
              setCurrentView(View.TEMPLATE_PREVIEW);
            }}
            currentTemplateId={currentDeal?.templateId}
            dealId={currentDeal?.id}
          />
        )}
        {currentView === View.TEMPLATE_PREVIEW && previewTemplate && (
          <TemplatePreviewPage 
            templateName={previewTemplate.name}
            templateUrl={previewTemplate.url}
            onBack={() => setCurrentView(View.TEMPLATE_SELECTION)}
          />
        )}
      </div>
    </>
  );
};

export default App;
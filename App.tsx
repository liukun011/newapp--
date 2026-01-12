import React, { useState } from 'react';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import DueDiligencePage from './pages/DueDiligencePage';
import RecordingPage from './pages/RecordingPage';
import MaterialUploadPage from './pages/MaterialUploadPage';
import AiGenerationPage from './pages/AiGenerationPage';
import CorporateEditPage from './pages/CorporateEditPage';
import { View, DealRecord } from './types';
import { COLORS } from './constants';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.LOGIN);
  // Track the previous view to support returning from the Edit screen
  const [previousView, setPreviousView] = useState<View>(View.HOME);
  // Track current selected deal
  const [currentDeal, setCurrentDeal] = useState<DealRecord | null>(null);

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
          <HomePage onNavigateToDetail={(deal) => {
            setCurrentDeal(deal);
            setCurrentView(View.DUE_DILIGENCE);
          }} />
        )}
        {currentView === View.DUE_DILIGENCE && (
          <DueDiligencePage 
            deal={currentDeal}
            onBack={() => setCurrentView(View.HOME)}
            onNavigateToRecording={() => setCurrentView(View.RECORDING)}
            onNavigateToMaterials={() => setCurrentView(View.MATERIAL_UPLOAD)}
            onEditInfo={handleEditCorporateInfo}
          />
        )}
        {currentView === View.MATERIAL_UPLOAD && (
          <MaterialUploadPage 
            onBack={() => setCurrentView(View.DUE_DILIGENCE)}
            onStartInterview={() => setCurrentView(View.RECORDING)}
            onGenerateAI={() => setCurrentView(View.AI_GENERATION)}
            onEditInfo={handleEditCorporateInfo}
          />
        )}
        {currentView === View.AI_GENERATION && (
          <AiGenerationPage 
            onBack={() => setCurrentView(View.MATERIAL_UPLOAD)}
            onConfirm={() => setCurrentView(View.DUE_DILIGENCE)}
          />
        )}
        {currentView === View.RECORDING && (
          <RecordingPage onBack={() => setCurrentView(View.DUE_DILIGENCE)} />
        )}
        {currentView === View.CORPORATE_EDIT && (
          <CorporateEditPage 
            onBack={() => setCurrentView(previousView)}
            onConfirm={() => setCurrentView(previousView)}
          />
        )}
      </div>
    </>
  );
};

export default App;
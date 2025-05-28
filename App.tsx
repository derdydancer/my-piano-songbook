
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import WeightTrackerPage from './features/weight-tracker/WeightTrackerPage';
import DisneyCollectionPage from './features/disney-collection/DisneyCollectionPage';
import GiftAssistantPage from './features/gift-assistant/GiftAssistantPage';
import SettingsPage from './features/settings/SettingsPage';
import WorkoutTrackerPage from './features/workout-tracker/WorkoutTrackerPage';
import WorkoutHistoryPage from './features/workout-history/WorkoutHistoryPage';
import BarLoaderTesterPage from './features/bar-loader-tester/BarLoaderTesterPage';
import DocsViewerPage from './features/docs-viewer/DocsViewerPage'; // New Utility
import { AppDataProvider, useAppData } from './contexts/AppDataContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { UTILITY_IDS } from './constants';

const ProtectedRoute: React.FC<{ utilityId: typeof UTILITY_IDS[keyof typeof UTILITY_IDS], element: JSX.Element }> = ({ utilityId, element }) => {
  const { getUtilitySetting } = useAppData();
  const utility = getUtilitySetting(utilityId);

  if (!utility || !utility.enabled) {
    return <Navigate to="/settings" replace />; 
  }
  return element;
};

const AppContent: React.FC = () => {
  const { theme } = useTheme();
  const { getUtilitySetting } = useAppData(); 

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);
  
  const getDefaultRoute = () => {
    const preferredOrder: Array<typeof UTILITY_IDS[keyof typeof UTILITY_IDS]> = [
      UTILITY_IDS.WEIGHT, 
      UTILITY_IDS.DISNEY, 
      UTILITY_IDS.GIFTS, 
      UTILITY_IDS.TRAIN,
      UTILITY_IDS.BAR_LOADER_TESTER,
      UTILITY_IDS.DOCS_VIEWER, // New Utility
    ];

    for (const utilityId of preferredOrder) {
      const utility = getUtilitySetting(utilityId);
      if (utility?.enabled && !utility.showInMoreMenu) {
        if (utilityId === UTILITY_IDS.WEIGHT) return "/weight";
        if (utilityId === UTILITY_IDS.DISNEY) return "/disney";
        if (utilityId === UTILITY_IDS.GIFTS) return "/gifts";
        if (utilityId === UTILITY_IDS.TRAIN) return "/train";
        if (utilityId === UTILITY_IDS.BAR_LOADER_TESTER) return "/bar-loader-tester";
        if (utilityId === UTILITY_IDS.DOCS_VIEWER) return "/docs"; // New Utility
      }
    }
    
    const settingsUtility = getUtilitySetting(UTILITY_IDS.SETTINGS);
    if (settingsUtility && !settingsUtility.showInMoreMenu) {
        return "/settings";
    }

    for (const utilityId of preferredOrder) {
        const utility = getUtilitySetting(utilityId);
        if (utility?.enabled) {
             if (utilityId === UTILITY_IDS.WEIGHT) return "/weight";
             if (utilityId === UTILITY_IDS.DISNEY) return "/disney";
             if (utilityId === UTILITY_IDS.GIFTS) return "/gifts";
             if (utilityId === UTILITY_IDS.TRAIN) return "/train";
             if (utilityId === UTILITY_IDS.BAR_LOADER_TESTER) return "/bar-loader-tester";
             if (utilityId === UTILITY_IDS.DOCS_VIEWER) return "/docs"; // New Utility
        }
    }
    return "/settings"; 
  };


  return (
    <div className="flex flex-col h-screen bg-background text-textPrimary">
      <main className="flex-grow overflow-y-auto pb-20 sm:pb-4">
        <Routes>
          <Route path="/" element={<Navigate to={getDefaultRoute()} replace />} />
          <Route path="/weight" element={<ProtectedRoute utilityId={UTILITY_IDS.WEIGHT} element={<WeightTrackerPage />} />} />
          <Route path="/disney" element={<ProtectedRoute utilityId={UTILITY_IDS.DISNEY} element={<DisneyCollectionPage />} />} />
          <Route path="/gifts" element={<ProtectedRoute utilityId={UTILITY_IDS.GIFTS} element={<GiftAssistantPage />} />} />
          <Route path="/train" element={<ProtectedRoute utilityId={UTILITY_IDS.TRAIN} element={<WorkoutTrackerPage />} />} />
          <Route path="/workouts" element={<ProtectedRoute utilityId={UTILITY_IDS.TRAIN} element={<WorkoutHistoryPage />} />} />
          <Route path="/bar-loader-tester" element={<ProtectedRoute utilityId={UTILITY_IDS.BAR_LOADER_TESTER} element={<BarLoaderTesterPage />} />} />
          <Route path="/docs" element={<ProtectedRoute utilityId={UTILITY_IDS.DOCS_VIEWER} element={<DocsViewerPage />} />} /> {/* New Utility */}
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to={getDefaultRoute()} replace />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <ThemeProvider>
        <AppDataProvider>
          <AppContent />
        </AppDataProvider>
      </ThemeProvider>
    </HashRouter>
  );
};

export default App;

import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import WeightTrackerPage from './features/weight-tracker/WeightTrackerPage';
import DisneyCollectionPage from './features/disney-collection/DisneyCollectionPage';
import GiftAssistantPage from './features/gift-assistant/GiftAssistantPage';
import SettingsPage from './features/settings/SettingsPage';
import WorkoutTrackerPage from './features/workout-tracker/WorkoutTrackerPage';
import WorkoutHistoryPage from './features/workout-history/WorkoutHistoryPage';
import { AppDataProvider, useAppData } from './contexts/AppDataContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { UTILITY_IDS } from './constants';

const ProtectedRoute: React.FC<{ utilityId: typeof UTILITY_IDS[keyof typeof UTILITY_IDS], element: JSX.Element }> = ({ utilityId, element }) => {
  const { getUtilitySetting } = useAppData();
  const utility = getUtilitySetting(utilityId);

  if (!utility || !utility.enabled) {
    return <Navigate to="/settings" replace />; // Or a dedicated "feature disabled" page
  }
  return element;
};

const AppContent: React.FC = () => {
  const { theme } = useTheme();
  const { getUtilitySetting } = useAppData(); // For finding default route

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);
  
  const getDefaultRoute = () => {
    const weightUtility = getUtilitySetting(UTILITY_IDS.WEIGHT);
    if (weightUtility?.enabled && !weightUtility.showInMoreMenu) return "/weight";
    
    const disneyUtility = getUtilitySetting(UTILITY_IDS.DISNEY);
    if (disneyUtility?.enabled && !disneyUtility.showInMoreMenu) return "/disney";

    const giftsUtility = getUtilitySetting(UTILITY_IDS.GIFTS);
    if (giftsUtility?.enabled && !giftsUtility.showInMoreMenu) return "/gifts";
    
    const trainUtility = getUtilitySetting(UTILITY_IDS.TRAIN);
    if (trainUtility?.enabled && !trainUtility.showInMoreMenu) return "/train";

    // Fallback if no main utilities are directly visible, or try "More" items, or settings
    return "/settings"; // Default fallback
  };


  return (
    <div className="flex flex-col h-screen bg-background text-textPrimary">
      <main className="flex-grow overflow-y-auto pb-20 sm:pb-4"> {/* Increased pb for taller bottom nav */}
        <Routes>
          <Route path="/" element={<Navigate to={getDefaultRoute()} replace />} />
          <Route path="/weight" element={<ProtectedRoute utilityId={UTILITY_IDS.WEIGHT} element={<WeightTrackerPage />} />} />
          <Route path="/disney" element={<ProtectedRoute utilityId={UTILITY_IDS.DISNEY} element={<DisneyCollectionPage />} />} />
          <Route path="/gifts" element={<ProtectedRoute utilityId={UTILITY_IDS.GIFTS} element={<GiftAssistantPage />} />} />
          <Route path="/train" element={<ProtectedRoute utilityId={UTILITY_IDS.TRAIN} element={<WorkoutTrackerPage />} />} />
          <Route path="/workouts" element={<ProtectedRoute utilityId={UTILITY_IDS.TRAIN} element={<WorkoutHistoryPage />} />} />
          <Route path="/settings" element={<SettingsPage />} />
          {/* Add a catch-all or 404 route if desired */}
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
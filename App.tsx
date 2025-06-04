
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import SettingsPage from './features/settings/SettingsPage';
import PianoHelperPage from './features/piano-helper/PianoHelperPage';
import SongbookPage from './features/songbook/SongbookPage';
import { AppDataProvider, useAppData } from './contexts/AppDataContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { UTILITY_IDS } from './constants';

const ProtectedRoute: React.FC<{ utilityId: typeof UTILITY_IDS[keyof typeof UTILITY_IDS], element: JSX.Element }> = ({ utilityId, element }) => {
  const { getUtilitySetting } = useAppData();
  const utility = getUtilitySetting(utilityId);

  // For the focused app, assume Piano and Songbook are core and always enabled if utility setting exists.
  // Settings page is always accessible.
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
      UTILITY_IDS.PIANO_HELPER,
      UTILITY_IDS.SONGBOOK,
    ];

    for (const utilityId of preferredOrder) {
      const utility = getUtilitySetting(utilityId);
      // Assuming core utilities are not in "More Menu" by default after refactor
      if (utility?.enabled) {
        if (utilityId === UTILITY_IDS.PIANO_HELPER) return "/piano-helper";
        if (utilityId === UTILITY_IDS.SONGBOOK) return "/songbook";
      }
    }
    
    // Fallback to settings if no primary utility is enabled or found
    return "/settings"; 
  };


  return (
    <div className="flex flex-col h-screen bg-background text-textPrimary">
      <main className="flex-grow overflow-y-auto pb-20 sm:pb-4">
        <Routes>
          <Route path="/" element={<Navigate to={getDefaultRoute()} replace />} />
          <Route path="/piano-helper" element={<ProtectedRoute utilityId={UTILITY_IDS.PIANO_HELPER} element={<PianoHelperPage />} />} />
          <Route path="/songbook" element={<ProtectedRoute utilityId={UTILITY_IDS.SONGBOOK} element={<SongbookPage />} />} />
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

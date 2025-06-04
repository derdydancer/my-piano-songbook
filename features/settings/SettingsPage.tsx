
import React, { useRef, useState } from 'react';
import { useAppData } from '../../contexts/AppDataContext';
import { AppData, UtilityId, UtilitySetting } from '../../types';
import Button from '../../components/common/Button';
import { ArrowUpOnSquareIcon, ArrowDownOnSquareIcon, SunIcon, MoonIcon, InformationCircleIcon, DatabaseIcon } from '../../components/common/Icons';
import { useTheme } from '../../contexts/ThemeContext';
import { geminiService } from '../../services/geminiService';
import CollapsibleSection from '../../components/common/CollapsibleSection';
import SwitchToggle from '../../components/common/SwitchToggle';
import AlertModal from '../../components/common/AlertModal';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { UTILITY_IDS } from '../../constants';

const SettingsPage: React.FC = () => {
  const { 
    exportData, 
    importData,
    loadSampleData,
    utilitySettings,
    updateUtilitySetting,
  } = useAppData();
  const { theme, toggleTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const apiKeyStatus = geminiService.getApiKeyStatus();

  const [alertModal, setAlertModal] = useState<{ isOpen: boolean, title: string, message: string }>({ isOpen: false, title: '', message: '' });
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void, confirmText?: string, confirmButtonVariant?: 'primary'|'danger'|'secondary' }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const openAlert = (title: string, message: string) => setAlertModal({ isOpen: true, title, message });
  const closeAlert = () => setAlertModal({ isOpen: false, title: '', message: '' });
  const openConfirm = (title: string, message: string, onConfirm: () => void, confirmText?: string, confirmButtonVariant?: 'primary'|'danger'|'secondary') => setConfirmModal({ isOpen: true, title, message, onConfirm, confirmText, confirmButtonVariant });
  const closeConfirm = () => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const handleExport = () => {
    const data = exportData();
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
    const link = document.createElement('a');
    link.href = jsonString;
    link.download = `myPianoSongbook_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    openAlert("Export Successful", "Your data has been successfully exported.");
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      openConfirm(
        "Import Data",
        "Importing data will overwrite all existing data in the app. This action cannot be undone. Are you sure you want to proceed?",
        () => {
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const importedText = e.target?.result as string;
              const parsedData = JSON.parse(importedText) as AppData;
              if (importData(parsedData)) {
                openAlert('Import Successful', 'Data imported successfully!');
              } else {
                 throw new Error("Invalid data format. Essential properties might be missing.");
              }
            } catch (error) {
              console.error('Failed to import data:', error);
              openAlert('Import Failed', `Failed to import data. Please ensure the file is a valid JSON backup.\nError: ${(error as Error).message}`);
            } finally {
                if (fileInputRef.current) {
                    fileInputRef.current.value = ""; 
                }
            }
          };
          reader.readAsText(file);
          closeConfirm();
        },
        "Import & Overwrite",
        "danger"
      );
    }
  };
  
  const handleLoadSampleData = () => {
    openConfirm(
      "Load Sample Data",
      "This will replace your current data with a predefined set of sample data for testing and demonstration. Are you sure?",
      () => {
        loadSampleData();
        openAlert("Sample Data Loaded", "The application has been populated with sample data.");
        closeConfirm();
      },
      "Load Samples",
      "primary"
    );
  };

  const handleUtilityToggle = (utilityId: UtilityId, field: 'enabled' | 'showInMoreMenu', value: boolean) => {
    updateUtilitySetting(utilityId, { [field]: value });
  };

  return (
    <div className="p-4 space-y-6 mb-16">
      <h1 className="text-2xl font-bold text-textPrimary">Settings</h1>

      <CollapsibleSection title="General Settings" initialOpen={true}>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-textPrimary mb-2">Data Management</h3>
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleExport} leftIcon={<ArrowDownOnSquareIcon className="w-5 h-5" />}>
                Export Data
              </Button>
              <Button onClick={handleImportClick} leftIcon={<ArrowUpOnSquareIcon className="w-5 h-5" />}>
                Import Data
              </Button>
               <Button onClick={handleLoadSampleData} leftIcon={<DatabaseIcon className="w-5 h-5" />} variant="secondary">
                Load Sample Data
              </Button>
              <input
                type="file"
                accept=".json"
                ref={fileInputRef}
                onChange={handleFileImport}
                className="hidden"
              />
            </div>
            <p className="mt-2 text-xs text-textSecondary">
              Export/Import your app data as a JSON file. Importing overwrites current data. Sample data helps for testing.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-textPrimary mb-2">Appearance</h3>
            <div className="flex items-center justify-between">
              <span className="text-textPrimary">Theme</span>
              <Button onClick={toggleTheme} variant="ghost" leftIcon={theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}>
                Switch to {theme === 'light' ? 'Dark' : 'Light'} Mode
              </Button>
            </div>
          </div>
           <div>
            <h3 className="text-lg font-semibold text-textPrimary mb-2">AI Assistant (Gemini API)</h3>
             <div className="flex items-center p-3 rounded-md bg-background dark:bg-gray-700">
                <InformationCircleIcon className={`w-6 h-6 mr-3 ${apiKeyStatus === 'valid' ? 'text-green-500' : apiKeyStatus === 'missing' ? 'text-red-500' : 'text-yellow-500'}`} />
                <div>
                    <p className="text-sm font-medium text-textPrimary">
                        API Key Status: <span className={`font-bold ${apiKeyStatus === 'valid' ? 'text-green-500' : apiKeyStatus === 'missing' ? 'text-red-500' : 'text-yellow-500'}`}>{apiKeyStatus.toUpperCase()}</span>
                    </p>
                    <p className="text-xs text-textSecondary mt-1">
                        {apiKeyStatus === 'missing' && " AI features may not function. API key must be set via process.env.API_KEY."}
                        {apiKeyStatus === 'error' && " Error initializing AI. Check console and ensure API key in process.env.API_KEY is valid."}
                        {apiKeyStatus === 'valid' && " AI Assistant is configured and ready."}
                         {apiKeyStatus === 'unknown' && " AI Assistant status is initializing."}
                    </p>
                </div>
            </div>
             <p className="mt-2 text-xs text-textSecondary">
                The Gemini API key must be configured via the `process.env.API_KEY` environment variable. Manual key input in the app is not supported.
            </p>
          </div>
           <div>
            <h3 className="text-lg font-semibold text-textPrimary mb-2">About</h3>
            <p className="text-sm text-textSecondary">
              My Piano Songbook v1.0.0
            </p>
            <p className="text-xs text-textSecondary mt-1">
              Piano chord analysis and songbook management.
            </p>
          </div>
        </div>
      </CollapsibleSection>

      {utilitySettings.map(utility => {
        const isSettingsUtility = utility.id === UTILITY_IDS.SETTINGS;
        // Only show settings for Piano, Songbook, and the Settings utility itself.
        if (utility.id !== UTILITY_IDS.PIANO_HELPER && utility.id !== UTILITY_IDS.SONGBOOK && utility.id !== UTILITY_IDS.SETTINGS) {
            return null;
        }
        return (
          <CollapsibleSection key={utility.id} title={`${utility.name} Utility Settings`}>
            <div className="space-y-4">
              {!isSettingsUtility && (
                <div className="flex justify-between items-center">
                  <span className="text-textPrimary font-medium">Enable {utility.name}</span>
                  <SwitchToggle
                    checked={utility.enabled}
                    onChange={(value) => handleUtilityToggle(utility.id, 'enabled', value)}
                  />
                </div>
              )}
              {(utility.enabled || isSettingsUtility) && (
                <div className="flex justify-between items-center">
                  <span className="text-textPrimary font-medium">Show in "More" Menu</span>
                  <SwitchToggle
                    checked={utility.showInMoreMenu}
                    onChange={(value) => handleUtilityToggle(utility.id, 'showInMoreMenu', value)}
                  />
                </div>
              )}
            </div>
          </CollapsibleSection>
        );
      })}
      
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={closeAlert}
        title={alertModal.title}
        message={alertModal.message}
      />
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirm}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        confirmButtonVariant={confirmModal.confirmButtonVariant}
      />
    </div>
  );
};

export default SettingsPage;

import React, { useRef, useState } from 'react';
import { useAppData } from '../../contexts/AppDataContext';
import { AppData, Plate, LiftType, UtilityId, UtilitySetting } from '../../types';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { ArrowUpOnSquareIcon, ArrowDownOnSquareIcon, SunIcon, MoonIcon, InformationCircleIcon, PlusCircleIcon, TrashIcon, PencilIcon, DatabaseIcon } from '../../components/common/Icons';
import { useTheme } from '../../contexts/ThemeContext';
import { geminiService } from '../../services/geminiService';
import Modal from '../../components/Modal';
import CollapsibleSection from '../../components/common/CollapsibleSection';
import SwitchToggle from '../../components/common/SwitchToggle';
import AlertModal from '../../components/common/AlertModal';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { UTILITY_IDS } from '../../constants'; // Global UTILITY_IDS
import useGeminiApiKey from '../../hooks/useGeminiApiKey';

// Workout Tracker specific constants, imported from their new location
import { DEFAULT_PLATE_DENOMINATIONS, ALL_LIFTS as WORKOUT_ALL_LIFTS, BAR_WEIGHT as WORKOUT_BAR_WEIGHT } from '../workout-tracker/workoutTracker.constants';


const SettingsPage: React.FC = () => {
  const { 
    exportData, 
    importData,
    loadSampleData,
    // For Workout Settings, directly use actions from useAppData which are now typed
    // plateInventory, // No longer directly needed, use getPlateInventory()
    // exerciseSettings, // No longer directly needed, use getExerciseSettings()
    getPlateInventory, // New getter
    getExerciseSettings, // New getter
    updatePlateInventory, 
    updateExerciseSetting,
    utilitySettings,
    updateUtilitySetting,
  } = useAppData();
  const { theme, toggleTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const apiKeyStatus = geminiService.getApiKeyStatus();
  const [geminiApiKey, setGeminiApiKey] = useGeminiApiKey();

  // Get workout specific data using the new accessors
  const plateInventory = getPlateInventory ? getPlateInventory() : [];
  const exerciseSettings = getExerciseSettings ? getExerciseSettings() : {} as AppData['exerciseSettings'];


  const [isPlateModalOpen, setIsPlateModalOpen] = useState(false);
  const [editingPlate, setEditingPlate] = useState<Plate | null>(null);
  const [currentPlateDenom, setCurrentPlateDenom] = useState<number>(DEFAULT_PLATE_DENOMINATIONS[0]);
  const [currentPlateQty, setCurrentPlateQty] = useState<string>("2");
  const [apiKeyInput, setApiKeyInput] = useState(geminiApiKey);

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
    link.download = `myUtilitiesHub_backup_${new Date().toISOString().split('T')[0]}.json`;
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
                    fileInputRef.current.value = ""; // Reset file input
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


  const handleOpenAddPlateModal = () => {
    setEditingPlate(null);
    setCurrentPlateDenom(DEFAULT_PLATE_DENOMINATIONS.find(d => !plateInventory.some(p => p.denomination === d)) || DEFAULT_PLATE_DENOMINATIONS[0]);
    setCurrentPlateQty("2");
    setIsPlateModalOpen(true);
  };

  const handleOpenEditPlateModal = (plate: Plate) => {
    setEditingPlate(plate);
    setCurrentPlateDenom(plate.denomination);
    setCurrentPlateQty(plate.quantity.toString());
    setIsPlateModalOpen(true);
  };

  const handleSavePlate = () => {
    const quantity = parseInt(currentPlateQty, 10);
    if (isNaN(quantity) || quantity < 0) {
      openAlert("Invalid Input", "Please enter a valid quantity (0 or more).");
      return;
    }
    if (editingPlate) {
      const updatedInventory = plateInventory.map(p =>
        p.denomination === editingPlate.denomination ? { ...p, quantity } : p
      );
      updatePlateInventory(updatedInventory);
    } else {
      if (plateInventory.some(p => p.denomination === currentPlateDenom)) {
        openAlert("Duplicate Plate", "This plate denomination already exists in your inventory. Edit the existing entry instead.");
        return;
      }
      const newPlate: Plate = { denomination: currentPlateDenom, quantity };
      updatePlateInventory([...plateInventory, newPlate].sort((a,b) => b.denomination - a.denomination));
    }
    setIsPlateModalOpen(false);
  };

  const handleDeletePlate = (denomination: number) => {
    openConfirm(
      "Delete Plate",
      `Are you sure you want to remove ${denomination}kg plates from your inventory?`,
      () => {
        updatePlateInventory(plateInventory.filter(p => p.denomination !== denomination));
        closeConfirm();
      },
      "Delete",
      "danger"
    );
  };
  
  const handleProgressionChange = (lift: LiftType, value: string) => {
    const increment = parseFloat(value);
    if (!isNaN(increment) && increment >= 0) {
      updateExerciseSetting(lift, { progressionIncrement: increment });
    } else {
      openAlert("Invalid Input", "Progression increment must be a non-negative number.");
    }
  };

  const handleUtilityToggle = (utilityId: UtilityId, field: 'enabled' | 'showInMoreMenu', value: boolean) => {
    updateUtilitySetting(utilityId, { [field]: value });
  };

  const handleApiKeySave = () => {
    setGeminiApiKey(apiKeyInput);
    openAlert("API Key Saved", "Your Gemini API key has been saved.");
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
                        You can set your Gemini API key below. This is stored in your browser only.
                        {apiKeyStatus === 'missing' && " AI features in 'Gifts' may not function."}
                    </p>
                </div>
            </div>
            <div className="mt-4">
                <h4 className="text-md font-semibold text-textPrimary mb-2">Set Gemini API Key</h4>
                <div className="flex space-x-2">
                    <Input
                        type="password"
                        value={apiKeyInput}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiKeyInput(e.target.value)}
                        placeholder="Enter Gemini API Key"
                        className="w-full"
                    />
                    <Button onClick={handleApiKeySave} type="button">Save</Button>
                </div>
                <p className="mt-2 text-xs text-textSecondary">
                    Your key is stored locally and never sent anywhere except to Gemini when you use AI features.
                </p>
            </div>
          </div>
           <div>
            <h3 className="text-lg font-semibold text-textPrimary mb-2">About</h3>
            <p className="text-sm text-textSecondary">
              My Utilities Hub v1.4.0
            </p>
            <p className="text-xs text-textSecondary mt-1">
              Manage your utilities with ease.
            </p>
          </div>
        </div>
      </CollapsibleSection>

      {utilitySettings.map(utility => {
        const isSettingsUtility = utility.id === UTILITY_IDS.SETTINGS;
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

              {utility.id === UTILITY_IDS.TRAIN && utility.enabled && plateInventory && exerciseSettings && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                  <div>
                      <div className="flex justify-between items-center mb-3">
                          <h3 className="text-md font-semibold text-textPrimary">Plate Inventory</h3>
                          <Button onClick={handleOpenAddPlateModal} size="sm" variant="ghost" leftIcon={<PlusCircleIcon className="w-4 h-4"/>}>Add Plates</Button>
                      </div>
                      {plateInventory.length === 0 ? (
                          <p className="text-textSecondary text-sm">No plates configured.</p>
                      ) : (
                          <ul className="space-y-2">
                              {plateInventory.sort((a,b) => b.denomination - a.denomination).map(plate => (
                                  <li key={plate.denomination} className="flex justify-between items-center p-2 bg-background dark:bg-gray-700 rounded">
                                      <span className="text-textPrimary text-sm">{plate.denomination} kg x {plate.quantity}</span>
                                      <div className="space-x-1">
                                          <Button variant="ghost" size="sm" onClick={() => handleOpenEditPlateModal(plate)} leftIcon={<PencilIcon className="w-4 h-4"/>}>Edit</Button>
                                          <Button variant="ghost" size="sm" onClick={() => handleDeletePlate(plate.denomination)} leftIcon={<TrashIcon className="w-4 h-4 text-red-500"/>}>Delete</Button>
                                      </div>
                                  </li>
                              ))}
                          </ul>
                      )}
                      <p className="mt-2 text-xs text-textSecondary">Bar is assumed to be {WORKOUT_BAR_WEIGHT}kg.</p>
                  </div>
                  <div>
                      <h3 className="text-md font-semibold text-textPrimary mb-3">Exercise Progression</h3>
                      <div className="space-y-3">
                          {WORKOUT_ALL_LIFTS.map(lift => (
                              <div key={lift} className="flex flex-col sm:flex-row justify-between sm:items-center">
                                  <label htmlFor={`${lift}-progression`} className="block text-sm font-medium text-textPrimary mb-1 sm:mb-0">{lift} Increment (kg)</label>
                                  <Input
                                      id={`${lift}-progression`}
                                      type="number"
                                      value={exerciseSettings[lift]?.progressionIncrement.toString() || "2.5"}
                                      onChange={(e) => handleProgressionChange(lift, e.target.value)}
                                      min="0"
                                      step="0.1"
                                      className="w-full sm:w-24 mt-0 text-sm"
                                      containerClassName="mb-0"
                                  />
                              </div>
                          ))}
                      </div>
                  </div>
                </div>
              )}
            </div>
          </CollapsibleSection>
        );
      })}

      <Modal isOpen={isPlateModalOpen} onClose={() => setIsPlateModalOpen(false)} title={editingPlate ? "Edit Plate" : "Add Plate"}>
        <form onSubmit={(e) => { e.preventDefault(); handleSavePlate(); }} className="space-y-4">
            <label htmlFor="plateDenom" className="block text-sm font-medium text-textSecondary">Denomination (kg)</label>
            {editingPlate ? (
                <Input id="plateDenom" type="number" value={currentPlateDenom} disabled className="bg-gray-100 dark:bg-gray-600"/>
            ) : (
                 <select 
                    id="plateDenom"
                    value={currentPlateDenom}
                    onChange={(e) => setCurrentPlateDenom(parseFloat(e.target.value))}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-card border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md text-textPrimary dark:text-textPrimary"
                >
                    {DEFAULT_PLATE_DENOMINATIONS.filter(d => !plateInventory.some(p => p.denomination === d && p.denomination !== editingPlate?.denomination)).map(d => (
                        <option key={d} value={d}>{d} kg</option>
                    ))}
                </select>
            )}
            <Input
                label="Quantity (total number of these plates)"
                type="number"
                id="plateQty"
                value={currentPlateQty}
                onChange={(e) => setCurrentPlateQty(e.target.value)}
                min="0"
                step="1"
                required
            />
            <div className="flex justify-end space-x-2 pt-2">
                <Button variant="ghost" type="button" onClick={() => setIsPlateModalOpen(false)}>Cancel</Button>
                <Button type="submit">Save Plate</Button>
            </div>
        </form>
      </Modal>
      
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

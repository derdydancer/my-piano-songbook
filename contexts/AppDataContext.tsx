
import React, { createContext, useContext, ReactNode, useCallback, useEffect, useState } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { AppData, WeightEntry, DisneyOwnedStatus, GiftRecipientList, GiftItem, Plate, ExerciseSettings, WorkoutSession, LiftType, UtilitySetting, UtilityId, SinglePersonGiftSuggestion, ProcessedAIResults, ManualGiftItemData, AISuggestedGiftItem } from '../types';
import { DEFAULT_UTILITY_SETTINGS, UTILITY_IDS } from '../constants'; // Global constants
import { AI_STUDIO_SAMPLE_DATA } from '../sampleData'; // Aggregated sample data

// Import initial data slices and action creators from utility-specific modules
import { initialWeightTrackerData, createWeightTrackerActions, WeightTrackerActions } from '../features/weight-tracker/weightTracker.data';
import { initialDisneyCollectionData, createDisneyCollectionActions, DisneyCollectionActions } from '../features/disney-collection/disneyCollection.data';
import { initialGiftAssistantData, createGiftAssistantActions, GiftAssistantActions, NEW_TAG_DURATION_MS } from '../features/gift-assistant/giftAssistant.data';
import { initialWorkoutTrackerData, createWorkoutTrackerActions, WorkoutTrackerActions } from '../features/workout-tracker/workoutTracker.data';
import { initialBarLoaderTesterData, createBarLoaderTesterActions, BarLoaderTesterActions } from '../features/bar-loader-tester/barLoaderTester.data'; // New Utility

import { ALL_LIFTS as WORKOUT_ALL_LIFTS } from '../features/workout-tracker/workoutTracker.constants'; // For migration
import { getDefaultPlateInventory as getWorkoutDefaultPlateInventory, getDefaultExerciseSettings as getWorkoutDefaultExerciseSettings } from '../features/workout-tracker/workoutTracker.data'; // For migration
import { DISNEY_ANIMATED_CLASSICS } from '../features/disney-collection/disneyCollection.constants'; // For migration


// Define the core context type for global actions and state
interface AppDataCoreContextType {
  exportData: () => AppData;
  importData: (data: AppData) => boolean;
  loadSampleData: () => void;
  utilitySettings: UtilitySetting[];
  updateUtilitySetting: (utilityId: UtilityId, updates: Partial<UtilitySetting>) => void;
  getUtilitySetting: (utilityId: UtilityId) => UtilitySetting | undefined;
  weightEntries: WeightEntry[];
  disneyCollection: DisneyOwnedStatus[];
  // Note: workoutTracker specific actions like generateSetsForExercise are part of WorkoutTrackerActions
}

// Combine core context type with all utility-specific action types
export type AppDataContextType = AppDataCoreContextType &
  WeightTrackerActions &
  DisneyCollectionActions &
  GiftAssistantActions &
  WorkoutTrackerActions &
  BarLoaderTesterActions; // New Utility Actions

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

// Combine initial data from all utility modules
const initialAppData: AppData = {
  ...initialWeightTrackerData,
  ...initialDisneyCollectionData,
  ...initialGiftAssistantData,
  ...initialWorkoutTrackerData,
  ...initialBarLoaderTesterData, // New Utility
  utilitySettings: DEFAULT_UTILITY_SETTINGS,
};


export const AppDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const getInitialStateForLocalStorage = (): AppData => {
    try {
      const item = window.localStorage.getItem('myUtilitiesHubData');
      if (item) {
        if (item.startsWith('{') && item.endsWith('}')) {
           const parsedData = JSON.parse(item) as AppData;
           if (parsedData.utilitySettings && parsedData.weightEntries !== undefined && parsedData.disneyCollection !== undefined) { 
             return parsedData;
           }
        }
      }
      const loadSample = window.localStorage.getItem('loadSampleDataInAIStudio') === 'true';
      if (loadSample) {
        console.log("No existing data or invalid structure, AI Studio flag is set. Initializing with sample data.");
        return AI_STUDIO_SAMPLE_DATA;
      }
    } catch (error) {
      console.error("Error reading or parsing localStorage for initial state:", error);
    }
    console.log("No existing data or sample flag, or data invalid. Initializing with default app data.");
    return initialAppData; 
  };
  
  const [appData, setAppData] = useLocalStorage<AppData>('myUtilitiesHubData', getInitialStateForLocalStorage());

  useEffect(() => {
    let dataChanged = false;
    const tempAppData: AppData = JSON.parse(JSON.stringify(appData)); 

    if (!tempAppData.disneyCollection || tempAppData.disneyCollection.length !== DISNEY_ANIMATED_CLASSICS.length) {
      const currentClassicIds = new Set(tempAppData.disneyCollection?.map(dc => dc.classicId) || []);
      const newClassics = DISNEY_ANIMATED_CLASSICS
        .filter(classic => !currentClassicIds.has(classic.id))
        .map(classic => ({ classicId: classic.id, ownedDvd: false, ownedBluRay: false }));
      
      if (newClassics.length > 0 || (tempAppData.disneyCollection && tempAppData.disneyCollection.length !== DISNEY_ANIMATED_CLASSICS.length) ) {
        tempAppData.disneyCollection = [...(tempAppData.disneyCollection || []), ...newClassics]
          .filter(dc => DISNEY_ANIMATED_CLASSICS.some(c => c.id === dc.classicId)) 
          .sort((a, b) => a.classicId - b.classicId); 
        dataChanged = true;
      }
    }
     if (!tempAppData.weightEntries) {
        tempAppData.weightEntries = [];
        dataChanged = true;
    }

    if (!tempAppData.plateInventory || tempAppData.plateInventory.length === 0) {
      tempAppData.plateInventory = getWorkoutDefaultPlateInventory();
      dataChanged = true;
    }
    if (!tempAppData.exerciseSettings || Object.keys(tempAppData.exerciseSettings).length === 0) {
        tempAppData.exerciseSettings = getWorkoutDefaultExerciseSettings();
        dataChanged = true;
    } else {
        let settingsUpdated = false;
        const defaultSettings = getWorkoutDefaultExerciseSettings();
        WORKOUT_ALL_LIFTS.forEach(lift => {
            if (!tempAppData.exerciseSettings[lift]) {
                tempAppData.exerciseSettings[lift] = defaultSettings[lift];
                settingsUpdated = true;
            } else { 
                if (typeof tempAppData.exerciseSettings[lift] === 'object' && tempAppData.exerciseSettings[lift] !== null) {
                    const currentLiftSetting = tempAppData.exerciseSettings[lift];
                    const defaultLiftSetting = defaultSettings[lift];
                    for (const key in defaultLiftSetting) {
                        const K = key as keyof ExerciseSettings[LiftType];
                        if (currentLiftSetting[K] === undefined) {
                            (currentLiftSetting as any)[K] = defaultLiftSetting[K];
                            settingsUpdated = true;
                        }
                    }
                } else {
                    tempAppData.exerciseSettings[lift] = defaultSettings[lift];
                    settingsUpdated = true;
                }
            }
        });
        if (settingsUpdated) dataChanged = true;
    }
    if (!tempAppData.workoutSessions) {
      tempAppData.workoutSessions = [];
      dataChanged = true;
    }

    if (!tempAppData.utilitySettings || tempAppData.utilitySettings.length === 0) {
        tempAppData.utilitySettings = DEFAULT_UTILITY_SETTINGS;
        dataChanged = true;
    } else {
        const currentSettingsMap = new Map(tempAppData.utilitySettings.map(s => [s.id, s]));
        const mergedSettings: UtilitySetting[] = [];
        let utilitiesChanged = false;

        DEFAULT_UTILITY_SETTINGS.forEach(defaultSetting => {
            const existingSetting = currentSettingsMap.get(defaultSetting.id);
            if (existingSetting) {
                let needsUpdate = false;
                const updatedExistingSetting = { ...defaultSetting, ...existingSetting };
                if (updatedExistingSetting.id === UTILITY_IDS.SETTINGS) {
                    updatedExistingSetting.enabled = true; 
                }
                if (JSON.stringify(updatedExistingSetting) !== JSON.stringify(existingSetting)) {
                    needsUpdate = true;
                }
                mergedSettings.push(updatedExistingSetting);
                if(needsUpdate) utilitiesChanged = true;
            } else {
                mergedSettings.push(defaultSetting); 
                utilitiesChanged = true;
            }
        });
        const validUtilityIds = new Set(DEFAULT_UTILITY_SETTINGS.map(s => s.id));
        const finalMergedSettings = mergedSettings.filter(s => validUtilityIds.has(s.id));

        if (finalMergedSettings.length !== tempAppData.utilitySettings.length || utilitiesChanged) {
           tempAppData.utilitySettings = finalMergedSettings;
           dataChanged = true;
        }
    }
    
    if (!tempAppData.giftRecipientLists) {
        tempAppData.giftRecipientLists = [];
        dataChanged = true;
    } else if (tempAppData.giftRecipientLists) {
      let giftsChanged = false;
      tempAppData.giftRecipientLists.forEach((list: GiftRecipientList, index: number) => {
        if (list.knowledge === undefined) { list.knowledge = ''; giftsChanged = true; }
        if (list.orderIndex === undefined) { list.orderIndex = index; giftsChanged = true; }
        if(list.gifts) {
            list.gifts.forEach((gift: GiftItem) => {
                if(gift.dateAdded === undefined) { gift.dateAdded = new Date().toISOString(); giftsChanged = true; }
                if(gift.tags === undefined) { gift.tags = []; giftsChanged = true; }
                if (gift.isNew && gift.dateNewClearTimestamp === undefined) { gift.dateNewClearTimestamp = Date.now() + NEW_TAG_DURATION_MS; giftsChanged = true; }
            });
        } else {
            list.gifts = [];
            giftsChanged = true;
        }
      });
      const sortedLists = [...tempAppData.giftRecipientLists].sort((a: GiftRecipientList, b: GiftRecipientList) => a.orderIndex - b.orderIndex);
      sortedLists.forEach((list: GiftRecipientList, index: number) => {
        if (list.orderIndex !== index) {
            list.orderIndex = index;
            giftsChanged = true;
        }
      });
      if(giftsChanged) {
          tempAppData.giftRecipientLists = sortedLists;
          dataChanged = true;
      }
    }

    if (dataChanged) {
      console.log("App data migrated/updated:", tempAppData);
      setAppData(tempAppData);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const exportData = useCallback((): AppData => appData, [appData]);

  const importData = useCallback((data: AppData): boolean => {
    if (data && data.weightEntries !== undefined && data.disneyCollection !== undefined && data.giftRecipientLists !== undefined && data.plateInventory !== undefined && data.exerciseSettings !== undefined && data.workoutSessions !== undefined && data.utilitySettings !== undefined) {
      if (data.giftRecipientLists && data.giftRecipientLists.some(list => list.orderIndex === undefined)) {
        data.giftRecipientLists.forEach((list, index) => {
          list.orderIndex = index; 
        });
         data.giftRecipientLists.sort((a,b) => a.orderIndex - b.orderIndex);
      }
      const completeImportData = { ...initialAppData, ...data };
      setAppData(completeImportData); 
      return true;
    } else {
      console.error("Import failed: Invalid data format.", data);
      return false;
    }
  }, [setAppData]);
  
  const loadSampleData = useCallback(() => {
    setAppData(AI_STUDIO_SAMPLE_DATA);
  }, [setAppData]);

  const updateUtilitySetting = useCallback((utilityId: UtilityId, updates: Partial<UtilitySetting>) => {
    setAppData(prev => ({
      ...prev,
      utilitySettings: prev.utilitySettings.map(setting => {
        if (setting.id === utilityId) {
          const newSetting = { ...setting, ...updates };
          if (utilityId === UTILITY_IDS.SETTINGS) {
            newSetting.enabled = true; 
          }
          return newSetting;
        }
        return setting;
      }),
    }));
  }, [setAppData]);

  const getUtilitySetting = useCallback((utilityId: UtilityId): UtilitySetting | undefined => {
    return appData.utilitySettings.find(setting => setting.id === utilityId);
  }, [appData.utilitySettings]);

  const getAppDataForActions = useCallback((): AppData => {
    return appData;
  }, [appData]);


  const weightTrackerActions = createWeightTrackerActions(setAppData, getAppDataForActions);
  const disneyCollectionActions = createDisneyCollectionActions(setAppData, getAppDataForActions);
  const giftAssistantActions = createGiftAssistantActions(setAppData, getAppDataForActions);
  const workoutTrackerActions = createWorkoutTrackerActions(setAppData, getAppDataForActions);
  // Pass workoutTrackerActions to createBarLoaderTesterActions
  const barLoaderTesterActions = createBarLoaderTesterActions(setAppData, getAppDataForActions, workoutTrackerActions); 


  const contextValue: AppDataContextType = {
    exportData,
    importData,
    loadSampleData,
    utilitySettings: appData.utilitySettings,
    updateUtilitySetting,
    getUtilitySetting,
    weightEntries: appData.weightEntries,
    disneyCollection: appData.disneyCollection,
    ...weightTrackerActions,
    ...disneyCollectionActions,
    ...giftAssistantActions,
    ...workoutTrackerActions,
    ...barLoaderTesterActions, 
  };
  
  return (
    <AppDataContext.Provider value={contextValue}>
      {children}
    </AppDataContext.Provider>
  );
};

export const useAppData = (): AppDataContextType => {
  const context = useContext(AppDataContext);
  if (context === undefined) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
};

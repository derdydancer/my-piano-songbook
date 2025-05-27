
import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { AppData, WeightEntry, DisneyOwnedStatus, GiftRecipientList, GiftItem, GiftItemStatus, Plate, ExerciseSettings, WorkoutSession, LiftType, SetDetails, PlateCombination, ExerciseLog, WorkoutDefinition, WorkoutExerciseDefinition, ExerciseSetting, UtilitySetting, UtilityId, SinglePersonGiftSuggestion, AISuggestedGiftItem, ProcessedAIResults, ManualGiftItemData } from '../types';
import { DISNEY_ANIMATED_CLASSICS, getDefaultPlateInventory, getDefaultExerciseSettings, BAR_WEIGHT, WORKOUT_DEFINITIONS, SMALLEST_BAR_INCREMENT, ALL_LIFTS, DEFAULT_UTILITY_SETTINGS, UTILITY_IDS, DEFAULT_PERSON_SUGGESTION } from '../constants';
import { calculateBestPlateCombination, roundToNearestIncrement, findClosestLoadableWeight } from '../utils/workoutHelper';


interface AppDataContextType {
  // Weight Tracker
  weightEntries: WeightEntry[];
  addWeightEntry: (entry: Omit<WeightEntry, 'id'>) => void;
  updateWeightEntry: (entry: WeightEntry) => void;
  deleteWeightEntry: (id: string) => void;

  // Disney Collection
  disneyCollection: DisneyOwnedStatus[];
  updateDisneyOwnedStatus: (classicId: number, type: 'dvd' | 'bluray', owned: boolean) => void;
  getDisneyOwnedStatus: (classicId: number) => DisneyOwnedStatus | undefined;

  // Gift Assistant
  giftRecipientLists: GiftRecipientList[];
  addGiftRecipientList: (personName: string) => string; // returns new list ID
  deleteGiftRecipientList: (listId: string) => void;
  updateGiftRecipientListName: (listId: string, newName: string) => void;
  updateGiftRecipientListKnowledge: (listId: string, knowledge: string) => void; // New
  addGiftItem: (listId: string, itemData: ManualGiftItemData) => void; // For manual additions
  updateGiftItem: (listId: string, item: GiftItem) => void;
  deleteGiftItem: (listId: string, itemId: string) => void;
  processAISuggestionsForConfirmation: (aiSuggestions: SinglePersonGiftSuggestion[], fallbackListId?: string | null) => ProcessedAIResults;
  addConfirmedAIGifts: (listId: string, gifts: AISuggestedGiftItem[]) => void;


  // Settings
  exportData: () => AppData;
  importData: (data: AppData) => void;
  utilitySettings: UtilitySetting[];
  updateUtilitySetting: (utilityId: UtilityId, updates: Partial<UtilitySetting>) => void;
  getUtilitySetting: (utilityId: UtilityId) => UtilitySetting | undefined;


  // Workout Tracker
  plateInventory: Plate[];
  updatePlateInventory: (updatedInventory: Plate[]) => void;
  exerciseSettings: ExerciseSettings;
  updateExerciseSetting: (lift: LiftType, setting: Partial<ExerciseSetting>) => void;
  workoutSessions: WorkoutSession[];
  addWorkoutSession: (session: WorkoutSession) => void;
  getLastWorkoutSession: (workoutDefinitionName?: string) => WorkoutSession | undefined;
  getAllWorkoutSessions: () => WorkoutSession[]; // For alternation logic
  getProposedWorksetWeight: (lift: LiftType) => number;
  generateSetsForExercise: (exerciseDef: WorkoutExerciseDefinition, proposedWorksetWeight: number, previousPlateConfig?: PlateCombination) => { exerciseLog: ExerciseLog, nextPlateConfig?: PlateCombination};
  getAvailableWorkoutDefinitions: () => WorkoutDefinition[];
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

const initialAppData: AppData = {
  weightEntries: [],
  disneyCollection: DISNEY_ANIMATED_CLASSICS.map(classic => ({ classicId: classic.id, ownedDvd: false, ownedBluRay: false })),
  giftRecipientLists: [],
  utilitySettings: DEFAULT_UTILITY_SETTINGS,
  // Workout Tracker Initial Data
  plateInventory: getDefaultPlateInventory(),
  exerciseSettings: getDefaultExerciseSettings(),
  workoutSessions: [],
};

export const AppDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [appData, setAppData] = useLocalStorage<AppData>('myUtilitiesHubData', initialAppData);

  // Initialization checks
  if (appData.disneyCollection.length !== DISNEY_ANIMATED_CLASSICS.length) {
    const currentClassicIds = new Set(appData.disneyCollection.map(dc => dc.classicId));
    const newClassics = DISNEY_ANIMATED_CLASSICS
      .filter(classic => !currentClassicIds.has(classic.id))
      .map(classic => ({ classicId: classic.id, ownedDvd: false, ownedBluRay: false }));
    
    const updatedCollection = [...appData.disneyCollection, ...newClassics]
      .filter(dc => DISNEY_ANIMATED_CLASSICS.some(c => c.id === dc.classicId)) 
      .sort((a, b) => a.classicId - b.classicId); 

    setAppData(prev => ({ ...prev, disneyCollection: updatedCollection }));
  }
  
  if (!appData.plateInventory || appData.plateInventory.length === 0) {
    setAppData(prev => ({ ...prev, plateInventory: getDefaultPlateInventory() }));
  }
  if (!appData.exerciseSettings || Object.keys(appData.exerciseSettings).length !== ALL_LIFTS.length) {
     const currentSettings = {...(appData.exerciseSettings || {})};
     let settingsUpdated = false;
      ALL_LIFTS.forEach(lift => {
          if (!currentSettings[lift]) {
              currentSettings[lift] = getDefaultExerciseSettings()[lift];
              settingsUpdated = true;
          }
      });
      if (settingsUpdated) {
         setAppData(prev => ({ ...prev, exerciseSettings: currentSettings as ExerciseSettings }));
      } else if (!appData.exerciseSettings) { // Handles if appData.exerciseSettings was completely missing
         setAppData(prev => ({ ...prev, exerciseSettings: getDefaultExerciseSettings() }));
      }
  }
  if (!appData.workoutSessions) {
    setAppData(prev => ({ ...prev, workoutSessions: [] }));
  }
  if (!appData.utilitySettings || appData.utilitySettings.length !== DEFAULT_UTILITY_SETTINGS.length) {
    const currentSettingsMap = new Map(appData.utilitySettings?.map(s => [s.id, s]));
    const mergedSettings = DEFAULT_UTILITY_SETTINGS.map(defaultSetting => 
      currentSettingsMap.get(defaultSetting.id) || defaultSetting
    );
    setAppData(prev => ({ ...prev, utilitySettings: mergedSettings }));
  }


  // Weight Tracker Methods
  const addWeightEntry = useCallback((entry: Omit<WeightEntry, 'id'>) => {
    const newEntry: WeightEntry = { ...entry, id: Date.now().toString() };
    setAppData(prev => ({ ...prev, weightEntries: [...prev.weightEntries, newEntry].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()) }));
  }, [setAppData]);

  const updateWeightEntry = useCallback((updatedEntry: WeightEntry) => {
    setAppData(prev => ({
      ...prev,
      weightEntries: prev.weightEntries.map(entry => entry.id === updatedEntry.id ? updatedEntry : entry).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    }));
  }, [setAppData]);

  const deleteWeightEntry = useCallback((id: string) => {
    setAppData(prev => ({ ...prev, weightEntries: prev.weightEntries.filter(entry => entry.id !== id) }));
  }, [setAppData]);

  // Disney Collection Methods
  const updateDisneyOwnedStatus = useCallback((classicId: number, type: 'dvd' | 'bluray', owned: boolean) => {
    setAppData(prev => ({
      ...prev,
      disneyCollection: prev.disneyCollection.map(item =>
        item.classicId === classicId
          ? { ...item, [type === 'dvd' ? 'ownedDvd' : 'ownedBluRay']: owned }
          : item
      ),
    }));
  }, [setAppData]);
  
  const getDisneyOwnedStatus = useCallback((classicId: number) => {
    return appData.disneyCollection.find(item => item.classicId === classicId);
  }, [appData.disneyCollection]);

  // Gift Assistant Methods
  const addGiftRecipientList = useCallback((personName: string): string => {
    const newListId = Date.now().toString();
    const newList: GiftRecipientList = { 
      id: newListId, 
      personName: personName.trim(), 
      gifts: [],
      knowledge: '' // Initialize knowledge
    };
    setAppData(prev => ({ ...prev, giftRecipientLists: [...prev.giftRecipientLists, newList] }));
    return newListId;
  }, [setAppData]);


  const deleteGiftRecipientList = useCallback((listId: string) => {
    setAppData(prev => ({ ...prev, giftRecipientLists: prev.giftRecipientLists.filter(list => list.id !== listId) }));
  }, [setAppData]);
  
  const updateGiftRecipientListName = useCallback((listId: string, newName: string) => {
    setAppData(prev => ({
      ...prev,
      giftRecipientLists: prev.giftRecipientLists.map(list =>
        list.id === listId ? { ...list, personName: newName.trim() } : list
      ),
    }));
  }, [setAppData]);

  const updateGiftRecipientListKnowledge = useCallback((listId: string, knowledge: string) => {
    setAppData(prev => ({
      ...prev,
      giftRecipientLists: prev.giftRecipientLists.map(list =>
        list.id === listId ? { ...list, knowledge: knowledge } : list
      ),
    }));
  }, [setAppData]);

  const addGiftItem = useCallback((listId: string, itemData: ManualGiftItemData) => {
    const newItem: GiftItem = { 
      id: Date.now().toString(), 
      itemName: itemData.itemName,
      details: itemData.details,
      status: itemData.status || GiftItemStatus.Idea, // Default for manual add
      isNew: true,
      dateAdded: new Date().toISOString(),
      tags: itemData.tags || []
    };
    setAppData(prev => ({
      ...prev,
      giftRecipientLists: prev.giftRecipientLists.map(list =>
        list.id === listId ? { ...list, gifts: [newItem, ...list.gifts] } : list
      ),
    }));
  }, [setAppData]);

  const updateGiftItem = useCallback((listId: string, updatedItem: GiftItem) => {
    setAppData(prev => ({
      ...prev,
      giftRecipientLists: prev.giftRecipientLists.map(list =>
        list.id === listId
          ? { ...list, gifts: list.gifts.map(item => item.id === updatedItem.id ? {...updatedItem, isNew: false } : item) }
          : list
      ),
    }));
  }, [setAppData]);

  const deleteGiftItem = useCallback((listId: string, itemId: string) => {
    setAppData(prev => ({
      ...prev,
      giftRecipientLists: prev.giftRecipientLists.map(list =>
        list.id === listId ? { ...list, gifts: list.gifts.filter(item => item.id !== itemId) } : list
      ),
    }));
  }, [setAppData]);
  
  const processAISuggestionsForConfirmation = useCallback((
    aiSuggestions: SinglePersonGiftSuggestion[],
    fallbackListId?: string | null
  ): ProcessedAIResults => {
    const results: ProcessedAIResults = {
      giftsAddedDirectly: [],
      needsUserConfirmation: [],
    };

    setAppData(prev => {
      let currentGiftLists = [...prev.giftRecipientLists];
      const giftsToUpdate: Array<{ listIndex: number; giftsToAdd: GiftItem[] }> = [];

      for (const suggestion of aiSuggestions) {
        if (!suggestion.personName || !suggestion.gifts || suggestion.gifts.length === 0) {
          continue;
        }

        const existingListByName = currentGiftLists.find(l => l.personName === suggestion.personName);

        if (suggestion.isNewPersonCandidate && !existingListByName) {
          // AI flagged as new, and name doesn't match an existing list. Needs confirmation.
          results.needsUserConfirmation.push(suggestion);
        } else {
          // Either for an existing person, or AI didn't flag as new (or name matched existing anyway)
          let targetList = existingListByName;
          let targetListId = targetList?.id;

          if (!targetList && fallbackListId) {
            targetList = currentGiftLists.find(l => l.id === fallbackListId);
            targetListId = targetList?.id;
          }
          
          // Deep fallback if AI provided a name that should exist but wasn't found, and no fallback.
          // This shouldn't happen often with good prompting.
          if (!targetList && currentGiftLists.length > 0 && !suggestion.isNewPersonCandidate) {
             console.warn(`AI suggested gifts for '${suggestion.personName}' which was not found and not marked new. Attaching to first list as deep fallback.`);
             targetList = currentGiftLists[0];
             targetListId = targetList.id;
          }


          if (targetList && targetListId) {
            const listIndex = currentGiftLists.findIndex(l => l.id === targetListId);
            if (listIndex !== -1) {
              const newGiftItems: GiftItem[] = suggestion.gifts
                .filter(sg => sg.itemName && sg.itemName.trim() !== "")
                .map(sg => ({
                  id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
                  itemName: sg.itemName.trim(),
                  details: sg.details?.trim(),
                  status: GiftItemStatus.Idea,
                  isNew: true,
                  tags: [], // AI currently doesn't suggest tags
                  dateAdded: new Date().toISOString(),
                }));

              if (newGiftItems.length > 0) {
                 giftsToUpdate.push({ listIndex, giftsToAdd: newGiftItems });
                 results.giftsAddedDirectly.push({
                   listId: targetListId,
                   personName: targetList.personName,
                   giftsAddedCount: newGiftItems.length,
                 });
              }
            }
          } else if (!suggestion.isNewPersonCandidate) {
            // AI suggested for a non-new person, but we couldn't find a list.
            // This is an edge case; implies AI provided a non-existing personName without flagging as new.
            // Add to needsUserConfirmation as if it were new.
             console.warn(`AI suggested gifts for '${suggestion.personName}' which was not found and not flagged as new. Adding to user confirmation queue.`);
             results.needsUserConfirmation.push({...suggestion, isNewPersonCandidate: true}); // Force flag
          }
        }
      }
      
      // Apply direct additions
      giftsToUpdate.forEach(update => {
         currentGiftLists[update.listIndex] = {
              ...currentGiftLists[update.listIndex],
              gifts: [...update.giftsToAdd, ...currentGiftLists[update.listIndex].gifts],
            };
      });

      return { ...prev, giftRecipientLists: currentGiftLists };
    });
    return results;
  }, [setAppData]);

  const addConfirmedAIGifts = useCallback((listId: string, gifts: AISuggestedGiftItem[]) => {
    setAppData(prev => {
      const listIndex = prev.giftRecipientLists.findIndex(l => l.id === listId);
      if (listIndex === -1) return prev; // List not found

      const newGiftItems: GiftItem[] = gifts
        .filter(sg => sg.itemName && sg.itemName.trim() !== "")
        .map(sg => ({
          id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
          itemName: sg.itemName.trim(),
          details: sg.details?.trim(),
          status: GiftItemStatus.Idea,
          isNew: true,
          tags: [],
          dateAdded: new Date().toISOString(),
        }));

      if (newGiftItems.length === 0) return prev;

      const updatedLists = [...prev.giftRecipientLists];
      updatedLists[listIndex] = {
        ...updatedLists[listIndex],
        gifts: [...newGiftItems, ...updatedLists[listIndex].gifts],
      };
      return { ...prev, giftRecipientLists: updatedLists };
    });
  }, [setAppData]);


  // Settings Methods
  const exportData = useCallback((): AppData => appData, [appData]);

  const importData = useCallback((data: AppData) => {
    if (data && data.weightEntries && data.disneyCollection && data.giftRecipientLists && data.plateInventory && data.exerciseSettings && data.workoutSessions && data.utilitySettings) {
      setAppData(data);
    } else {
      alert("Invalid data format. Import failed.");
      console.error("Import failed: Invalid data format", data);
    }
  }, [setAppData]);

  const updateUtilitySetting = useCallback((utilityId: UtilityId, updates: Partial<UtilitySetting>) => {
    setAppData(prev => ({
      ...prev,
      utilitySettings: prev.utilitySettings.map(setting =>
        setting.id === utilityId ? { ...setting, ...updates } : setting
      ),
    }));
  }, [setAppData]);

  const getUtilitySetting = useCallback((utilityId: UtilityId): UtilitySetting | undefined => {
    return appData.utilitySettings.find(setting => setting.id === utilityId);
  }, [appData.utilitySettings]);


  // Workout Tracker Methods
  const updatePlateInventory = useCallback((updatedInventory: Plate[]) => {
    setAppData(prev => ({ ...prev, plateInventory: updatedInventory }));
  }, [setAppData]);

  const updateExerciseSetting = useCallback((lift: LiftType, setting: Partial<ExerciseSetting>) => {
    setAppData(prev => ({
      ...prev,
      exerciseSettings: {
        ...prev.exerciseSettings,
        [lift]: { ...(prev.exerciseSettings[lift] || getDefaultExerciseSettings()[lift]), ...setting },
      },
    }));
  }, [setAppData]);
  
  const addWorkoutSession = useCallback((session: WorkoutSession) => {
    setAppData(prevAppData => {
      const newSessions = [...prevAppData.workoutSessions, session].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const updatedSettings = {...prevAppData.exerciseSettings};
      let settingsChanged = false;

      session.exercises.forEach(exLog => {
        const allWorksetsPassed = exLog.sets
          .filter(s => s.type === 'workset')
          .every(s => s.status === 'completed');
        
        if (allWorksetsPassed && exLog.worksetWeight > (updatedSettings[exLog.lift]?.lastAchievedWorksetWeight || 0) ) {
          updatedSettings[exLog.lift] = {
            ...(updatedSettings[exLog.lift] || getDefaultExerciseSettings()[exLog.lift]),
            lastAchievedWorksetWeight: exLog.worksetWeight
          };
          settingsChanged = true;
        }
      });
      if (settingsChanged) {
        return { ...prevAppData, workoutSessions: newSessions, exerciseSettings: updatedSettings };
      }
      return { ...prevAppData, workoutSessions: newSessions};
    });
  }, [setAppData]);


  const getLastWorkoutSession = useCallback((workoutDefinitionName?: string): WorkoutSession | undefined => {
    const sortedSessions = [...appData.workoutSessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (workoutDefinitionName) {
      return sortedSessions.find(s => s.workoutDefinitionName === workoutDefinitionName);
    }
    return sortedSessions[0]; // Returns the absolute last session if no name specified
  }, [appData.workoutSessions]);

  const getAllWorkoutSessions = useCallback((): WorkoutSession[] => {
    return [...appData.workoutSessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [appData.workoutSessions]);
  
  const getProposedWorksetWeight = useCallback((lift: LiftType): number => {
    const setting = appData.exerciseSettings[lift];
    if (!setting) return BAR_WEIGHT; 
    
    let incrementAmount = setting.progressionIncrement;
    const sessionsWithLift = appData.workoutSessions
        .filter(ws => ws.exercises.some(e => e.lift === lift))
        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (sessionsWithLift.length > 0) {
        const lastSessionWithLift = sessionsWithLift[0];
        const exerciseLogForLift = lastSessionWithLift.exercises.find(e => e.lift === lift);
        if (exerciseLogForLift) {
            const worksets = exerciseLogForLift.sets.filter(s => s.type === 'workset');
            const allWorksetsCompleted = worksets.every(s => s.status === 'completed');
            if (!allWorksetsCompleted && worksets.length > 0) { 
                incrementAmount = 0; 
            }
        }
    }
    
    const idealTargetWeight = setting.lastAchievedWorksetWeight + incrementAmount;
    return findClosestLoadableWeight(idealTargetWeight, appData.plateInventory, BAR_WEIGHT);

  }, [appData.exerciseSettings, appData.workoutSessions, appData.plateInventory]);

  const generateSetsForExercise = useCallback((
    exerciseDef: WorkoutExerciseDefinition, 
    proposedWorksetWeight: number,
    previousPlateConfig?: PlateCombination
  ): { exerciseLog: ExerciseLog, nextPlateConfig?: PlateCombination} => {
    const sets: SetDetails[] = [];
    let runningPlateConfig = previousPlateConfig;
    const WARMUP_ROUNDING_INCREMENT = 5; // kg

    const calculateRoundedWarmupTarget = (percentage: number, baseWeight: number): number => {
      const percentWeight = baseWeight * percentage;
      const roundedUpWeight = Math.ceil(percentWeight / WARMUP_ROUNDING_INCREMENT) * WARMUP_ROUNDING_INCREMENT;
      return Math.max(BAR_WEIGHT, roundedUpWeight);
    };

    // --- WARMUP SETS ---
    // Set 1 & 2: Empty Bar
    [1,2].forEach(i => {
        const actualWeight = findClosestLoadableWeight(BAR_WEIGHT, appData.plateInventory, BAR_WEIGHT);
        const plateConfig = calculateBestPlateCombination(actualWeight, appData.plateInventory, BAR_WEIGHT, runningPlateConfig);
        sets.push({
            id: `${exerciseDef.lift}-warmup-bar-${i}-${Date.now()}${Math.random()}`,
            type: 'warmup',
            targetWeight: BAR_WEIGHT, 
            actualWeight: actualWeight,
            targetReps: 5,
            status: 'pending',
            plateConfiguration: plateConfig ?? undefined,
        });
        if (plateConfig) runningPlateConfig = plateConfig;
    });

    // Determine subsequent warmup sets
    const target40pct = calculateRoundedWarmupTarget(0.4, proposedWorksetWeight);
    const actualWeightForSet3Target = target40pct < 25 ? 25 : target40pct;
    const actualWeightForSet3 = findClosestLoadableWeight(actualWeightForSet3Target, appData.plateInventory, BAR_WEIGHT);


    if (target40pct < 25) { // Special rule: 3 loaded warmups (25kg, Midpoint, ~90%)
        // Set 3: 25kg target
        let plateConfigS3 = calculateBestPlateCombination(actualWeightForSet3, appData.plateInventory, BAR_WEIGHT, runningPlateConfig);
        sets.push({
            id: `${exerciseDef.lift}-warmup-special-25kg-${Date.now()}${Math.random()}`,
            type: 'warmup', targetWeight: actualWeightForSet3Target, actualWeight: actualWeightForSet3, targetReps: 5, status: 'pending', plateConfiguration: plateConfigS3 ?? undefined,
        });
        if (plateConfigS3) runningPlateConfig = plateConfigS3;

        // For Set 5 (last warmup): ~90% target
        const targetS5SpecialLastWarmup = calculateRoundedWarmupTarget(0.9, proposedWorksetWeight);
        const actualS5SpecialLastWarmup = findClosestLoadableWeight(targetS5SpecialLastWarmup, appData.plateInventory, BAR_WEIGHT);

        // Set 4: Midpoint between actual Set 3 and actual Set 5 (based on ~90%)
        const midpointTarget = actualWeightForSet3 + (actualS5SpecialLastWarmup - actualWeightForSet3) / 2;
        const actualS4Midpoint = findClosestLoadableWeight(midpointTarget, appData.plateInventory, BAR_WEIGHT);
        let plateConfigS4 = calculateBestPlateCombination(actualS4Midpoint, appData.plateInventory, BAR_WEIGHT, runningPlateConfig);
        sets.push({
            id: `${exerciseDef.lift}-warmup-special-midpoint-${Date.now()}${Math.random()}`,
            type: 'warmup', targetWeight: midpointTarget, actualWeight: actualS4Midpoint, targetReps: 3, status: 'pending', plateConfiguration: plateConfigS4 ?? undefined,
        });
        if (plateConfigS4) runningPlateConfig = plateConfigS4;
        
        // Add Set 5 (the ~90% set)
        let plateConfigS5 = calculateBestPlateCombination(actualS5SpecialLastWarmup, appData.plateInventory, BAR_WEIGHT, runningPlateConfig);
        sets.push({
            id: `${exerciseDef.lift}-warmup-special-90pct-${Date.now()}${Math.random()}`,
            type: 'warmup', targetWeight: targetS5SpecialLastWarmup, actualWeight: actualS5SpecialLastWarmup, targetReps: 2, status: 'pending', plateConfiguration: plateConfigS5 ?? undefined,
        });
        if (plateConfigS5) runningPlateConfig = plateConfigS5;

    } else { // Standard 3 loaded warmups (~40%, ~60%, ~80%)
        const warmupTargets = [
          target40pct,
          calculateRoundedWarmupTarget(0.6, proposedWorksetWeight),
          calculateRoundedWarmupTarget(0.8, proposedWorksetWeight)
        ];
        const warmupReps = [5, 3, 2];
        const idSuffixes = ['40pct', '60pct', '80pct'];


        warmupTargets.forEach((targetWeight, index) => {
            const actualWeight = findClosestLoadableWeight(targetWeight, appData.plateInventory, BAR_WEIGHT);
            const plateConfig = calculateBestPlateCombination(actualWeight, appData.plateInventory, BAR_WEIGHT, runningPlateConfig);
            sets.push({
                id: `${exerciseDef.lift}-warmup-std-${idSuffixes[index]}-${Date.now()}${Math.random()}`,
                type: 'warmup',
                targetWeight: targetWeight, 
                actualWeight: actualWeight,
                targetReps: warmupReps[index],
                status: 'pending',
                plateConfiguration: plateConfig ?? undefined,
            });
            if (plateConfig) runningPlateConfig = plateConfig;
        });
    }
    
    // --- WORKSETS ---
    const actualLoadableWorksetWeight = proposedWorksetWeight; 
    for (let i = 0; i < exerciseDef.worksetSets; i++) {
      const plateConfig = calculateBestPlateCombination(actualLoadableWorksetWeight, appData.plateInventory, BAR_WEIGHT, runningPlateConfig);
      sets.push({
        id: `${exerciseDef.lift}-workset-${i}-${Date.now()}${Math.random()}`,
        type: 'workset',
        targetWeight: proposedWorksetWeight, 
        actualWeight: actualLoadableWorksetWeight,
        targetReps: exerciseDef.worksetReps,
        status: 'pending',
        plateConfiguration: plateConfig ?? undefined,
      });
       if (plateConfig) runningPlateConfig = plateConfig;
    }

    return {
      exerciseLog: {
        lift: exerciseDef.lift,
        worksetWeight: actualLoadableWorksetWeight, 
        sets,
      },
      nextPlateConfig: runningPlateConfig
    };
  }, [appData.plateInventory, appData.exerciseSettings]);

  const getAvailableWorkoutDefinitions = useCallback((): WorkoutDefinition[] => {
    return WORKOUT_DEFINITIONS;
  }, []);


  return (
    <AppDataContext.Provider value={{
      weightEntries: appData.weightEntries, addWeightEntry, updateWeightEntry, deleteWeightEntry,
      disneyCollection: appData.disneyCollection, updateDisneyOwnedStatus, getDisneyOwnedStatus,
      giftRecipientLists: appData.giftRecipientLists, addGiftRecipientList, deleteGiftRecipientList, updateGiftRecipientListName, updateGiftRecipientListKnowledge, addGiftItem, updateGiftItem, deleteGiftItem, processAISuggestionsForConfirmation, addConfirmedAIGifts,
      exportData, importData, utilitySettings: appData.utilitySettings, updateUtilitySetting, getUtilitySetting,
      // Workout Tracker
      plateInventory: appData.plateInventory, updatePlateInventory,
      exerciseSettings: appData.exerciseSettings, updateExerciseSetting,
      workoutSessions: appData.workoutSessions, addWorkoutSession, getLastWorkoutSession, getAllWorkoutSessions,
      getProposedWorksetWeight, generateSetsForExercise, getAvailableWorkoutDefinitions,
    }}>
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
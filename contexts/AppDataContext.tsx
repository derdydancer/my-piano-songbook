
import React, { createContext, useContext, ReactNode, useCallback, useEffect } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { AppData, UtilitySetting, UtilityId, SavedPianoSong, SavedUniqueChordDefinition, ChordSimplificationOption } from '../types';
import { DEFAULT_UTILITY_SETTINGS, UTILITY_IDS } from '../constants'; 
import { AI_STUDIO_SAMPLE_DATA } from '../sampleData'; 

// Import initial data slices and action creators from utility-specific modules
import { initialPianoHelperData, createPianoHelperActions, PianoHelperActions } from '../features/piano-helper/pianoHelper.data';
import { initialSongbookData, createSongbookActions, SongbookActions } from '../features/songbook/songbook.data';

import { generateChordVoicings, normalizeNoteToSharp, getNoteMidiValue } from '../features/piano-helper/pianoHelper.utils'; // For piano migration


// Define the core context type for global actions and state
interface AppDataCoreContextType {
  exportData: () => AppData;
  importData: (data: AppData) => boolean;
  loadSampleData: () => void;
  utilitySettings: UtilitySetting[];
  updateUtilitySetting: (utilityId: UtilityId, updates: Partial<UtilitySetting>) => void;
  getUtilitySetting: (utilityId: UtilityId) => UtilitySetting | undefined;
  savedPianoSongs: SavedPianoSong[];
}

// Combine core context type with all utility-specific action types
export type AppDataContextType = AppDataCoreContextType &
  PianoHelperActions &
  SongbookActions;

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

// Combine initial data from all utility modules
const initialAppData: AppData = {
  ...initialPianoHelperData, 
  ...initialSongbookData, 
  utilitySettings: DEFAULT_UTILITY_SETTINGS,
};


export const AppDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const getInitialStateForLocalStorage = (): AppData => {
    try {
      const item = window.localStorage.getItem('myUtilitiesHubData');
      if (item) {
        if (item.startsWith('{') && item.endsWith('}')) {
           const parsedData = JSON.parse(item) as AppData;
           // Simplified check for core data
           if (parsedData.utilitySettings && parsedData.savedPianoSongs !== undefined) { 
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

    // Utility Settings Migration/Initialization
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
                for (const key in defaultSetting) {
                    if ((defaultSetting as any)[key] !== (existingSetting as any)[key]) {
                        if (!(key in existingSetting) || (defaultSetting as any)[key] !== (existingSetting as any)[key]) {
                           needsUpdate = true;
                           break;
                        }
                    }
                }
                 if(!needsUpdate && Object.keys(existingSetting).length !== Object.keys(updatedExistingSetting).length){
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
    
    // Piano Songs Migration/Initialization
    if (tempAppData.savedPianoSongs === undefined) {
      tempAppData.savedPianoSongs = initialPianoHelperData.savedPianoSongs;
      dataChanged = true;
    } else {
      let pianoSongsMigrationNeeded = false;
      tempAppData.savedPianoSongs.forEach(song => {
        if (song.analysisResult && song.analysisResult.uniqueChords) {
          song.analysisResult.uniqueChords = song.analysisResult.uniqueChords.map((chord: any) => {
            const migratedChord: Partial<SavedUniqueChordDefinition> = { ...chord };
            let chordSpecificMigration = false;

            if (chord.notes && !migratedChord.aiSuggestedNotes) {
                migratedChord.aiSuggestedNotes = (chord.notes as string[]).map(normalizeNoteToSharp);
                delete (migratedChord as any).notes;
                chordSpecificMigration = true;
            }
            if (!migratedChord.aiSuggestedNotes) {
                migratedChord.aiSuggestedNotes = []; // Ensure it's an array
                chordSpecificMigration = true;
            } else { // Ensure all notes within aiSuggestedNotes are normalized
                const normalizedAiNotes = migratedChord.aiSuggestedNotes.map(normalizeNoteToSharp);
                if (JSON.stringify(normalizedAiNotes) !== JSON.stringify(migratedChord.aiSuggestedNotes)) {
                    migratedChord.aiSuggestedNotes = normalizedAiNotes;
                    chordSpecificMigration = true;
                }
            }


            if (!migratedChord.simplificationOptions || migratedChord.simplificationOptions.length === 0) {
                const { voicings: originalVoicings, targetVoicingIndex: aiVoicingIdxInSortedList } = generateChordVoicings(
                    migratedChord.aiSuggestedNotes, // baseNotesInput
                    undefined, // minMidi
                    undefined, // maxMidi
                    migratedChord.aiSuggestedNotes  // targetVoicingToFind
                );
                const effectiveInitialVoicingIndex = aiVoicingIdxInSortedList !== -1 ? aiVoicingIdxInSortedList : 0;

                const originalOption: ChordSimplificationOption = {
                    name: `Original (${migratedChord.chordName || 'Chord'})`,
                    baseNotes: [...migratedChord.aiSuggestedNotes!].sort((a,b) => (getNoteMidiValue(a) ?? 0) - (getNoteMidiValue(b) ?? 0)),
                    allVoicings: originalVoicings.length > 0 ? originalVoicings : (migratedChord.aiSuggestedNotes!.length > 0 ? [[...migratedChord.aiSuggestedNotes!]] : []),
                    isOriginal: true,
                    lastSelectedVoicingIndex: effectiveInitialVoicingIndex,
                };
                migratedChord.simplificationOptions = [originalOption];
                migratedChord.selectedSimplificationName = originalOption.name;
                migratedChord.selectedVoicingIndex = effectiveInitialVoicingIndex;
                chordSpecificMigration = true;
            } else {
                 migratedChord.simplificationOptions = migratedChord.simplificationOptions.map(opt => {
                    let optChanged = false;
                    if (opt.lastSelectedVoicingIndex === undefined) {
                        // If it's the original option and selected, its lastSelectedVoicingIndex should be the chord's selectedVoicingIndex
                        if (opt.isOriginal && migratedChord.selectedSimplificationName === opt.name) {
                            opt.lastSelectedVoicingIndex = migratedChord.selectedVoicingIndex;
                        } else {
                           // For other simplifications, if no memory, it remains undefined or we could try to find a match.
                           // For now, keeping it undefined unless actively chosen.
                           opt.lastSelectedVoicingIndex = undefined; 
                        }
                        optChanged = true;
                    }
                    if (opt.allVoicings.length === 0 && opt.baseNotes.length > 0) {
                        const { voicings: newVoicings, targetVoicingIndex: newTargetIdx } = generateChordVoicings(
                            opt.baseNotes, 
                            undefined, 
                            undefined,
                            opt.isOriginal ? migratedChord.aiSuggestedNotes : undefined // Try to find AI suggestion if it's the original option
                        );
                        opt.allVoicings = newVoicings.length > 0 ? newVoicings : [[...opt.baseNotes]];
                        if (opt.isOriginal && opt.lastSelectedVoicingIndex === undefined) { // If original's memory was just set
                            opt.lastSelectedVoicingIndex = newTargetIdx !== -1 ? newTargetIdx : 0;
                        }
                        optChanged = true;
                    }
                    if (optChanged) pianoSongsMigrationNeeded = true;
                    return opt;
                });
            }
            
            if (migratedChord.selectedSimplificationName === undefined && migratedChord.simplificationOptions?.[0]) {
                migratedChord.selectedSimplificationName = migratedChord.simplificationOptions[0].name;
                chordSpecificMigration = true;
            }
            if (migratedChord.selectedVoicingIndex === undefined) {
                // If selectedVoicingIndex became undefined, try to re-select based on lastSelectedVoicingIndex of the current simplification
                const currentSimpl = migratedChord.simplificationOptions?.find(opt => opt.name === migratedChord.selectedSimplificationName);
                if (currentSimpl && currentSimpl.lastSelectedVoicingIndex !== undefined && currentSimpl.lastSelectedVoicingIndex < currentSimpl.allVoicings.length) {
                    migratedChord.selectedVoicingIndex = currentSimpl.lastSelectedVoicingIndex;
                } else {
                    migratedChord.selectedVoicingIndex = 0; // Fallback
                }
                chordSpecificMigration = true;
            }

            const selectedSimpl = migratedChord.simplificationOptions?.find(opt => opt.name === migratedChord.selectedSimplificationName);
            if (selectedSimpl && selectedSimpl.allVoicings && (migratedChord.selectedVoicingIndex! < 0 || migratedChord.selectedVoicingIndex! >= selectedSimpl.allVoicings.length)) {
                 if (selectedSimpl.allVoicings.length > 0) {
                    migratedChord.selectedVoicingIndex = 0;
                 } else {
                    // This case should ideally not happen if allVoicings is guaranteed to have at least one item if baseNotes exist
                    migratedChord.selectedVoicingIndex = 0; 
                 }
                chordSpecificMigration = true;
            }

            if (chordSpecificMigration) pianoSongsMigrationNeeded = true;
            return migratedChord as SavedUniqueChordDefinition;
          });
        } else if (song.analysisResult && !song.analysisResult.uniqueChords) {
           song.analysisResult.uniqueChords = [];
           pianoSongsMigrationNeeded = true;
        }
      });
      if (pianoSongsMigrationNeeded) dataChanged = true;
    }

    if (dataChanged) {
      console.log("App data migrated/updated:", tempAppData);
      setAppData(tempAppData);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const exportData = useCallback((): AppData => appData, [appData]);

  const importData = useCallback((data: AppData): boolean => {
    if (data && data.utilitySettings !== undefined && data.savedPianoSongs !== undefined) {
      const completeImportData = { ...initialAppData, ...data };
      setAppData(completeImportData); 
      return true;
    } else {
      console.error("Import failed: Invalid data format for Piano/Songbook app.", data);
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

  const pianoHelperActions = createPianoHelperActions(setAppData, getAppDataForActions);
  const songbookActions = createSongbookActions(setAppData, getAppDataForActions);

  const contextValue: AppDataContextType = {
    exportData,
    importData,
    loadSampleData,
    utilitySettings: appData.utilitySettings,
    updateUtilitySetting,
    getUtilitySetting,
    savedPianoSongs: appData.savedPianoSongs, 
    ...pianoHelperActions,
    ...songbookActions,
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

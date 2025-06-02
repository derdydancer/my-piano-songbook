
import { AppData } from '../../types';

// Guitar Tuner currently doesn't store persistent data in AppData.
// This structure is for consistency.
export const initialGuitarTunerData = {
  // guitarTunerSettings: {}, // Example if we had specific tuner settings
};

export type GuitarTunerActions = ReturnType<typeof createGuitarTunerActions>;

export const createGuitarTunerActions = (
  setAppData: React.Dispatch<React.SetStateAction<AppData>>,
  getAppData: () => AppData
) => {
  return {
    // No actions that modify global AppData are needed for GuitarTuner yet.
    // Placeholder for future actions if any.
    // exampleAction: () => {
    //   console.log("GuitarTuner action called");
    // },
  };
};

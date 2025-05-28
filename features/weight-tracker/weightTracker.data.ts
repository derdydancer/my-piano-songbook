
import { AppData, WeightEntry } from '../../types';

export const initialWeightTrackerData = {
  weightEntries: [] as WeightEntry[],
};

export type WeightTrackerActions = ReturnType<typeof createWeightTrackerActions>;

export const createWeightTrackerActions = (
  setAppData: React.Dispatch<React.SetStateAction<AppData>>,
  getAppData: () => AppData 
) => ({
  // Weight Tracker Methods
  addWeightEntry: (entry: Omit<WeightEntry, 'id'>) => {
    const newEntry: WeightEntry = { ...entry, id: Date.now().toString() };
    setAppData(prev => ({ 
      ...prev, 
      weightEntries: [...prev.weightEntries, newEntry].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()) 
    }));
  },
  updateWeightEntry: (updatedEntry: WeightEntry) => {
    setAppData(prev => ({
      ...prev,
      weightEntries: prev.weightEntries.map(entry => 
        entry.id === updatedEntry.id ? updatedEntry : entry
      ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    }));
  },
  deleteWeightEntry: (id: string) => {
    setAppData(prev => ({ 
      ...prev, 
      weightEntries: prev.weightEntries.filter(entry => entry.id !== id) 
    }));
  },
  // You can add a getter here if pages need direct access to sorted entries,
  // though often this is derived in the component via useMemo.
  // getSortedWeightEntries: () => {
  //   const appData = getAppData();
  //   return [...appData.weightEntries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  // },
});

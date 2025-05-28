
import { AppData, DisneyOwnedStatus } from '../../types';
import { DISNEY_ANIMATED_CLASSICS } from './disneyCollection.constants';

export const initialDisneyCollectionData = {
  disneyCollection: DISNEY_ANIMATED_CLASSICS.map(classic => ({ 
    classicId: classic.id, 
    ownedDvd: false, 
    ownedBluRay: false 
  })) as DisneyOwnedStatus[],
};

export type DisneyCollectionActions = ReturnType<typeof createDisneyCollectionActions>;

export const createDisneyCollectionActions = (
  setAppData: React.Dispatch<React.SetStateAction<AppData>>,
  getAppData: () => AppData
) => ({
  // Disney Collection Methods
  updateDisneyOwnedStatus: (classicId: number, type: 'dvd' | 'bluray', owned: boolean) => {
    setAppData(prev => ({
      ...prev,
      disneyCollection: prev.disneyCollection.map(item =>
        item.classicId === classicId
          ? { ...item, [type === 'dvd' ? 'ownedDvd' : 'ownedBluRay']: owned }
          : item
      ),
    }));
  },
  getDisneyOwnedStatus: (classicId: number): DisneyOwnedStatus | undefined => {
    const appData = getAppData();
    return appData.disneyCollection.find(item => item.classicId === classicId);
  },
});

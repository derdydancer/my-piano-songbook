
import React, { useState, useMemo } from 'react';
import { useAppData } from '../../contexts/AppDataContext';
import { DISNEY_ANIMATED_CLASSICS } from './disneyCollection.constants'; // Corrected import path
import { DisneyClassic, DisneyOwnedStatus } from '../../types';
import { CheckCircleIcon, XCircleIcon } from '../../components/common/Icons';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button'; // Added for filter buttons

type FilterState = 'all' | 'owned' | 'unowned';

const DisneyTitleItem: React.FC<{
  classic: DisneyClassic;
  status: DisneyOwnedStatus | undefined;
  onUpdate: (classicId: number, type: 'dvd' | 'bluray', owned: boolean) => void;
}> = ({ classic, status, onUpdate }) => {
  const ownedDvd = status?.ownedDvd ?? false;
  const ownedBluRay = status?.ownedBluRay ?? false;

  return (
    <li className="bg-card p-4 rounded-lg shadow flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
      <div>
        <h3 className="font-semibold text-textPrimary">{classic.id}. {classic.title}</h3>
        <p className="text-sm text-textSecondary">{classic.year}</p>
      </div>
      <div className="flex space-x-2 sm:space-x-4">
        {(['dvd', 'bluray'] as const).map(format => (
          <Button
            key={format}
            onClick={() => onUpdate(classic.id, format, format === 'dvd' ? !ownedDvd : !ownedBluRay)}
            variant="ghost"
            size="sm"
            className={`
              ${(format === 'dvd' && ownedDvd) || (format === 'bluray' && ownedBluRay)
                ? 'bg-green-100 dark:bg-green-700 text-green-700 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-600'
                : 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-500'}`}
          >
            {(format === 'dvd' && ownedDvd) || (format === 'bluray' && ownedBluRay)
              ? <CheckCircleIcon className="w-4 h-4 mr-1" />
              : <XCircleIcon className="w-4 h-4 mr-1 opacity-50" />}
            {format.toUpperCase()}
          </Button>
        ))}
      </div>
    </li>
  );
};

const DisneyCollectionPage: React.FC = () => {
  const { disneyCollection, updateDisneyOwnedStatus, getDisneyOwnedStatus } = useAppData();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterState, setFilterState] = useState<FilterState>('all');

  const filteredClassics = useMemo(() => {
    return DISNEY_ANIMATED_CLASSICS.filter(classic => {
      const matchesSearch = classic.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            classic.year.toString().includes(searchTerm);
      if (!matchesSearch) return false;

      const status = getDisneyOwnedStatus(classic.id);
      const isOwned = status?.ownedDvd || status?.ownedBluRay;

      if (filterState === 'owned') return isOwned;
      if (filterState === 'unowned') return !isOwned;
      return true; // 'all'
    });
  }, [searchTerm, filterState, getDisneyOwnedStatus]);
  
  const totalOwned = disneyCollection.filter(s => s.ownedBluRay || s.ownedDvd).length;
  const totalDvds = disneyCollection.filter(s => s.ownedDvd).length;
  const totalBluRays = disneyCollection.filter(s => s.ownedBluRay).length;


  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold text-textPrimary">Disney Classics Collection</h1>
      
      <div className="bg-card p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold text-textPrimary mb-2">Collection Stats</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
          <p>Total Owned: <span className="font-bold text-primary">{totalOwned} / {DISNEY_ANIMATED_CLASSICS.length}</span></p>
          <p>DVDs: <span className="font-bold text-primary">{totalDvds}</span></p>
          <p>Blu-rays: <span className="font-bold text-primary">{totalBluRays}</span></p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 items-center">
        <div className="flex space-x-1 p-0.5 bg-gray-200 dark:bg-gray-700 rounded-md">
          {(['all', 'owned', 'unowned'] as FilterState[]).map(state => (
            <Button
              key={state}
              onClick={() => setFilterState(state)}
              size="sm"
              className={`capitalize ${filterState === state ? 'bg-primary text-white' : 'bg-transparent text-textSecondary hover:bg-gray-300 dark:hover:bg-gray-600'}`}
            >
              {state}
            </Button>
          ))}
        </div>
        <Input
          type="text"
          placeholder="Search by title or year..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          containerClassName="mb-0 flex-grow w-full sm:w-auto"
        />
      </div>


      {filteredClassics.length > 0 ? (
        <ul className="space-y-3">
          {filteredClassics.map(classic => (
            <DisneyTitleItem
              key={classic.id}
              classic={classic}
              status={getDisneyOwnedStatus(classic.id)}
              onUpdate={updateDisneyOwnedStatus}
            />
          ))}
        </ul>
      ) : (
        <p className="text-center text-textSecondary py-8">No classics found matching your criteria.</p>
      )}
    </div>
  );
};

export default DisneyCollectionPage;
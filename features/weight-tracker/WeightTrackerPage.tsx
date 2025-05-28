import React, { useState, useMemo } from 'react';
import { useAppData } from '../../contexts/AppDataContext';
import { WeightEntry } from '../../types';
import Button from '../../components/common/Button';
import Select from '../../components/common/Select';
import { PlusCircleIcon } from '../../components/common/Icons';
import WeightFormModal from './WeightFormModal';
import WeightHistoryList from './WeightHistoryList';
import WeightChart from './WeightChart';
import WeightStats from './WeightStats';
import ConfirmationModal from '../../components/common/ConfirmationModal';

type IntervalKey = 'all' | '30d' | '90d' | '180d' | '365d';
const INTERVAL_OPTIONS: Array<{ value: IntervalKey, label: string }> = [
  { value: 'all', label: 'All Time' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: '180d', label: 'Last 6 Months' },
  { value: '365d', label: 'Last Year' },
];

const calculateAverageMonthlyChange = (entries: WeightEntry[], intervalDays?: number): string => {
  if (entries.length < 2) return "Not enough data";

  let filteredEntries = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (intervalDays) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - intervalDays);
    filteredEntries = filteredEntries.filter(entry => new Date(entry.date) >= cutoffDate);
  }

  if (filteredEntries.length < 2) return "Not enough data for this interval";

  const firstEntry = filteredEntries[0];
  const lastEntry = filteredEntries[filteredEntries.length - 1];

  const totalWeightChange = lastEntry.weight - firstEntry.weight;
  const firstDate = new Date(firstEntry.date);
  const lastDate = new Date(lastEntry.date);

  const diffTime = Math.abs(lastDate.getTime() - firstDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 1) return "Interval too short"; // Avoid division by zero or near-zero

  const monthsInInterval = diffDays / 30.4375; // Average days in a month

  if (monthsInInterval < (1/30.4375)) return "Interval too short"; // e.g. less than a day

  const averageChangePerMonth = totalWeightChange / monthsInInterval;

  return `${averageChangePerMonth > 0 ? '+' : ''}${averageChangePerMonth.toFixed(1)} kg/month`;
};


const WeightTrackerPage: React.FC = () => {
  const { weightEntries, addWeightEntry, updateWeightEntry, deleteWeightEntry } = useAppData();
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WeightEntry | undefined>(undefined);
  
  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
  const [entryToDeleteId, setEntryToDeleteId] = useState<string | null>(null);
  const [selectedInterval, setSelectedInterval] = useState<IntervalKey>('all');

  const openAddModal = () => {
    setEditingEntry(undefined);
    setIsFormModalOpen(true);
  };

  const openEditModal = (entry: WeightEntry) => {
    setEditingEntry(entry);
    setIsFormModalOpen(true);
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setEditingEntry(undefined);
  };

  const handleSaveEntry = (entryData: Omit<WeightEntry, 'id'> | WeightEntry) => {
    if ('id' in entryData) {
      updateWeightEntry(entryData);
    } else {
      addWeightEntry(entryData);
    }
    closeFormModal();
  };

  const requestDeleteEntry = (id: string) => {
    setEntryToDeleteId(id);
    setIsConfirmDeleteModalOpen(true);
  };

  const confirmDeleteEntry = () => {
    if (entryToDeleteId) {
      deleteWeightEntry(entryToDeleteId);
    }
    setIsConfirmDeleteModalOpen(false);
    setEntryToDeleteId(null);
  };
  
  const sortedEntries = React.useMemo(() => 
    [...weightEntries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [weightEntries]
  );

  const averageMonthlyChangeText = useMemo(() => {
    const intervalMap: Record<IntervalKey, number | undefined> = {
      'all': undefined,
      '30d': 30,
      '90d': 90,
      '180d': 180,
      '365d': 365,
    };
    return calculateAverageMonthlyChange(sortedEntries, intervalMap[selectedInterval]);
  }, [sortedEntries, selectedInterval]);

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-textPrimary">Weight Tracker</h1>
        <Button onClick={openAddModal} leftIcon={<PlusCircleIcon className="w-5 h-5" />}>
          Add Weight
        </Button>
      </div>

      {sortedEntries.length > 0 && (
        <>
          <WeightStats entries={sortedEntries} />
          <div className="bg-card p-4 rounded-lg shadow">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-3">
              <h2 className="text-xl font-semibold text-textPrimary mb-2 sm:mb-0">Trend Analysis</h2>
              <Select
                options={INTERVAL_OPTIONS}
                value={selectedInterval}
                onChange={(e) => setSelectedInterval(e.target.value as IntervalKey)}
                containerClassName="mb-0 sm:w-48"
                className="text-sm"
              />
            </div>
            <p className="text-sm text-textSecondary mb-1">
              Avg. Monthly Change ({INTERVAL_OPTIONS.find(opt => opt.value === selectedInterval)?.label}): 
              <span className="font-semibold text-primary ml-1">{averageMonthlyChangeText}</span>
            </p>
            <WeightChart entries={sortedEntries} />
          </div>
        </>
      )}

      <WeightHistoryList
        entries={sortedEntries} // Already sorted by date ascending for chart, history list sorts descending
        onEdit={openEditModal}
        onDelete={requestDeleteEntry}
      />
      
      {sortedEntries.length === 0 && (
        <div className="text-center py-10 text-textSecondary">
          <p>No weight entries yet.</p>
          <p>Click "Add Weight" to get started!</p>
        </div>
      )}

      <WeightFormModal
        isOpen={isFormModalOpen}
        onClose={closeFormModal}
        onSave={handleSaveEntry}
        existingEntry={editingEntry}
      />
      
      <ConfirmationModal
        isOpen={isConfirmDeleteModalOpen}
        onClose={() => setIsConfirmDeleteModalOpen(false)}
        onConfirm={confirmDeleteEntry}
        title="Delete Weight Entry"
        message="Are you sure you want to delete this weight entry? This action cannot be undone."
        confirmText="Delete"
        confirmButtonVariant="danger"
      />
    </div>
  );
};

export default WeightTrackerPage;
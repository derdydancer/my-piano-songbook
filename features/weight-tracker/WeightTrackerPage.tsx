
import React, { useState } from 'react';
import { useAppData } from '../../contexts/AppDataContext';
import { WeightEntry } from '../../types';
import Button from '../../components/common/Button';
import { PlusCircleIcon, PencilIcon, TrashIcon } from '../../components/common/Icons';
import WeightFormModal from './WeightFormModal';
import WeightHistoryList from './WeightHistoryList';
import WeightChart from './WeightChart';
import WeightStats from './WeightStats';

const WeightTrackerPage: React.FC = () => {
  const { weightEntries, addWeightEntry, updateWeightEntry, deleteWeightEntry } = useAppData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WeightEntry | undefined>(undefined);

  const openAddModal = () => {
    setEditingEntry(undefined);
    setIsModalOpen(true);
  };

  const openEditModal = (entry: WeightEntry) => {
    setEditingEntry(entry);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEntry(undefined);
  };

  const handleSaveEntry = (entryData: Omit<WeightEntry, 'id'> | WeightEntry) => {
    if ('id' in entryData) {
      updateWeightEntry(entryData);
    } else {
      addWeightEntry(entryData);
    }
    closeModal();
  };

  const handleDeleteEntry = (id: string) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      deleteWeightEntry(id);
    }
  };
  
  const sortedEntries = React.useMemo(() => 
    [...weightEntries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [weightEntries]
  );

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
             <h2 className="text-xl font-semibold text-textPrimary mb-2">Weight Trend</h2>
            <WeightChart entries={sortedEntries} />
          </div>
        </>
      )}

      <WeightHistoryList
        entries={sortedEntries}
        onEdit={openEditModal}
        onDelete={handleDeleteEntry}
      />
      
      {sortedEntries.length === 0 && (
        <div className="text-center py-10 text-textSecondary">
          <p>No weight entries yet.</p>
          <p>Click "Add Weight" to get started!</p>
        </div>
      )}

      <WeightFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={handleSaveEntry}
        existingEntry={editingEntry}
      />
    </div>
  );
};

export default WeightTrackerPage;

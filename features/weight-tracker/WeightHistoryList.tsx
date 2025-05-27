
import React from 'react';
import { WeightEntry } from '../../types';
import Button from '../../components/common/Button';
import { PencilIcon, TrashIcon } from '../../components/common/Icons';

interface WeightHistoryListProps {
  entries: WeightEntry[];
  onEdit: (entry: WeightEntry) => void;
  onDelete: (id: string) => void;
}

const WeightHistoryList: React.FC<WeightHistoryListProps> = ({ entries, onEdit, onDelete }) => {
  if (entries.length === 0) {
    return null; // No history to show, parent component will handle empty state message
  }
  
  // Display entries in reverse chronological order (newest first)
  const displayEntries = [...entries].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="bg-card p-4 rounded-lg shadow">
      <h2 className="text-xl font-semibold text-textPrimary mb-3">Weight History</h2>
      <ul className="space-y-3">
        {displayEntries.map(entry => (
          <li key={entry.id} className="p-3 bg-background dark:bg-gray-700 rounded-md shadow-sm flex justify-between items-center">
            <div>
              <p className="font-medium text-textPrimary">
                {new Date(entry.date).toLocaleDateString()} - <span className="text-lg text-primary">{entry.weight}</span> <span className="text-sm text-textSecondary">kg/lbs</span>
              </p>
              {entry.notes && <p className="text-sm text-textSecondary mt-1">{entry.notes}</p>}
            </div>
            <div className="space-x-2 flex-shrink-0">
              <Button variant="ghost" size="sm" onClick={() => onEdit(entry)} aria-label="Edit">
                <PencilIcon className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onDelete(entry.id)} aria-label="Delete">
                <TrashIcon className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default WeightHistoryList;

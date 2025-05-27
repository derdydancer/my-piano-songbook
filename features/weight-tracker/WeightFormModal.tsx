
import React, { useState, useEffect } from 'react';
import Modal from '../../components/Modal';
import Input from '../../components/common/Input';
import TextArea from '../../components/common/TextArea';
import Button from '../../components/common/Button';
import { WeightEntry } from '../../types';

interface WeightFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: Omit<WeightEntry, 'id'> | WeightEntry) => void;
  existingEntry?: WeightEntry;
}

const WeightFormModal: React.FC<WeightFormModalProps> = ({ isOpen, onClose, onSave, existingEntry }) => {
  const [date, setDate] = useState('');
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (existingEntry) {
      setDate(existingEntry.date.split('T')[0]); // Format for date input
      setWeight(existingEntry.weight.toString());
      setNotes(existingEntry.notes || '');
    } else {
      // Default to today's date for new entries
      setDate(new Date().toISOString().split('T')[0]);
      setWeight('');
      setNotes('');
    }
  }, [existingEntry, isOpen]); // Reset form when modal opens or existingEntry changes

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !weight) {
      alert('Date and Weight are required.');
      return;
    }
    const weightValue = parseFloat(weight);
    if (isNaN(weightValue) || weightValue <= 0) {
      alert('Please enter a valid positive weight.');
      return;
    }

    const entryData = {
      date: new Date(date).toISOString(), // Store as ISO string
      weight: weightValue,
      notes,
    };

    if (existingEntry) {
      onSave({ ...entryData, id: existingEntry.id });
    } else {
      onSave(entryData);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={existingEntry ? 'Edit Weight Entry' : 'Add New Weight Entry'}
      footer={
        <div className="flex justify-end space-x-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} type="submit">Save Entry</Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
        <Input
          label="Weight (kg/lbs)"
          type="number"
          step="0.1"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="e.g., 70.5"
          required
        />
        <TextArea
          label="Notes (Optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="How are you feeling today?"
        />
      </form>
    </Modal>
  );
};

export default WeightFormModal;

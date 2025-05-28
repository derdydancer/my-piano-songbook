
import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
  options: Array<{ value: string | number; label: string }>;
}

/**
 * A generic select dropdown component.
 *
 * @remarks
 * Used by:
 * - Gift Assistant: GiftItemFormModal (Status), AI Confirmation (Assign to list).
 * - Settings: Plate inventory modal (Denomination).
 * - Workout Tracker: Workout selection dropdown.
 * - Weight Tracker: Interval selection for average change.
 */
const Select: React.FC<SelectProps> = ({ label, id, error, className = '', containerClassName = '', options, ...props }) => {
  const baseStyles = 'mt-1 block w-full pl-3 pr-10 py-2 text-base bg-card border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md text-textPrimary dark:text-textPrimary';
  const errorStyles = 'border-red-500 focus:ring-red-500 focus:border-red-500';

  return (
    <div className={`mb-4 ${containerClassName}`}>
      {label && <label htmlFor={id} className="block text-sm font-medium text-textSecondary">{label}</label>}
      <select
        id={id}
        className={`${baseStyles} ${error ? errorStyles : ''} ${className}`}
        {...props}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
};

export default Select;


import React from 'react';

interface SwitchToggleProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

/**
 * A simple switch toggle component for boolean settings.
 *
 * @remarks
 * Used by:
 * - Settings: To toggle utility 'enabled' status and 'showInMoreMenu' preference.
 */
const SwitchToggle: React.FC<SwitchToggleProps> = ({ id, checked, onChange, label, disabled = false }) => {
  const uniqueId = id || `switch-${Math.random().toString(36).substring(2, 9)}`;

  return (
    <div className={`flex items-center ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
      {label && <label htmlFor={uniqueId} className="mr-3 text-sm font-medium text-textSecondary select-none">{label}</label>}
      <button
        id={uniqueId}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`${
          checked ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
        } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-offset-gray-800`}
      >
        <span className="sr-only">{label || 'Toggle'}</span>
        <span
          className={`${
            checked ? 'translate-x-6' : 'translate-x-1'
          } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
        />
      </button>
    </div>
  );
};

export default SwitchToggle;


import React, { useState, ReactNode } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from './Icons'; 

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  initialOpen?: boolean;
  headerContent?: ReactNode; // Optional additional content for the header
  onToggle?: (isOpen: boolean) => void; // Optional callback when toggled
}

/**
 * A component that creates a collapsible section with a title.
 * The section can be toggled open or closed.
 *
 * @remarks
 * Used by:
 * - Gift Assistant: To collapse/expand individual gift recipient lists and AI suggestion sections.
 * - Settings: To group different settings categories (General, Utility-specific).
 * - Songbook: To expand/collapse individual songs. (Prior to single-song view refactor)
 */
const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, children, initialOpen = false, headerContent, onToggle }) => {
  const [isOpen, setIsOpen] = useState(initialOpen);

  const handleToggle = () => {
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    if (onToggle) {
      onToggle(newIsOpen);
    }
  };

  return (
    <div className="bg-card rounded-lg shadow">
      <div         
        className="w-full flex justify-between items-center p-4 text-left focus:outline-none"
        onClick={handleToggle}
        role="button" // Make it clear it's clickable
        tabIndex={0} // Make it focusable
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleToggle(); }}
        aria-expanded={isOpen}
        aria-controls={`section-${title.replace(/\s+/g, '-').toLowerCase()}`}
      >
        <h2 className="text-xl font-semibold text-textPrimary flex-grow">{title}</h2>
        {headerContent && <div className="ml-2 flex-shrink-0" onClick={e => e.stopPropagation()}>{headerContent}</div>}
        <button 
            className="ml-2 p-1 focus:outline-none focus:ring-2 focus:ring-primary rounded flex-shrink-0" // Added flex-shrink-0
            aria-label={isOpen ? "Collapse section" : "Expand section"}
            onClick={(e) => { e.stopPropagation(); handleToggle();}} // Allow icon click as well
        >
            {isOpen ? <ChevronUpIcon className="w-5 h-5 text-textSecondary" /> : <ChevronDownIcon className="w-5 h-5 text-textSecondary" />}
        </button>
      </div>
      {isOpen && (
        <div id={`section-${title.replace(/\s+/g, '-').toLowerCase()}`} className="p-4 border-t border-gray-200 dark:border-gray-700">
          {children}
        </div>
      )}
    </div>
  );
};

export default CollapsibleSection;

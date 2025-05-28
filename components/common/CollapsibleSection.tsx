
import React, { useState, ReactNode } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from './Icons'; // Adjusted import path

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  initialOpen?: boolean;
  headerContent?: ReactNode; // Optional additional content for the header
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, children, initialOpen = false, headerContent }) => {
  const [isOpen, setIsOpen] = useState(initialOpen);

  return (
    <div className="bg-card rounded-lg shadow">
      <div         
        className="w-full flex justify-between items-center p-4 text-left focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
        role="button" // Make it clear it's clickable
        tabIndex={0} // Make it focusable
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsOpen(!isOpen); }}
        aria-expanded={isOpen}
        aria-controls={`section-${title.replace(/\s+/g, '-').toLowerCase()}`}
      >
        <h2 className="text-xl font-semibold text-textPrimary flex-grow">{title}</h2>
        {headerContent && <div className="ml-2 flex-shrink-0" onClick={e => e.stopPropagation()}>{headerContent}</div>}
        <button 
            className="ml-2 p-1 focus:outline-none focus:ring-2 focus:ring-primary rounded" 
            aria-label={isOpen ? "Collapse section" : "Expand section"}
            onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen);}} // Allow icon click as well
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

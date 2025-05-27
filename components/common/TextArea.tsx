
import React from 'react';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
}

const TextArea: React.FC<TextAreaProps> = ({ label, id, error, className = '', containerClassName = '', ...props }) => {
  const baseStyles = 'mt-1 block w-full px-3 py-2 bg-card border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-textPrimary dark:text-textPrimary';
  const errorStyles = 'border-red-500 focus:ring-red-500 focus:border-red-500';

  return (
    <div className={`mb-4 ${containerClassName}`}>
      {label && <label htmlFor={id} className="block text-sm font-medium text-textSecondary">{label}</label>}
      <textarea
        id={id}
        className={`${baseStyles} ${error ? errorStyles : ''} ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
};

export default TextArea;

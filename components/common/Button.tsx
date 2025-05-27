
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  className = '',
  ...props
}) => {
  const baseStyles = 'font-semibold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 inline-flex items-center justify-center transition-colors duration-150';

  const variantStyles = {
    primary: 'bg-primary text-white hover:bg-blue-600 dark:hover:bg-blue-500 focus:ring-primary',
    secondary: 'bg-secondary text-white hover:bg-gray-600 dark:hover:bg-gray-500 focus:ring-secondary',
    danger: 'bg-red-500 text-white hover:bg-red-600 dark:hover:bg-red-400 focus:ring-red-500',
    ghost: 'bg-transparent text-textPrimary hover:bg-gray-200 dark:hover:bg-gray-700 focus:ring-primary',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {leftIcon && <span className="mr-2">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="ml-2">{rightIcon}</span>}
    </button>
  );
};

export default Button;

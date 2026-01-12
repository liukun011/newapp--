import React from 'react';
import { COLORS } from '../constants';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  size?: 'normal' | 'small' | 'large';
  block?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'normal',
  block = false,
  loading = false,
  className = '',
  children,
  ...props
}) => {
  const baseStyles = "relative flex items-center justify-center font-medium transition-active active:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed rounded-full no-tap-highlight";
  
  let variantStyles = "";
  if (variant === 'primary') {
    variantStyles = `text-white shadow-lg shadow-indigo-500/30`;
  } else if (variant === 'secondary') {
    variantStyles = "bg-white text-slate-800 border border-slate-200 shadow-sm";
  } else if (variant === 'outline') {
    variantStyles = "bg-transparent border border-indigo-500 text-indigo-600";
  } else if (variant === 'text') {
    variantStyles = "bg-transparent text-indigo-600 p-0 h-auto min-h-0";
  }

  let sizeStyles = "";
  if (size === 'normal') sizeStyles = "h-11 px-6 text-[15px]";
  if (size === 'small') sizeStyles = "h-8 px-3 text-xs";
  if (size === 'large') sizeStyles = "h-12 px-8 text-lg";

  const blockStyles = block ? "w-full" : "";

  return (
    <button
      className={`${baseStyles} ${variantStyles} ${sizeStyles} ${blockStyles} ${className}`}
      disabled={loading || props.disabled}
      style={{
        backgroundColor: variant === 'primary' ? COLORS.primary : undefined,
        borderColor: variant === 'outline' ? COLORS.primary : undefined,
      }}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : null}
      {children}
    </button>
  );
};

export default Button;
import React from 'react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  containerClass?: string;
  variant?: 'flushed' | 'outlined';
}

const Input: React.FC<InputProps> = ({ 
  label, 
  prefix,
  suffix,
  containerClass = '', 
  variant = 'outlined', 
  ...props 
}) => {
  const baseClasses = "flex items-center w-full transition-colors";
  
  const variantClasses = variant === 'outlined' 
    ? "border border-gray-200 rounded-xl px-4 py-3 bg-white focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-100"
    : "border-b border-gray-100 py-4";

  return (
    <div className={`${baseClasses} ${variantClasses} ${containerClass}`}>
      {label && (
        <span className="mr-3 text-slate-900 font-semibold text-[15px] whitespace-nowrap">{label}</span>
      )}
      {prefix && (
        <div className="mr-2 text-gray-400">
          {prefix}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <input
          className="w-full bg-transparent text-slate-900 placeholder-gray-400 text-[15px] outline-none"
          {...props}
        />
      </div>
      {suffix && (
        <div className={`ml-3 pl-3 ${variant === 'flushed' ? 'border-l border-gray-100' : ''}`}>
          {suffix}
        </div>
      )}
    </div>
  );
};

export default Input;
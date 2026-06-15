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
    ? "border border-[#eadfca] rounded-[14px] px-4 py-3 bg-[#fffefa] focus-within:border-[#c99a3a] focus-within:ring-1 focus-within:ring-[#f2dda0]"
    : "border-b border-[#eadfca]/60 py-4";

  return (
    <div className={`${baseClasses} ${variantClasses} ${containerClass}`}>
      {label && (
        <span className="mr-3 text-slate-900 font-medium text-[15px] whitespace-nowrap">{label}</span>
      )}
      {prefix && (
        <div className="mr-2 text-[#a49a8d]">
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
        <div className={`ml-3 pl-3 ${variant === 'flushed' ? 'border-l border-[#eadfca]/60' : ''}`}>
          {suffix}
        </div>
      )}
    </div>
  );
};

export default Input;

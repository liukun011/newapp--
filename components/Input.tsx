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
    ? "border border-[#E2EBF5] rounded-[12px] px-4 py-3 bg-[#FFFFFF] focus-within:border-[#2563EB] focus-within:ring-1 focus-within:ring-[#2563EB]/20"
    : "border-b border-[#E2EBF5]/70 py-4";

  return (
    <div className={`${baseClasses} ${variantClasses} ${containerClass}`}>
      {label && (
        <span className="mr-3 text-slate-900 font-medium text-[15px] whitespace-nowrap">{label}</span>
      )}
      {prefix && (
        <div className="mr-2 text-[#8AA2BF]">
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
        <div className={`ml-3 pl-3 ${variant === 'flushed' ? 'border-l border-[#E2EBF5]/70' : ''}`}>
          {suffix}
        </div>
      )}
    </div>
  );
};

export default Input;

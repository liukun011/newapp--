import React from 'react';


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
  const baseStyles = "relative flex items-center justify-center font-medium transition-active active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed rounded-[14px] no-tap-highlight";
  
  let variantStyles = "";
  if (variant === 'primary') {
    variantStyles = `bg-primary-gradient text-[#151515] shadow-[0_6px_14px_rgba(201,154,58,0.14)]`;
  } else if (variant === 'secondary') {
    variantStyles = "bg-[#fffefa]/80 text-[#1f2024] border border-[#eadfca] shadow-[0_3px_10px_rgba(116,89,39,0.04)]";
  } else if (variant === 'outline') {
    variantStyles = "bg-transparent border border-[#dfcda9] text-[#8b641d]";
  } else if (variant === 'text') {
    variantStyles = "bg-transparent text-[#8b641d] p-0 h-auto min-h-0";
  }

  let sizeStyles = "";
  if (size === 'normal') sizeStyles = "min-h-11 px-6 text-[13px]";
  if (size === 'small') sizeStyles = "min-h-9 px-3 text-[11px]";
  if (size === 'large') sizeStyles = "min-h-12 px-8 text-[15px]";

  const blockStyles = block ? "w-full" : "";

  return (
    <button
      className={`${baseStyles} ${variantStyles} ${sizeStyles} ${blockStyles} ${className}`}
      disabled={loading || props.disabled}

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

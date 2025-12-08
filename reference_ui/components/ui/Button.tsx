import React from 'react';
import { ButtonVariant } from '../../types';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = ButtonVariant.PRIMARY, 
  icon, 
  children, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0B0C0E] focus:ring-[#5E6AD2]";
  
  const variants = {
    [ButtonVariant.PRIMARY]: "bg-[#EEEEF0] text-black hover:bg-white border border-transparent shadow-[0_0_20px_rgba(255,255,255,0.1)]",
    [ButtonVariant.SECONDARY]: "bg-transparent text-[#EEEEF0] border border-[#2E2F33] hover:bg-[#1C1D21] hover:border-[#4B4E56]",
    [ButtonVariant.GHOST]: "bg-transparent text-[#8A8F98] hover:text-[#EEEEF0]",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`} 
      {...props}
    >
      {children}
      {icon && <span className="ml-2">{icon}</span>}
    </button>
  );
};

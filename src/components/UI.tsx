import React from 'react';
import { cn } from '../lib/utils';

export const Button = ({ children, className, variant = 'primary', size = 'md', ...props }: any) => {
  const variants: any = {
    primary: 'bg-[#ff906d] text-[#000000] hover:bg-[#ff7a4d] shadow-lg shadow-[#ff906d]/20',
    secondary: 'bg-[#20201f] text-white hover:bg-[#262626] border border-[#484847]',
    outline: 'bg-transparent border-2 border-[#ff906d] text-[#ff906d] hover:bg-[#ff906d]/10',
    ghost: 'bg-transparent text-[#adaaaa] hover:text-white hover:bg-white/5',
    danger: 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20'
  };
  const sizes: any = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base'
  };
  return (
    <button 
      className={cn(
        'rounded-xl font-bold font-headline transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export const Input = ({ label, icon: Icon, className, ...props }: any) => (
  <div className="space-y-2 group">
    {label && <label className="text-xs font-bold font-headline text-[#adaaaa] uppercase tracking-widest group-focus-within:text-[#ff906d] transition-colors">{label}</label>}
    <div className="relative">
      {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#adaaaa] group-focus-within:text-[#ff906d] transition-colors" />}
      <input 
        className={cn(
          'w-full bg-[#20201f] border border-[#484847] rounded-xl py-3 px-4 text-sm font-body focus:outline-none focus:ring-2 focus:ring-[#ff906d]/50 focus:border-[#ff906d] transition-all duration-300 placeholder:text-[#adaaaa]/30',
          Icon && 'pl-12',
          className
        )}
        {...props}
      />
    </div>
  </div>
);

export const Select = ({ label, options, className, ...props }: any) => (
  <div className="space-y-2 group">
    {label && <label className="text-xs font-bold font-headline text-[#adaaaa] uppercase tracking-widest group-focus-within:text-[#ff906d] transition-colors">{label}</label>}
    <select 
      className={cn(
        'w-full bg-[#20201f] border border-[#484847] rounded-xl py-3 px-4 text-sm font-body focus:outline-none focus:ring-2 focus:ring-[#ff906d]/50 focus:border-[#ff906d] transition-all duration-300 appearance-none cursor-pointer',
        className
      )}
      {...props}
    >
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value} className="bg-[#20201f]">{opt.label}</option>
      ))}
    </select>
  </div>
);

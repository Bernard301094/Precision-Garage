import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../lib/utils';
import { ChevronDown, Check, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Button = ({ children, className, variant = 'primary', size = 'md', ...props }: any) => {
  const variants: any = {
    primary: 'bg-accent text-text-on-accent hover:opacity-90 shadow-lg shadow-accent/20',
    secondary: 'bg-surface-hover text-text-main hover:bg-surface border border-border-strong',
    outline: 'bg-transparent border-2 border-accent text-accent hover:bg-accent/10',
    ghost: 'bg-transparent text-text-muted hover:text-text-main hover:bg-surface-hover',
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
    {label && <label className="text-xs font-bold font-headline text-text-muted uppercase tracking-widest group-focus-within:text-accent transition-colors">{label}</label>}
    <div className="relative">
      {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-accent transition-colors" />}
      <input 
        className={cn(
          'w-full bg-surface-hover border border-border-strong rounded-xl py-3 px-4 text-sm font-body focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all duration-300 placeholder:text-text-muted/30',
          Icon && 'pl-12',
          className
        )}
        {...props}
      />
    </div>
  </div>
);

export const Select = ({ label, options, className, value, onChange, disabled, ...props }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOpt = options?.find((o: any) => o.value === value) || options?.[0];

  return (
    <div className="space-y-2 group" ref={containerRef}>
      {label && <label className="text-xs font-bold font-headline text-text-muted uppercase tracking-widest group-focus-within:text-accent transition-colors">{label}</label>}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'w-full flex items-center justify-between bg-surface-hover border border-border-strong rounded-xl py-3 pl-4 pr-10 text-sm font-body text-text-main focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed',
            isOpen ? 'border-accent ring-2 ring-accent/50' : '',
            className
          )}
          {...props}
        >
          <span className="truncate">{selectedOpt?.label || 'Selecione...'}</span>
          <ChevronDown className={cn("absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted transition-transform duration-300", isOpen && 'rotate-180 text-accent')} />
        </button>

        <AnimatePresence>
          {isOpen && !disabled && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 w-full mt-2 bg-surface border border-border rounded-xl shadow-2xl py-2 max-h-60 overflow-y-auto custom-scrollbar"
            >
              {options?.map((opt: any) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange?.({ target: { value: opt.value } });
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 text-sm text-left transition-colors font-body hover:bg-border",
                    value === opt.value ? 'text-accent bg-border font-bold' : 'text-text-main'
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {value === opt.value && <Check className="w-4 h-4 text-accent" />}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export const DatePicker = ({ label, value, onChange, className, ...props }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  // viewDate represents the month/year currently visible in the calendar grid
  const [viewDate, setViewDate] = useState(value ? new Date(value + 'T12:00:00') : new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const handleSelectDate = (day: number) => {
    const selected = new Date(year, month, day);
    const dateStr = selected.toISOString().split('T')[0];
    onChange?.({ target: { value: dateStr } });
    setIsOpen(false);
  };

  const weekdays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const displayFormat = value ? value.split('-').reverse().join('/') : '';

  return (
    <div className="space-y-2 group" ref={containerRef}>
      {label && <label className="text-xs font-bold font-headline text-text-muted uppercase tracking-widest group-focus-within:text-accent transition-colors">{label}</label>}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'w-full flex items-center justify-start gap-3 bg-surface-hover border border-border-strong rounded-xl py-3 px-4 text-sm font-body text-text-main focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all duration-300',
            isOpen ? 'border-accent ring-2 ring-accent/50 text-text-main' : (value ? 'text-text-main' : 'text-text-muted/30'),
            className
          )}
          {...props}
        >
          <CalendarIcon className={cn("w-4 h-4 transition-colors", isOpen ? 'text-accent' : 'text-text-muted')} />
          <span>{displayFormat || 'dd/mm/aaaa'}</span>
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 w-full sm:w-72 mt-2 bg-surface border border-border rounded-xl shadow-2xl p-4"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <button type="button" onClick={handlePrevMonth} className="p-1 hover:bg-border rounded-lg transition-colors text-text-muted hover:text-accent">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="font-headline font-bold text-sm tracking-widest uppercase">
                  {monthNames[month]} {year}
                </div>
                <button type="button" onClick={handleNextMonth} className="p-1 hover:bg-border rounded-lg transition-colors text-text-muted hover:text-accent">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {weekdays.map((d, i) => (
                  <div key={i} className="text-[10px] font-bold text-text-muted">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-8" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const isSelected = value && new Date(value + 'T12:00:00').getDate() === day && new Date(value + 'T12:00:00').getMonth() === month && new Date(value + 'T12:00:00').getFullYear() === year;
                  const isToday = new Date().getDate() === day && new Date().getMonth() === new Date().getMonth() && new Date().getFullYear() === new Date().getFullYear();
                  
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleSelectDate(day)}
                      className={cn(
                        "h-8 flex items-center justify-center text-sm font-body rounded-lg transition-all",
                        isSelected
                          ? "bg-accent text-bg font-bold shadow-lg shadow-[#ff906d]/20"
                          : isToday
                          ? "bg-border text-text-main font-bold border border-border-strong"
                          : "text-text-main hover:bg-border"
                      )}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

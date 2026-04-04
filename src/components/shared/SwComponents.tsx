import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

// ==========================================
// SW CORE COMPONENTS (SDD Nível Pro)
// Padrão Glassmorphism & Performance Limpa
// ==========================================

export const SwCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { elevated?: boolean; glass?: boolean }>(
  ({ className, elevated = false, glass = false, children, ...props }, ref) => (
    <div 
      ref={ref}
      className={cn(
        elevated ? 'sw-card-elevated' : 'sw-card', 
        glass && 'backdrop-blur-xl bg-black/40 border-[rgba(255,255,255,0.05)]',
        className
      )} 
      {...props}
    >
      {children}
    </div>
  )
);
SwCard.displayName = 'SwCard';

export const SwButton = React.forwardRef<
  HTMLButtonElement, 
  React.ButtonHTMLAttributes<HTMLButtonElement> & { 
    variant?: 'primary' | 'ghost' | 'danger', 
    size?: 'sm' | 'md' | 'lg',
    isLoading?: boolean
  }
>(({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
  return (
    <button 
      ref={ref} 
      disabled={disabled || isLoading}
      className={cn(
        'sw-btn', 
        `sw-btn-${variant}`, 
        size !== 'md' && `sw-btn-${size}`, 
        (disabled || isLoading) && 'opacity-60 cursor-not-allowed',
        className
      )} 
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
      {children}
    </button>
  );
});
SwButton.displayName = 'SwButton';

export const SwInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return <input ref={ref} className={cn('sw-input', className)} {...props} />;
  }
);
SwInput.displayName = 'SwInput';

export const SwSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => {
    return <select ref={ref} className={cn('sw-input', className)} {...props} />;
  }
);
SwSelect.displayName = 'SwSelect';

export const SwTextarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return <textarea ref={ref} className={cn('sw-input min-h-[100px] resize-y', className)} {...props} />;
  }
);
SwTextarea.displayName = 'SwTextarea';

interface SwBadgeProps {
  children: React.ReactNode;
  variant?: 'draft' | 'pub' | 'error' | 'warning' | 'accent' | 'outline' | 'ghost' | 'brand';
  className?: string;
}

export const SwBadge = ({ children, variant = 'draft', className }: SwBadgeProps) => {
  const variants = {
    draft: 'bg-white/5 text-stone-400 border-white/10',
    pub: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    error: 'bg-red-500/10 text-red-500 border-red-500/20',
    warning: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    accent: 'bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/20',
    outline: 'bg-transparent border-white/20 text-stone-300',
    ghost: 'bg-transparent border-transparent text-stone-500',
    brand: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  };

  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', variants[variant], className)}>
      {children}
    </span>
  );
};

export const SwSpinner = ({ className }: { className?: string }) => (
  <div className={cn('sw-spinner', className)} />
);

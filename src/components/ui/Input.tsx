import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ className, label, error, icon, id, ...props }, ref) => {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-sm font-semibold text-noir/80">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-noir/30">{icon}</div>}
        <input
          ref={ref}
          id={id}
          className={cn(
            'w-full px-4 py-2.5 bg-white border border-noir/20 rounded-lg text-sm text-noir placeholder-noir/55 transition-colors focus:outline-none focus:border-vert-foret focus:ring-[3px] focus:ring-vert-foret/15',
            icon && 'pl-10',
            error && 'border-red-600 focus:border-red-600 focus:ring-red-600/10',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
});

Input.displayName = 'Input';
export { Input };

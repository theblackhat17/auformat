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
        <label htmlFor={id} className="block text-sm font-medium text-noir/70">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-noir/30">{icon}</div>}
        <input
          ref={ref}
          id={id}
          className={cn(
            'w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-noir placeholder-noir/30 transition-colors focus:outline-none focus:border-vert-foret focus:ring-2 focus:ring-vert-foret/10 focus:bg-white',
            icon && 'pl-10',
            error && 'border-red-400 focus:border-red-400 focus:ring-red-400/10',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
});

Input.displayName = 'Input';
export { Input };

import * as React from 'react';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  rightElement?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', type = 'text', error, label, id, rightElement, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            {label}
          </label>
        )}
        <div className="relative w-full flex items-center">
          <input
            type={type}
            id={id}
            className={`flex h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all ${
              rightElement ? 'pr-11' : ''
            } ${
              error ? 'border-rose-500 focus-visible:ring-rose-500' : ''
            } ${className}`}
            ref={ref}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-3 flex items-center justify-center text-slate-400 hover:text-slate-600">
              {rightElement}
            </div>
          )}
        </div>
        {error && (
          <span className="text-xs text-rose-500 font-medium mt-0.5">
            {error}
          </span>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

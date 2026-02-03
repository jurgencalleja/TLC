import { forwardRef, type InputHTMLAttributes, useState } from 'react';
import { Search, X } from 'lucide-react';

type InputVariant = 'default' | 'search';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: InputVariant;
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onClear?: () => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      variant = 'default',
      label,
      error,
      leftIcon,
      rightIcon,
      onClear,
      className = '',
      disabled,
      value,
      onChange,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = useState('');
    const isControlled = value !== undefined;
    const currentValue = isControlled ? value : internalValue;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) {
        setInternalValue(e.target.value);
      }
      onChange?.(e);
    };

    const handleClear = () => {
      if (!isControlled) {
        setInternalValue('');
      }
      onClear?.();
    };

    const isSearch = variant === 'search';
    const hasValue = currentValue && String(currentValue).length > 0;

    const inputClasses = [
      'input',
      leftIcon || isSearch ? 'pl-10' : '',
      (rightIcon || (isSearch && hasValue)) ? 'pr-10' : '',
      error ? 'border-error focus:ring-error' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {(leftIcon || isSearch) && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
              {leftIcon || <Search className="h-4 w-4" />}
            </div>
          )}
          <input
            ref={ref}
            className={inputClasses}
            disabled={disabled}
            value={currentValue}
            onChange={handleChange}
            {...props}
          />
          {isSearch && hasValue && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
              aria-label="Clear search"
              data-testid="clear-button"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {rightIcon && !isSearch && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

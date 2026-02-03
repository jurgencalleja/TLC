import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastData {
  id: string;
  message: string;
  title?: string;
  variant?: ToastVariant;
  duration?: number;
}

export interface ToastProps extends ToastData {
  onDismiss: (id: string) => void;
}

const variantClasses: Record<ToastVariant, string> = {
  success: 'toast-success border-l-4 border-l-success bg-success/10',
  error: 'toast-error border-l-4 border-l-error bg-error/10',
  warning: 'toast-warning border-l-4 border-l-warning bg-warning/10',
  info: 'toast-info border-l-4 border-l-info bg-info/10',
};

const variantIcons: Record<ToastVariant, typeof CheckCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const iconColors: Record<ToastVariant, string> = {
  success: 'text-success',
  error: 'text-error',
  warning: 'text-warning',
  info: 'text-info',
};

export function Toast({
  id,
  message,
  title,
  variant = 'info',
  onDismiss,
}: ToastProps) {
  const Icon = variantIcons[variant];

  return (
    <div
      data-testid="toast"
      className={`
        ${variantClasses[variant]}
        flex items-start gap-3 p-4 rounded-lg shadow-lg
        bg-surface border border-border
        min-w-[300px] max-w-[400px]
        animate-slide-in
      `}
      role="alert"
    >
      <Icon
        data-testid="toast-icon"
        className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColors[variant]}`}
      />

      <div className="flex-1 min-w-0">
        {title && (
          <p className="font-medium text-foreground mb-1">{title}</p>
        )}
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>

      <button
        onClick={() => onDismiss(id)}
        className="p-1 rounded hover:bg-muted transition-colors flex-shrink-0"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  );
}

export interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxToasts?: number;
}

const positionClasses: Record<string, string> = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
};

export function ToastContainer({
  toasts,
  onDismiss,
  position = 'bottom-right',
  maxToasts = 5,
}: ToastContainerProps) {
  const visibleToasts = toasts.slice(-maxToasts);

  return (
    <div
      data-testid="toast-container"
      className={`fixed ${positionClasses[position]} z-50 flex flex-col gap-2`}
    >
      {visibleToasts.map((toast) => (
        <Toast key={toast.id} {...toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// Toast Context and Hook
interface ToastContextValue {
  toasts: ToastData[];
  addToast: (toast: Omit<ToastData, 'id'>) => string;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timeout = timeoutRefs.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutRefs.current.delete(id);
    }
  }, []);

  const addToast = useCallback(
    (toast: Omit<ToastData, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const duration = toast.duration ?? 5000;

      setToasts((prev) => [...prev, { ...toast, id }]);

      if (duration > 0) {
        const timeout = setTimeout(() => {
          dismissToast(id);
        }, duration);
        timeoutRefs.current.set(id, timeout);
      }

      return id;
    },
    [dismissToast]
  );

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach((timeout) => clearTimeout(timeout));
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, dismissToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

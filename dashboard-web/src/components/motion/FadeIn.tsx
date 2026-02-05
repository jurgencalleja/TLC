/**
 * FadeIn Component
 *
 * A wrapper component that fades children in with a subtle animation.
 * Respects prefers-reduced-motion for accessibility.
 */
import { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export interface FadeInProps {
  /** Content to animate */
  children: ReactNode;
  /** Animation delay in seconds */
  delay?: number;
  /** Animation duration in seconds (default: 0.3) */
  duration?: number;
  /** Additional CSS classes */
  className?: string;
}

export function FadeIn({
  children,
  delay = 0,
  duration = 0.3,
  className,
}: FadeInProps) {
  const shouldReduceMotion = useReducedMotion();

  // Skip animation if user prefers reduced motion
  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration,
        delay,
        ease: 'easeOut',
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * PageTransition Component
 *
 * A wrapper for page content that provides a subtle fade and slide-up animation
 * on enter. Intended for wrapping entire page content.
 * Respects prefers-reduced-motion for accessibility.
 */
import { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export interface PageTransitionProps {
  /** Page content to animate */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  const shouldReduceMotion = useReducedMotion();

  // Skip animation if user prefers reduced motion
  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{
        opacity: 0,
        y: 10, // Slight slide up from below
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.25, // Quick, subtle transition
        ease: 'easeOut',
      }}
    >
      {children}
    </motion.div>
  );
}

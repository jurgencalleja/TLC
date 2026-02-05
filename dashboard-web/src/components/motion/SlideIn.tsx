/**
 * SlideIn Component
 *
 * A wrapper component that slides children in from a specified direction.
 * Default direction is 'down' (slides up from bottom).
 * Respects prefers-reduced-motion for accessibility.
 */
import { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export type SlideDirection = 'left' | 'right' | 'up' | 'down';

export interface SlideInProps {
  /** Content to animate */
  children: ReactNode;
  /** Direction to slide from (default: 'down' - slides up from bottom) */
  direction?: SlideDirection;
  /** Animation delay in seconds */
  delay?: number;
  /** Animation duration in seconds (default: 0.3) */
  duration?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get initial position based on slide direction
 */
function getInitialPosition(direction: SlideDirection): { x: number; y: number } {
  const distance = 20; // pixels to slide

  switch (direction) {
    case 'left':
      return { x: -distance, y: 0 };
    case 'right':
      return { x: distance, y: 0 };
    case 'up':
      return { x: 0, y: -distance };
    case 'down':
    default:
      return { x: 0, y: distance };
  }
}

export function SlideIn({
  children,
  direction = 'down',
  delay = 0,
  duration = 0.3,
  className,
}: SlideInProps) {
  const shouldReduceMotion = useReducedMotion();

  // Skip animation if user prefers reduced motion
  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  const initialPosition = getInitialPosition(direction);

  return (
    <motion.div
      className={className}
      initial={{
        opacity: 0,
        x: initialPosition.x,
        y: initialPosition.y,
      }}
      animate={{
        opacity: 1,
        x: 0,
        y: 0,
      }}
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

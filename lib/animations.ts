// Animation variants and utilities for Framer Motion
// Consistent timing: 150-250ms, ease-out or cubic-bezier(0.22, 1, 0.36, 1)

export const easeOut = [0.22, 1, 0.36, 1] as const

// Page entrance animation
export const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

export const pageTransition = {
  duration: 0.2,
  ease: easeOut,
}

// Stagger children for grid/list items
export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
}

export const staggerItem = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: easeOut },
  },
}

export const staggerChild = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: easeOut },
  },
}

// Card hover/press animations
export const cardVariants = {
  initial: { scale: 1, y: 0 },
  hover: {
    scale: 1.01,
    y: -4,
    transition: { duration: 0.15, ease: easeOut },
  },
  tap: {
    scale: 0.98,
    y: 0,
    transition: { duration: 0.1 },
  },
}

// Button animations
export const buttonVariants = {
  initial: { scale: 1 },
  hover: { scale: 1.02, transition: { duration: 0.15 } },
  tap: { scale: 0.98, transition: { duration: 0.1 } },
}

// Modal animations
export const overlayVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2, ease: easeOut } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
}

// Backdrop with smoother blur transition
export const backdropVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
}

export const modalVariants = {
  initial: { opacity: 0, scale: 0.98, y: 8 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.2, ease: easeOut },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    y: 8,
    transition: { duration: 0.15 },
  },
}

// List item animations (for counter offers, etc.)
export const listItemVariants = {
  initial: { opacity: 0, x: -12 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.2, ease: easeOut },
  },
  exit: {
    opacity: 0,
    x: 12,
    transition: { duration: 0.15 },
  },
}

// Selection animation (for picker items)
export const selectionVariants = {
  initial: { scale: 1 },
  selected: {
    scale: 1.02,
    transition: { duration: 0.15, ease: easeOut },
  },
}

// Slot pulse animation (empty slots)
export const pulseVariants = {
  initial: { boxShadow: '0 0 0 0 rgba(34, 197, 94, 0)' },
  animate: {
    boxShadow: [
      '0 0 0 0 rgba(34, 197, 94, 0.2)',
      '0 0 0 8px rgba(34, 197, 94, 0)',
    ],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}

// Fade variants
export const fadeVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
}

// Skeleton shimmer (CSS-based, not Framer)
export const skeletonClass = 'animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-darkbg-700 dark:via-darkbg-600 dark:to-darkbg-700 bg-[length:200%_100%]'

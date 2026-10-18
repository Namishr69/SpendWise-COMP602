// Shared Motion settings so every animated surface moves the same way.

export const EASE_OUT = [0.22, 1, 0.36, 1]

export const SPRING = {
  type: 'spring',
  stiffness: 420,
  damping: 30,
}

// Parent of a staggered group: children using `fadeUp` play one after another.
export function stagger(delayChildren = 0, staggerChildren = 0.06) {
  return {
    hidden: {},
    show: {
      transition: { delayChildren, staggerChildren },
    },
  }
}

export const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE_OUT },
  },
}

export const fadeIn = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.4, ease: EASE_OUT },
  },
}

// Small lift for clickable cards and tiles.
export const hoverLift = {
  y: -3,
  transition: SPRING,
}

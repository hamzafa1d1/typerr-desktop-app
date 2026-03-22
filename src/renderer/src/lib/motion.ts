import type { Transition, Variants } from 'framer-motion'

const EASE_STANDARD: [number, number, number, number] = [0.22, 1, 0.36, 1]

export const motionPresets = {
  page(reduced: boolean): { initial: { opacity: number; y: number }; animate: { opacity: number; y: number }; transition: Transition } {
    if (reduced) {
      return {
        initial: { opacity: 0, y: 0 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.01 }
      }
    }

    return {
      initial: { opacity: 0, y: 8 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.35, ease: EASE_STANDARD }
    }
  },

  cardStagger(reduced: boolean): Variants {
    if (reduced) {
      return {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { duration: 0.01 } }
      }
    }

    return {
      hidden: { opacity: 0, y: 8 },
      show: {
        opacity: 1,
        y: 0,
        transition: {
          staggerChildren: 0.045,
          delayChildren: 0.04,
          duration: 0.22,
          ease: EASE_STANDARD
        }
      }
    }
  },

  cardItem(reduced: boolean): Variants {
    if (reduced) {
      return {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { duration: 0.01 } }
      }
    }

    return {
      hidden: { opacity: 0, y: 10, scale: 0.995 },
      show: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.22, ease: EASE_STANDARD }
      }
    }
  }
}

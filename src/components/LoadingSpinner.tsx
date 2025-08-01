import { motion, Variants } from 'framer-motion'
import { cn } from '../lib/utils'

const spinnerVariants: Variants = {
  initial: {
    rotate: 0,
  },
  animate: {
    rotate: 360,
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'linear',
    },
  },
}

const letterVariants: Variants = {
  initial: {
    y: 0,
  },
  animate: (i: number) => ({
    y: [0, -15, 0], 
    transition: {
      duration: 1.5,
      repeat: Infinity,
      delay: i * 0.15, 
      ease: 'easeInOut',
    },
  }),
}

interface LoadingSpinnerProps {
  className?: string
  loadingText?: string
  statusText?: string
  size?: number
}

export const LoadingSpinner = ({
  className,
  loadingText = 'LOADING',
  statusText = 'Connecting to Solana network...',
  size = 96,
}: LoadingSpinnerProps): JSX.Element => {
  const loadingTextChars = loadingText.split('')

  return (
    <div className={cn('flex flex-col items-center justify-center space-y-6 mt-8', className)}>
      {/* Spinner SVG */}
      <motion.div
        className="relative"
        style={{ width: size, height: size }}
        variants={spinnerVariants}
        initial="initial"
        animate="animate"
      >
        <svg
          className="h-full w-full text-indigo-500" 
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <motion.circle
            cx="50"
            cy="50"
            r="45"
            stroke="currentColor" 
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="220 62.7"
          />
        </svg>
      </motion.div>

      {/* Animated Loading Text */}
      {loadingText && (
        <div className="flex space-x-2">
          {loadingTextChars.map((letter, i) => (
            <motion.span
              key={`${letter}-${i}`}
              className="text-indigo-500 bg-clip-text text-2xl font-bold "
              custom={i}
              variants={letterVariants}
              initial="initial"
              animate="animate"
            >
              {letter}
            </motion.span>
          ))}
        </div>
      )}

      {/* Status Message */}
      {statusText && <p className="text-sm text-muted-foreground">{statusText}</p>}
    </div>
  )
}

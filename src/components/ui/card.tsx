import * as React from 'react'
import { motion } from 'framer-motion'

import { cn } from '@/lib/utils'

// Animation variants
const cardVariants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1] as const,
      staggerChildren: 0.1
    }
  },
  hover: {
    y: -4,
    scale: 1.02,
    transition: {
      duration: 0.2,
      ease: "easeOut"
    }
  },
  tap: {
    scale: 0.98,
    transition: {
      duration: 0.1
    }
  }
}

const childVariants = {
  hidden: {
    opacity: 0,
    y: 10
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1]
    }
  }
}

const actionVariants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
    rotate: -10
  },
  visible: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: {
      duration: 0.4,
      delay: 0.2,
      ease: "easeOut"
    }
  },
  hover: {
    scale: 1.1,
    rotate: 5,
    transition: {
      duration: 0.2
    }
  }
}

function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <motion.div
      data-slot="card"
      className={cn('bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm cursor-pointer', className)}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      whileTap="tap"
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <motion.div
      data-slot="card-header"
      className={cn(
        '@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6',
        className,
      )}
      variants={childVariants}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <motion.div 
      data-slot="card-title" 
      className={cn('leading-none font-semibold', className)} 
      variants={childVariants}
      whileHover={{
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      {...props} 
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <motion.div 
      data-slot="card-description" 
      className={cn('text-muted-foreground text-sm', className)} 
      variants={childVariants}
      {...props} 
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <motion.div
      data-slot="card-action"
      className={cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end', className)}
      variants={actionVariants}
      whileHover="hover"
      whileTap={{ scale: 0.9 }}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <motion.div 
      data-slot="card-content" 
      className={cn('px-6', className)} 
      variants={childVariants}
      {...props} 
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <motion.div 
      data-slot="card-footer" 
      className={cn('flex items-center px-6 [.border-t]:pt-6', className)} 
      variants={childVariants}
      {...props} 
    />
  )
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent }
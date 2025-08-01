// src/components/Text3D.tsx

import React, { useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';

interface Text3DProps {
  children: React.ReactNode;
}

const Text3D: React.FC<Text3DProps> = ({ children }) => {
  const ref = useRef<HTMLDivElement>(null);

  // Motion values to track mouse position
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Add spring animation for smoother transitions
  const springX = useSpring(x, { 
    stiffness: 400, 
    damping: 25, 
    mass: 0.1 
  });
  const springY = useSpring(y, { 
    stiffness: 400, 
    damping: 25, 
    mass: 0.1 
  });

  // Transform mouse position into a 3D rotation with smoother springs
  const rotateX = useTransform(springY, [0, window.innerHeight], [30, -30]);
  const rotateY = useTransform(springX, [0, window.innerWidth], [-30, 30]);

  // Global mouse move handler for full viewport tracking
  const handleGlobalMouseMove = (event: MouseEvent) => {
    x.set(event.clientX);
    y.set(event.clientY);
  };

  const handleMouseLeave = () => {
    // Smoothly return to center position
    x.set(window.innerWidth / 2);
    y.set(window.innerHeight / 2);
  };

  useEffect(() => {
    // Set initial center position
    x.set(window.innerWidth / 2);
    y.set(window.innerHeight / 2);

    // Add global mouse move listener for full viewport tracking
    document.addEventListener('mousemove', handleGlobalMouseMove);
    
    // Handle window resize to update center position
    const handleResize = () => {
      x.set(window.innerWidth / 2);
      y.set(window.innerHeight / 2);
    };
    
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('resize', handleResize);
    };
  }, [x, y]);

  return (
    <div
      ref={ref}
      onMouseLeave={handleMouseLeave}
      className="w-full h-full py-20 flex items-center justify-center rounded-lg [perspective:2000px]"
    >
      {/* This is the element that will be transformed in 3D space. */}
      <motion.h1
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className="text-5xl font-bold text-white [transform-style:preserve-3d] will-change-transform"
        transition={{
          type: "spring",
          stiffness: 150,
          damping: 25,
          mass: 0.1
        }}
      >
        {children}
      </motion.h1>
    </div>
  );
};

export default Text3D;
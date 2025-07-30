import React from 'react';
import { motion } from 'framer-motion';

// Animation variants for the rolling text effect
const letterVariants = {
  initial: { y: 0 },
  spin: (i: number) => ({
    y: "-120%", // Moves the original text up and out
    transition: { duration: 0.3, ease: "easeInOut", delay: i * 0.03 },
  }),
};

const letterVariants2 = {
  initial: { y: "120%" }, // Starts the new text below, out of view
  spin: (i: number) => ({
    y: 0, // Moves the new text into view
    transition: { duration: 0.3, ease: "easeInOut", delay: i * 0.03 },
  }),
};

// Define the props the component will accept
interface RollingTextProps {
  text: string;
  isHovered: boolean;
}

const RollingText: React.FC<RollingTextProps> = ({ text, isHovered }) => {
  return (
    // This container holds the two layers of text and hides the overflow
    <div className="relative z-10 h-5 overflow-hidden">
      
      {/* Layer 1: The initial text that will roll out on hover */}
      <motion.div
        className="flex"
        initial="initial"
        animate={isHovered ? "spin" : "initial"}
      >
        {text.split("").map((char, i) => (
          <motion.span
            key={`${char}-${i}`}
            custom={i}
            variants={letterVariants}
            className="inline-block whitespace-pre"
          >
            {char}
          </motion.span>
        ))}
      </motion.div>
      
      {/* Layer 2: The second text that rolls in on hover */}
      <motion.div
        className="absolute top-0 left-0 flex text-white"
        initial="initial"
        animate={isHovered ? "spin" : "initial"}
      >
        {text.split("").map((char, i) => (
          <motion.span
            key={`${char}-${i}-2`}
            custom={i}
            variants={letterVariants2}
            className="inline-block whitespace-pre"
          >
            {char}
          </motion.span>
        ))}
      </motion.div>
    </div>
  );
};

export default RollingText;
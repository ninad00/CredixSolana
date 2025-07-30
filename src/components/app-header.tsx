import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
// import { ThemeSelect } from '@/components/theme-select';
import { ClusterUiSelect } from './cluster/cluster-ui';
import { WalletButton } from '@/components/solana/solana-provider';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import RollingText from './RollingText';

// Main Header Component
export function AppHeader({ links = [] }: { links: { label: string; path: string }[] }) {
  const { pathname } = useLocation();
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Helper to determine if a link is currently active
  const isActive = (path: string) => {
    return path === '/' ? pathname === '/' : pathname.startsWith(path);
  };

  return (
    <>
      {/* Header element with modern styling. Removed the bottom border for a cleaner look. */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-lg mt-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Desktop Navigation */}
            <div className="flex items-center space-x-8">
              <Link to="/" className="text-2xl font-bold text-gray-900 dark:text-white hover:opacity-80 hover:scale-105 transition-all">
                CREDIX
              </Link>
              <nav className="hidden md:flex items-center space-x-1 rounded-full p-1">
                {links.map(({ label, path }) => (
                  <Link
                    key={path}
                    to={path}
                    className="relative px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
                    onMouseEnter={() => setHoveredItem(path)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <RollingText 
                      text={label} 
                      isHovered={hoveredItem === path || isActive(path)} 
                    />
                    {isActive(path) && (
                      <motion.div 
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"
                        layoutId="active-nav"
                      />
                    )}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Desktop Action Buttons */}
            <div className="hidden md:flex items-center space-x-2">
              <WalletButton />
              <ClusterUiSelect />
             
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)}>
                <Menu className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu using Framer Motion for animations */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <MobileMenu links={links} isActive={isActive} onClose={() => setMobileMenuOpen(false)} />
        )}
      </AnimatePresence>
    </>
  );
}

// // Custom NavLink with an animated pill background for the active state
// const NavLink = ({ path, label, isActive }: { path:string; label: string; isActive: boolean }) => {
//   return (
//     <Link
//       to={path}
//       className="relative px-4 py-2 text-sm font-medium text-gray-700 dark:text-neutral-300 transition-colors hover:text-black dark:hover:text-white"
//     >
//       {/* The animated pill background for the active link */}
//       {isActive && (
//         <motion.div
//           className="absolute inset-0 bg-white dark:bg-neutral-800 rounded-full shadow-sm"
//           layoutId="active-pill" // This ID links the animation across different links
//           transition={{ type: 'spring', stiffness: 350, damping: 30 }}
//         />
//       )}
//       {/* The label text needs to be relative to sit on top of the pill */}
//       <span className="relative z-10">{label}</span>
//     </Link>
//   );
// };


// Mobile Menu Component with slide-in and stagger animations
const MobileMenu = ({ links, isActive, onClose }: { links: { label: string; path: string }[]; isActive: (path: string) => boolean; onClose: () => void; }) => {
  const menuVariants = {
    hidden: { x: '100%' },
    visible: { x: 0, transition: { type: 'tween', ease: 'circOut' } },
    exit: { x: '100%', transition: { type: 'tween', ease: 'circIn' } },
  };

  const listVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 md:hidden"
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } }}
      />
      {/* Menu Panel */}
      <motion.div
        className="absolute top-0 right-0 bottom-0 w-full max-w-sm bg-white dark:bg-neutral-900 shadow-xl p-6 flex flex-col"
        variants={menuVariants}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Menu</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-6 w-6" />
          </Button>
        </div>
        <motion.ul className="mt-8 space-y-2 flex-grow" variants={listVariants}>
          {links.map(({ label, path }) => (
            <motion.li key={path} variants={itemVariants}>
              <Link
                to={path}
                onClick={onClose}
                className={`block text-lg font-medium p-3 rounded-md transition-colors ${isActive(path) ? 'bg-neutral-100 dark:bg-neutral-800 text-purple-600 dark:text-purple-400' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
              >
                {label}
              </Link>
            </motion.li>
          ))}
        </motion.ul>
        <motion.div className="mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-800 flex flex-col space-y-4" variants={listVariants}>
          <motion.div variants={itemVariants}><WalletButton /></motion.div>
          <motion.div variants={itemVariants}><ClusterUiSelect /></motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

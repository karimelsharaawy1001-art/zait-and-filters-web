'use client';
import { motion } from 'framer-motion';
import { ReactNode } from 'react';

export default function HoverScale({ children, scale = 1.05 }: { children: ReactNode; scale?: number }) {
  return (
    <motion.div
      whileHover={{ scale: scale }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      {children}
    </motion.div>
  );
}

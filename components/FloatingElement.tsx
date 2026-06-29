'use client';
import { m } from 'framer-motion';
import { ReactNode } from 'react';

export default function FloatingElement({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <m.div
      animate={{
        y: [0, -10, 0],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: 'easeInOut',
        delay: delay,
      }}
    >
      {children}
    </m.div>
  );
}

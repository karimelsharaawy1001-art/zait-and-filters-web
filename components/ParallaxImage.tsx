'use client';
import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

export default function ParallaxImage({ 
  src, 
  alt, 
  speed = 0.5 
}: { 
  src: string; 
  alt: string; 
  speed?: number;
}) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], ['0%', `${speed * 100}%`]);

  return (
    <div ref={ref} style={{ overflow: 'hidden', position: 'relative', height: '100%' }}>
      <motion.img
        src={src}
        alt={alt}
        style={{ y, width: '100%', height: '120%', objectFit: 'cover' }}
      />
    </div>
  );
}

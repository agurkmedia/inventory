'use client';

import { ReactNode } from 'react';
import { AnimatePresence } from 'framer-motion';

export default function AnimatedLayout({ children }: { children: ReactNode }) {
  return <AnimatePresence mode="wait">{children}</AnimatePresence>;
}
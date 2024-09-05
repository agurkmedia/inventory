'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Header from '@/app/components/Header';
import Sidebar from '@/app/components/Sidebar';
import AnimatedPage from '@/app/components/AnimatedPage';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 overflow-x-hidden overflow-y-auto">
          <AnimatedPage key={pathname}>{children}</AnimatedPage>
        </main>
      </div>
    </div>
  );
}
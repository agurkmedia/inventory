import { ReactNode } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 overflow-x-hidden overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
'use client';

import CollapsibleSideMenu from '../components/CollapsibleSideMenu';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen">
      <CollapsibleSideMenu />
      <main className="flex-1 overflow-y-auto p-4">
        {children}
      </main>
    </div>
  );
}
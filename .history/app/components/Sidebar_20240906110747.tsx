'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const [hasInventory, setHasInventory] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await fetch('/api/dashboard');
        const data = await res.json();
        setHasInventory(data.totalInventories > 0);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      }
    };

    fetchDashboardData();
  }, [pathname]); // Re-run effect when pathname changes

  console.log('Sidebar state:', { hasInventory });

  return (
    <div className="w-64 bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg min-h-screen p-4">
      <nav className="space-y-2">
        <SidebarLink href="/dashboard" icon={<DashboardIcon />}>Dashboard</SidebarLink>
        {hasInventory && (
          <SidebarLink href="/dashboard/inventories" icon={<InventoryIcon />}>Inventories</SidebarLink>
        )}
        <SidebarLink href="/dashboard/items" icon={<ItemIcon />}>Items</SidebarLink>
        <SidebarLink href="/dashboard/scrape" icon={<ScrapeIcon />}>Web Scraping</SidebarLink>
      </nav>
    </div>
  );
}

function SidebarLink({ href, children, icon }) {
  return (
    <Link href={href} className="flex items-center space-x-3 text-white hover:bg-white hover:bg-opacity-10 rounded-lg p-2 transition duration-150 ease-in-out">
      <span className="text-indigo-200">{icon}</span>
      <span>{children}</span>
    </Link>
  );
}

function DashboardIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}

function InventoryIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

function ItemIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  );
}

function ScrapeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
    </svg>
  );
}
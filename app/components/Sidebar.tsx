'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar({ isCollapsed, toggleSidebar }) {
  const pathname = usePathname();

  return (
    <div
      className={`fixed inset-y-0 left-0 bg-indigo-900 bg-opacity-90 backdrop-filter backdrop-blur-lg transform border-r border-indigo-700 transition-all duration-300 ease-in-out z-30 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="h-full overflow-y-auto">
        <div className="flex justify-end p-4">
          <button onClick={toggleSidebar} className="text-white">
            {isCollapsed ? '≡' : '×'}
          </button>
        </div>
        <nav className="px-4 pt-4 space-y-2">
          <SidebarLink href="/dashboard" icon={<DashboardIcon />} isCollapsed={isCollapsed}>Dashboard</SidebarLink>
          <SidebarLink href="/dashboard/inventories" icon={<InventoryIcon />} isCollapsed={isCollapsed}>Inventories</SidebarLink>
          <SidebarLink href="/dashboard/items" icon={<ItemIcon />} isCollapsed={isCollapsed}>Items</SidebarLink>
          <SidebarLink href="/dashboard/groceries" icon={<GroceryIcon />} isCollapsed={isCollapsed}>Groceries</SidebarLink>
          <SidebarLink href="/dashboard/economy" icon={<EconomyIcon />} isCollapsed={isCollapsed}>Economy & Budget</SidebarLink>
          <SidebarLink href="/dashboard/scrape" icon={<ScrapeIcon />} isCollapsed={isCollapsed}>Web Scraping</SidebarLink>
        </nav>
      </div>
    </div>
  );
}

function SidebarLink({ href, children, icon, isCollapsed }) {
  return (
    <Link href={href} className={`flex items-center space-x-3 text-white hover:bg-white hover:bg-opacity-10 rounded-lg p-2 transition duration-150 ease-in-out ${isCollapsed ? 'justify-center' : ''}`}>
      <span className="text-indigo-200">{icon}</span>
      {!isCollapsed && <span>{children}</span>}
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

function GroceryIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function EconomyIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}
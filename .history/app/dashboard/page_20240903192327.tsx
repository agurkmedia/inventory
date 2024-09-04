'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState({
    totalInventories: 0,
    totalItems: 0,
    lowStockItems: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { data: session } = useSession();
  const pathname = usePathname();

  const fetchDashboardData = useCallback(async () => {
    if (!session?.user) return;
    
    try {
      const res = await fetch('/api/dashboard');
      if (!res.ok) throw new Error('Failed to fetch dashboard data');
      const data = await res.json();
      setDashboardData(data);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData, pathname]); // Re-run effect when pathname changes

  if (loading) {
    return <div className="text-white">Loading...</div>;
  }

  if (dashboardData.totalInventories === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-xl p-8 shadow-xl max-w-md w-full"
        >
          <h2 className="text-2xl font-bold text-white mb-4">Create Your First Inventory</h2>
          <p className="text-indigo-200 mb-6">Start by creating an inventory to organize your items.</p>
          <Link 
            href="/dashboard/inventories/new"
            className="block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out"
          >
            Create Inventory
          </Link>
        </motion.div>
      </div>
    );
  }

  if (dashboardData.totalItems === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-xl p-8 shadow-xl max-w-md w-full"
        >
          <h2 className="text-2xl font-bold text-white mb-4">Add Your First Item</h2>
          <p className="text-indigo-200 mb-6">Now that you have an inventory, let's add your first item.</p>
          <Link 
            href="/dashboard/items/new"
            className="block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out"
          >
            Add Item
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DashboardCard title="Total Inventories" value={dashboardData.totalInventories} icon={<InventoryIcon />} />
        <DashboardCard title="Total Items" value={dashboardData.totalItems} icon={<ItemIcon />} />
        <DashboardCard title="Low Stock Items" value={dashboardData.lowStockItems} icon={<AlertIcon />} />
      </div>
      <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-xl p-6 shadow-xl">
        <h2 className="text-2xl font-semibold text-white mb-4">Recent Activity</h2>
        {dashboardData.recentActivity && dashboardData.recentActivity.length > 0 ? (
          <ul className="space-y-2">
            {dashboardData.recentActivity.map((activity, index) => (
              <ActivityItem key={index} text={activity.text} time={activity.time} />
            ))}
          </ul>
        ) : (
          <p className="text-indigo-200">No recent activity.</p>
        )}
      </div>
    </div>
  );
}

function DashboardCard({ title, value, icon }) {
  return (
    <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-xl p-6 shadow-xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-indigo-100">{title}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
        </div>
        <div className="text-indigo-200">{icon}</div>
      </div>
    </div>
  );
}

function ActivityItem({ text, time }) {
  return (
    <li className="flex items-center space-x-3 text-sm">
      <span className="w-2 h-2 bg-indigo-400 rounded-full"></span>
      <span className="flex-1 text-white">{text}</span>
      <span className="text-indigo-200">{time}</span>
    </li>
  );
}

function InventoryIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

function ItemIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}
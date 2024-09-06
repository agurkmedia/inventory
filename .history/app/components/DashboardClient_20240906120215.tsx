'use client';

import React from 'react';
import Link from 'next/link';

const DashboardClient = ({ inventories }) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-xl p-8 shadow-xl max-w-md w-full">
        {inventories.length === 0 ? (
          <div className="text-center">
            <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out">
              Create New Inventory
            </button>
          </div>
        ) : (
          <>
            <div className="text-center mb-4">
              <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out">
                Add New Item
              </button>
            </div>
            {/* Render existing inventories */}
            {inventories.map(inventory => (
              <div key={inventory.id} className="text-white mb-2">
                {inventory.name}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default DashboardClient;
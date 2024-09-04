'use client';

import { signOut } from 'next-auth/react';

export default function Header() {
  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  return (
    <header className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg shadow-lg">
      <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Inventory App</h1>
        <button
          onClick={handleSignOut}
          className="bg-red-500 bg-opacity-80 hover:bg-opacity-100 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out"
        >
          Sign Out
        </button>
      </div>
    </header>
  );
}
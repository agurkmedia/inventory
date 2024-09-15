import React, { useState } from 'react';
import Link from 'next/link';

const CollapsibleSideMenu = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className={`bg-gray-800 text-white transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
      <button onClick={toggleCollapse} className="w-full p-4 text-left">
        {isCollapsed ? '≡' : 'Collapse'}
      </button>
      <nav className={`${isCollapsed ? 'hidden' : 'block'}`}>
        <Link href="/dashboard" className="block p-4 hover:bg-gray-700">Dashboard</Link>
        <Link href="/dashboard/inventories" className="block p-4 hover:bg-gray-700">Inventories</Link>
        <Link href="/dashboard/items" className="block p-4 hover:bg-gray-700">Items</Link>
        {/* Add more menu items as needed */}
      </nav>
    </div>
  );
};

export default CollapsibleSideMenu;
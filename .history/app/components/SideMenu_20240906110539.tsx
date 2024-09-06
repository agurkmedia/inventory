import React from 'react';
import { Link } from 'react-router-dom';

const SideMenu = () => {
  return (
    <nav>
      <ul>
        <li><Link to="/dashboard">Dashboard</Link></li>
        <li><Link to="/items">Items</Link></li> {/* Ensure this link is not conditionally hidden */}
        {/* Other links */}
      </ul>
    </nav>
  );
};

export default SideMenu;
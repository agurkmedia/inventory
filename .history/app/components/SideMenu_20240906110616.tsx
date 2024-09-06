import React from 'react';
import { Link } from 'react-router-dom';

const SideMenu = () => {
  return (
    <nav>
      <ul>
        <li><Link to="/dashboard">Dashboard</Link></li>
        <li><Link to="/items">Items</Link></li> {/* Always show this link */}
        {/* Other links */}
      </ul>
    </nav>
  );
};

export default SideMenu;
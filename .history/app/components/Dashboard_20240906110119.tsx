import React from 'react';

const Dashboard = ({ inventories }) => {
  return (
    <div>
      {inventories.length === 0 ? (
        <button>Create New Inventory</button>
      ) : (
        <>
          <button>Add New Item</button>
          {/* Render existing inventories */}
          {inventories.map(inventory => (
            <div key={inventory.id}>{inventory.name}</div>
          ))}
        </>
      )}
    </div>
  );
};

export default Dashboard;
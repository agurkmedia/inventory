export default function Dashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DashboardCard title="Total Inventories" value="5" icon={<InventoryIcon />} />
        <DashboardCard title="Total Items" value="50" icon={<ItemIcon />} />
        <DashboardCard title="Low Stock Items" value="3" icon={<AlertIcon />} />
      </div>
      <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-xl p-6 shadow-xl">
        <h2 className="text-2xl font-semibold text-white mb-4">Recent Activity</h2>
        <ul className="space-y-2">
          <ActivityItem text="New item added to Inventory A" time="2 hours ago" />
          <ActivityItem text="Stock updated for Item X" time="4 hours ago" />
          <ActivityItem text="New inventory 'Office Supplies' created" time="1 day ago" />
        </ul>
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
    <div>
      <h1 className="text-2xl font-semibold mb-4">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Total Inventories</h2>
          <p className="text-3xl font-bold">5</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Total Items</h2>
          <p className="text-3xl font-bold">50</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Low Stock Items</h2>
          <p className="text-3xl font-bold">3</p>
        </div>
      </div>
    </div>
  );
}
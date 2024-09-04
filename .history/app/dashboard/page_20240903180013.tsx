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
export default function Dashboard() {
  return (
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
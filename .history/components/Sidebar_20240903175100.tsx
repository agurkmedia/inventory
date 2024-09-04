import Link from 'next/link';

export default function Sidebar() {
  return (
    <div className="bg-gray-800 text-white w-64 space-y-6 py-7 px-2 absolute inset-y-0 left-0 transform -translate-x-full md:relative md:translate-x-0 transition duration-200 ease-in-out">
      <nav>
        <Link href="/dashboard" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700 hover:text-white">
          Dashboard
        </Link>
        <Link href="/dashboard/inventories" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700 hover:text-white">
          Inventories
        </Link>
        <Link href="/dashboard/items" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700 hover:text-white">
          Items
        </Link>
      </nav>
    </div>
  );
}
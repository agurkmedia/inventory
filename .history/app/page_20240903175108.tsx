import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-4xl font-bold mb-8">Welcome to Inventory App</h1>
      <div className="space-x-4">
        <Link href="/login" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Login
        </Link>
        <Link href="/register" className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
          Register
        </Link>
      </div>
    </div>
  );
}

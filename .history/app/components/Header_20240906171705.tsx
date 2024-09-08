import { useSession, signOut } from 'next-auth/react';

export default function Header({ toggleSidebar }) {
  const { data: session } = useSession();

  return (
    <header className="bg-indigo-900 bg-opacity-90 backdrop-filter backdrop-blur-lg border-b border-indigo-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <button
            onClick={toggleSidebar}
            className="text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white md:hidden"
          >
            <span className="sr-only">Open sidebar</span>
            <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex-1 flex justify-between px-4 md:px-0">
            <div className="flex-1 flex">
              <h2 className="text-2xl font-bold text-white">Dashboard</h2>
            </div>
            <div className="flex items-center">
              <span className="text-white mr-4">{session?.user?.name}</span>
              <button
                onClick={() => signOut()}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
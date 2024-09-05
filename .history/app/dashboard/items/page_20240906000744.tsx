'use client';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import Link from 'next/link';
import prisma from '@/lib/prisma';

export default async function ItemsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const items = await prisma.item.findMany({
    where: { inventory: { userId: session.user.id } },
    include: { inventory: true }
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Items</h1>
      {items.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-xl text-white mb-4">You don't have any items yet.</p>
          <Link href="/dashboard/items/new" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out">
            Add New Item
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(item => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
      <div className="text-center mt-6">
        <Link href="/dashboard/items/new" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out">
          Add New Item
        </Link>
      </div>
    </div>
  );
}

function ItemCard({ item }) {
  return (
    <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-xl p-6 shadow-xl relative">
      <h3 className="text-xl font-semibold text-white mb-2">{item.name}</h3>
      <p className="text-indigo-200 mb-2">Quantity: {item.quantity}</p>
      <p className="text-indigo-200 mb-4">Inventory: {item.inventory.name}</p>
      {item.image && (
        <img
          src={`data:image/jpeg;base64,${item.image.toString('base64')}`}
          alt={item.name}
          className="absolute top-2 right-2 w-16 h-16 object-cover rounded-full border-2 border-white"
        />
      )}
      <Link href={`/dashboard/items/${item.id}`} className="text-indigo-400 hover:text-indigo-300">
        View Details →
      </Link>
    </div>
  );
}
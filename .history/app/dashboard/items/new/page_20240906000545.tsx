import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import NewItemForm from "@/components/NewItemForm";
import prisma from '@/lib/prisma';

export default async function NewItemPage() {
	const session = await getServerSession(authOptions);

	if (!session) {
		redirect("/login");
	}

	const inventories = await prisma.inventory.findMany({
		where: { userId: session.user.id },
		select: { id: true, name: true }
	});

	if (inventories.length === 0) {
		return (
			<div className="text-center py-10">
				<p className="text-xl text-white mb-4">You need to create an inventory first.</p>
				<Link href="/dashboard/inventories/new" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out">
					Create New Inventory
				</Link>
			</div>
		);
	}

	return <NewItemForm inventories={inventories} />;
}
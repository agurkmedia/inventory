import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import Link from 'next/link';

export default async function Dashboard() {
	const session = await getServerSession(authOptions);

	if (!session || !session.user) {
		// Redirect to login if not authenticated
		return (
			<div className="flex items-center justify-center h-full">
				<Link href="/login" className="text-white">Please log in</Link>
			</div>
		);
	}

	const userId = session.user.id;
	const inventories = await prisma.inventory.findMany({
		where: { userId },
	});

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
}
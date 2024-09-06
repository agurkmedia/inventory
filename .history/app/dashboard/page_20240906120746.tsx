import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import DashboardClient from '@/app/components/DashboardClient';
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
  const dashboardData = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      inventories: true,
      items: true,
      recentActivity: {
        orderBy: { updatedAt: 'desc' },
        take: 10,
      },
    },
  });

  return <DashboardClient dashboardData={dashboardData} />;
}
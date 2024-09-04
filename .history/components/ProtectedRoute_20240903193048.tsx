'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    console.log('ProtectedRoute - status:', status);
    console.log('ProtectedRoute - session:', session);
    if (status === 'unauthenticated' || !session?.user) {
      router.push('/');
    }
  }, [status, session, router]);

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  return <>{children}</>;
}
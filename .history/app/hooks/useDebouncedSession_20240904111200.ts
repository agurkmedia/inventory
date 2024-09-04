import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

export function useDebouncedSession(delay = 300) {
  const { data: session, status } = useSession();
  const [debouncedSession, setDebouncedSession] = useState(session);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSession(session);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [session, delay]);

  return { session: debouncedSession, status };
}
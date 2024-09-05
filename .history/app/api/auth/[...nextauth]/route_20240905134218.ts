import NextAuth from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { auth } from '@/lib/auth';

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

// Example of using getServerSession in an API route
export async function GET(req, res) {
  const session = await auth(req, res);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  // Your API logic here
}
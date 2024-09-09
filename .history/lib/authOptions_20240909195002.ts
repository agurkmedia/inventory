import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import prisma from './prisma';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async session({ session, token }) {
      // Attach the userId from the token to the session
      if (token?.sub) {
        session.user.id = token.sub; // `sub` is typically the user ID in JWT
      }
      return session;
    },
    async jwt({ token, user }) {
      // Attach the user ID to the token
      if (user) {
        token.sub = user.id; // `sub` is typically the user ID in JWT
      }
      return token;
    },
  },
};

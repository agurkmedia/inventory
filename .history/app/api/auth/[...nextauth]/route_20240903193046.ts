import { PrismaAdapter } from "@next-auth/prisma-adapter"
import NextAuth, { AuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import prisma from "@/lib/prisma"
import bcrypt from "bcrypt"

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })
        if (!user) {
          return null
        }
        const isPasswordValid = await bcrypt.compare(credentials.password, user.password)
        if (!isPasswordValid) {
          return null
        }
        return { id: user.id, email: user.email, name: user.name }
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/login"
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      console.log('Session callback - token:', token);
      console.log('Session callback - session:', session);
      if (session.user) {
        const user = await prisma.user.findUnique({
          where: { id: token.id as string }
        });
        if (!user) {
          console.log('User not found, invalidating session');
          return null;
        }
        session.user.id = token.id as string;
      }
      return session;
    },
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
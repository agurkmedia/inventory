// types/next-auth.d.ts

import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;    // Add `id` to the session object
      name?: string;
      email?: string;
      image?: string;
    };
  }
}
npm
import NextAuth from "next-auth";
import { AuthOptions } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export const authOptions: AuthOptions = {
  // Your NextAuth configuration
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
export { authOptions };

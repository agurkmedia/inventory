import NextAuth from "next-auth";
import { authOptions } from "@/lib/authOptions";

// Create the NextAuth handler with the appropriate options
const handler = NextAuth(authOptions);

// Export the GET and POST handlers using Next.js's expected structure
export { handler as GET, handler as POST };

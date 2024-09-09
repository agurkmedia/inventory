import NextAuth from "next-auth";
import type { AuthOptions } from "next-auth";
import { authOptions } from "@/lib/authOptions";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

// Export authOptions as a named export
export { authOptions };

// Also export it as default for backwards compatibility
export default authOptions;
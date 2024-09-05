import { withAuth } from "next-auth/middleware"
import { authOptions } from "@/lib/authOptions"

export default withAuth(
  // `withAuth` augments your `Request` with the user's token.
  function middleware(req) {
    console.log(req.nextauth.token)
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    },
  }
)

export const config = { matcher: ["/dashboard/:path*"] }
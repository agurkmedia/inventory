import { withAuth } from "next-auth/middleware"

export default withAuth(  )

export const config = { matcher: ["/dashboard/:path*"] }
function onSuccess(req) {
  // Handle successful authentication
  console.log("Authentication successful for:", req.nextauth.token);
}

function onError(error, req) {
  console.error("Authentication error:", error);
}

// Export the middleware function
export default withAuth(
  function middleware(req) {
    // Custom middleware logic can be added here if needed
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
    secret: process.env.NEXTAUTH_SECRET,
    onSuccess,
    onError,
  }
)

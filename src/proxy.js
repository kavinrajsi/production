import { auth } from "@/lib/auth/server";

// Validates the session cookie, refreshes tokens, and redirects
// unauthenticated requests to /login. Public paths (auth pages, the
// /api/auth proxy, static assets) are excluded via the matcher — pages
// themselves still gate with requireEmployee()/requireRole().
export const proxy = auth.middleware({ loginUrl: "/login" });

export const config = {
  matcher: [
    "/((?!_next|favicon.ico|login|signup|forgot-password|reset-password|api/auth|.*\\..*).*)",
  ],
};

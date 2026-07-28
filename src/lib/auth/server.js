import { createNeonAuth } from "@neondatabase/auth/next/server";

// Server-side Neon Auth instance: session reads, the /api/auth handler,
// and the route-protection middleware all hang off this object.
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET,
  },
});

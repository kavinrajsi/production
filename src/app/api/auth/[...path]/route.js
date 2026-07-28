import { auth } from "@/lib/auth/server";

// Proxies all Better Auth endpoints (sign-in/email, sign-up/email, sign-out,
// request-password-reset, reset-password, get-session, ...) to Neon Auth.
export const { GET, POST, PUT, DELETE, PATCH } = auth.handler();

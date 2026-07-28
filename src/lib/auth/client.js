"use client";

import { createAuthClient } from "@neondatabase/auth/next";

// Browser-side auth client. Talks to the app's own /api/auth/* proxy route,
// so it needs no env configuration.
export const authClient = createAuthClient();

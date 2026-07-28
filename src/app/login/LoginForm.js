"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import {
  isAllowedEmail,
  EMAIL_DOMAIN_ERROR,
  ALLOWED_EMAIL_DOMAIN,
} from "@/lib/auth/emailDomain";

export default function LoginForm({ next }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr(null);
    if (!isAllowedEmail(email)) {
      setErr(EMAIL_DOMAIN_ERROR);
      return;
    }
    setLoading(true);
    const { error } = await authClient.signIn.email({ email, password });
    setLoading(false);
    if (error) {
      setErr(error.message || "Sign in failed.");
      return;
    }
    router.replace(next || "/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="stack">
      <label>Work email</label>
      <input
        type="email"
        required
        autoComplete="email"
        placeholder={`you@${ALLOWED_EMAIL_DOMAIN}`}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <label>Password</label>
      <input
        type="password"
        required
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {err ? <div className="alert error">{err}</div> : null}
      <button type="submit" disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import {
  isAllowedEmail,
  EMAIL_DOMAIN_ERROR,
  ALLOWED_EMAIL_DOMAIN,
} from "@/lib/auth/emailDomain";

export default function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr(null);
    setInfo(null);

    if (!isAllowedEmail(email)) {
      setErr(EMAIL_DOMAIN_ERROR);
      return;
    }
    if (password !== confirm) {
      setErr("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    const { data, error } = await authClient.signUp.email({
      email,
      password,
      name: email.split("@")[0],
    });
    setLoading(false);

    if (error) {
      setErr(error.message || "Sign up failed.");
      return;
    }

    if (data?.token || data?.session) {
      router.replace("/");
      router.refresh();
      return;
    }

    setInfo("Check your inbox to confirm your email before signing in.");
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
        autoComplete="new-password"
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <label>Confirm password</label>
      <input
        type="password"
        required
        autoComplete="new-password"
        minLength={8}
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
      />
      {err ? <div className="alert error">{err}</div> : null}
      {info ? <div className="alert">{info}</div> : null}
      <button type="submit" disabled={loading}>
        {loading ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}

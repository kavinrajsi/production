"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import {
  isAllowedEmail,
  EMAIL_DOMAIN_ERROR,
  ALLOWED_EMAIL_DOMAIN,
} from "@/lib/auth/emailDomain";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
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
    setLoading(true);
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);

    if (error) {
      setErr(error.message || "Request failed.");
      return;
    }
    setInfo("If an account exists for that email, a reset link is on its way.");
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
      {err ? <div className="alert error">{err}</div> : null}
      {info ? <div className="alert">{info}</div> : null}
      <button type="submit" disabled={loading}>
        {loading ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}

"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth/client";

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="alert error">
        This reset link is invalid or has expired. Request a new one.
      </div>
    );
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr(null);
    setInfo(null);

    if (password !== confirm) {
      setErr("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    const { error } = await authClient.resetPassword({
      newPassword: password,
      token,
    });
    setLoading(false);

    if (error) {
      setErr(error.message || "Reset failed.");
      return;
    }
    setInfo("Password updated. Redirecting to sign in…");
    setTimeout(() => {
      router.replace("/login");
    }, 800);
  }

  return (
    <form onSubmit={onSubmit} className="stack">
      <label>New password</label>
      <input
        type="password"
        required
        autoComplete="new-password"
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <label>Confirm new password</label>
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
        {loading ? "Saving…" : "Update password"}
      </button>
    </form>
  );
}

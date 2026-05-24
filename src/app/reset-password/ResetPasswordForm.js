"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isAllowedEmail, EMAIL_DOMAIN_ERROR } from "@/lib/auth/emailDomain";

export default function ResetPasswordForm() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data?.user) {
        setErr(
          "This reset link is invalid or has expired. Request a new one."
        );
      } else if (!isAllowedEmail(data.user.email)) {
        setErr(EMAIL_DOMAIN_ERROR);
        supabase.auth.signOut().catch(() => {});
      } else {
        setAllowed(true);
      }
      setReady(true);
    });
  }, []);

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
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setErr(error.message);
      return;
    }
    setInfo("Password updated. Redirecting…");
    setTimeout(() => {
      router.replace("/");
      router.refresh();
    }, 800);
  }

  if (!ready) {
    return <div className="muted">Loading…</div>;
  }

  if (!allowed) {
    return err ? <div className="alert error">{err}</div> : null;
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

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function label(s) {
  return s.replace("_", " ");
}

export default function StatusEditor({ shootId, options }) {
  const router = useRouter();
  const [next, setNext] = useState(options[0] ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  if (!options.length) return null;

  async function onSubmit(e) {
    e.preventDefault();
    if (!next) return;
    setErr(null);
    setBusy(true);
    const res = await fetch(`/api/shoots/${shootId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setBusy(false);
    if (!res.ok) {
      const e2 = await res.json().catch(() => ({}));
      setErr(e2.error || "Update failed");
      return;
    }
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      style={{
        display: "flex",
        gap: 6,
        alignItems: "center",
        marginTop: 6,
        flexWrap: "wrap",
      }}
    >
      <select
        value={next}
        onChange={(e) => setNext(e.target.value)}
        disabled={busy}
        style={{ width: "auto" }}
      >
        {options.map((s) => (
          <option key={s} value={s}>
            Move to {label(s)}
          </option>
        ))}
      </select>
      <button type="submit" disabled={busy}>
        {busy ? "Updating…" : "Update"}
      </button>
      {err ? (
        <span
          className="alert error"
          style={{ padding: "2px 8px", fontSize: 12 }}
        >
          {err}
        </span>
      ) : null}
    </form>
  );
}

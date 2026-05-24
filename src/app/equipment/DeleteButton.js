"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteButton({ id }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (!confirm("Delete this equipment? This cannot be undone.")) return;
    setBusy(true);
    const res = await fetch(`/api/equipment/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || "Delete failed");
      return;
    }
    router.refresh();
  }

  return (
    <button
      type="button"
      className="danger"
      onClick={onClick}
      disabled={busy}
      style={{ padding: "2px 8px", fontSize: 13 }}
    >
      {busy ? "Deleting…" : "Delete"}
    </button>
  );
}

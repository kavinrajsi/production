"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function EquipmentForm({ initial, equipmentId }) {
  const router = useRouter();
  const isEdit = Boolean(equipmentId);
  const [form, setForm] = useState({
    name: initial?.name || "",
    description: initial?.description || "",
    category: initial?.category || "",
    quantity: initial?.quantity ?? 1,
    image_url: initial?.image_url || "",
    is_active: initial?.is_active ?? true,
  });
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const payload = { ...form, quantity: Number(form.quantity) };
    const res = await fetch(
      isEdit ? `/api/equipment/${equipmentId}` : "/api/equipment",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    setBusy(false);
    if (!res.ok) {
      const e2 = await res.json().catch(() => ({}));
      setErr(e2.error || "Save failed");
      return;
    }
    router.push("/admin/equipment");
    router.refresh();
  }

  return (
    <form className="stack" onSubmit={onSubmit}>
      <label>Name *</label>
      <input
        required
        value={form.name}
        onChange={(e) => set("name", e.target.value)}
      />

      <label>Category</label>
      <input
        list="cats"
        value={form.category}
        onChange={(e) => set("category", e.target.value)}
        placeholder="e.g. Camera, Lens, Lighting, Audio, Grip"
      />
      <datalist id="cats">
        <option value="Camera" />
        <option value="Lens" />
        <option value="Lighting" />
        <option value="Audio" />
        <option value="Grip" />
        <option value="Accessory" />
      </datalist>

      <label>Description</label>
      <textarea
        value={form.description}
        onChange={(e) => set("description", e.target.value)}
      />

      <div className="row">
        <div>
          <label>Quantity *</label>
          <input
            type="number"
            min={0}
            required
            value={form.quantity}
            onChange={(e) => set("quantity", e.target.value)}
          />
        </div>
        <div>
          <label>Image URL</label>
          <input
            value={form.image_url}
            onChange={(e) => set("image_url", e.target.value)}
            placeholder="https://…"
          />
        </div>
      </div>

      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(e) => set("is_active", e.target.checked)}
          style={{ width: "auto" }}
        />
        Active (visible to photographers)
      </label>

      {err ? <div className="alert error">{err}</div> : null}

      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" disabled={busy}>
          {busy ? "Saving…" : isEdit ? "Save changes" : "Add equipment"}
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => router.push("/admin/equipment")}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

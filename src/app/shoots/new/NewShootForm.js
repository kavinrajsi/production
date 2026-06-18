"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { blockNonInteger, blurOnWheel, clampInt } from "@/lib/forms/number";

function toLocalIso(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultStart() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return toLocalIso(d);
}
function defaultEnd() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 3);
  return toLocalIso(d);
}

export default function NewShootForm({ employee, equipment }) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    client_name: "",
    location: "",
    shoot_start: defaultStart(),
    shoot_end: defaultEnd(),
    notes: "",
  });
  const [picked, setPicked] = useState({}); // equipment_id -> qty
  const [availability, setAvailability] = useState({}); // id -> available
  const [checking, setChecking] = useState(false);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const grouped = useMemo(() => {
    return equipment.reduce((acc, it) => {
      const k = it.category || "Uncategorized";
      (acc[k] ||= []).push(it);
      return acc;
    }, {});
  }, [equipment]);

  useEffect(() => {
    if (!form.shoot_start || !form.shoot_end) return;
    if (new Date(form.shoot_end) < new Date(form.shoot_start)) return;
    let cancelled = false;
    setChecking(true);
    fetch(
      `/api/shoots/availability?start=${encodeURIComponent(
        new Date(form.shoot_start).toISOString()
      )}&end=${encodeURIComponent(new Date(form.shoot_end).toISOString())}`
    )
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const map = {};
        for (const row of d.items || []) map[row.id] = row.available;
        setAvailability(map);
      })
      .catch(() => {})
      .finally(() => !cancelled && setChecking(false));
    return () => {
      cancelled = true;
    };
  }, [form.shoot_start, form.shoot_end]);

  function setQty(eqId, qty) {
    setPicked((p) => {
      const next = { ...p };
      if (!qty || qty <= 0) delete next[eqId];
      else next[eqId] = qty;
      return next;
    });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr(null);

    if (new Date(form.shoot_end) < new Date(form.shoot_start)) {
      setErr("End must be on or after the start.");
      return;
    }

    const items = Object.entries(picked).map(([id, qty]) => ({
      equipment_id: Number(id),
      quantity: Number(qty),
    }));

    setBusy(true);
    const res = await fetch("/api/shoots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shoot: {
          title: form.title,
          client_name: form.client_name || null,
          location: form.location || null,
          shoot_start: new Date(form.shoot_start).toISOString(),
          shoot_end: new Date(form.shoot_end).toISOString(),
          notes: form.notes || null,
        },
        items,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setErr(d.error || "Failed to create shoot");
      return;
    }
    const d = await res.json();
    router.push(`/shoots/${d.id}`);
    router.refresh();
  }

  const pickedIds = Object.keys(picked);

  return (
    <form className="stack" onSubmit={onSubmit}>
      <div className="card stack">
        <p className="muted" style={{ marginTop: 0 }}>
          Photographer: <strong>{employee.name}</strong>
        </p>

        <label>Shoot title *</label>
        <input
          required
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="e.g. Acme Co. headshots"
        />

        <div className="row">
          <div>
            <label>Client name</label>
            <input
              value={form.client_name}
              onChange={(e) => set("client_name", e.target.value)}
            />
          </div>
          <div>
            <label>Location</label>
            <input
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
            />
          </div>
        </div>

        <div className="row">
          <div>
            <label>Start *</label>
            <input
              type="datetime-local"
              required
              value={form.shoot_start}
              onChange={(e) => set("shoot_start", e.target.value)}
            />
          </div>
          <div>
            <label>End *</label>
            <input
              type="datetime-local"
              required
              min={form.shoot_start}
              value={form.shoot_end}
              onChange={(e) => set("shoot_end", e.target.value)}
            />
          </div>
        </div>

        <label>Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Anything else the production team should know"
        />
      </div>

      <h2 style={{ marginBottom: 0 }}>
        Pick equipment{" "}
        {checking ? <span className="muted">· checking availability…</span> : null}
      </h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Quantities are limited to what&rsquo;s free during the dates above.
      </p>

      {Object.keys(grouped).length === 0 ? (
        <div className="alert">No equipment in the catalog yet.</div>
      ) : null}

      {Object.entries(grouped).map(([cat, list]) => (
        <section key={cat} className="card">
          <h3 style={{ margin: "0 0 8px" }}>{cat}</h3>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Available</th>
                <th style={{ width: 110 }}>Qty</th>
              </tr>
            </thead>
            <tbody>
              {list.map((it) => {
                const avail = availability[it.id];
                const max =
                  typeof avail === "number" ? avail : it.quantity;
                const currentPicked = picked[it.id] || 0;
                return (
                  <tr key={it.id}>
                    <td>
                      <strong>{it.name}</strong>
                      {it.description ? (
                        <div className="muted" style={{ fontSize: 13 }}>
                          {it.description}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <span
                        className={`badge ${max <= 0 ? "red" : max < it.quantity ? "amber" : "green"}`}
                      >
                        {Math.max(0, max)} / {it.quantity}
                      </span>
                    </td>
                    <td>
                      <input
                        type="number"
                        inputMode="numeric"
                        step={1}
                        min={0}
                        max={Math.max(0, max)}
                        value={currentPicked}
                        disabled={max <= 0}
                        onKeyDown={blockNonInteger}
                        onWheel={blurOnWheel}
                        onChange={(e) =>
                          setQty(it.id, clampInt(e.target.value, 0, Math.max(0, max)))
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ))}

      {err ? <div className="alert error">{err}</div> : null}

      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" disabled={busy || !form.title}>
          {busy ? "Booking…" : `Book shoot (${pickedIds.length} item${pickedIds.length === 1 ? "" : "s"})`}
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => router.push("/shoots")}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";

export default function PhotoUploader({ shootId, kind }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState(null);

  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    setUploading(true);
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: `/api/shoots/${shootId}/photos/upload-token`,
        clientPayload: JSON.stringify({ kind }),
      });
      const res = await fetch(`/api/shoots/${shootId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, url: blob.url }),
      });
      if (!res.ok) {
        const e2 = await res.json().catch(() => ({}));
        throw new Error(e2.error || "Failed to record photo");
      }
      router.refresh();
    } catch (e2) {
      setErr(e2?.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="stack" style={{ gap: 6 }}>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={onFile}
        disabled={uploading}
      />
      {uploading ? <div className="muted">Uploading…</div> : null}
      {err ? <div className="alert error">{err}</div> : null}
    </div>
  );
}

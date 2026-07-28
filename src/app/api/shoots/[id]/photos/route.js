import { NextResponse } from "next/server";
import { requireEmployee } from "@/lib/auth/currentEmployee";
import {
  canUploadPhotoKind,
  getShoot,
  recordShootPhoto,
  SHOOT_PHOTO_KINDS,
} from "@/lib/db/shoots";

function isVercelBlobUrl(url) {
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      u.hostname.endsWith(".public.blob.vercel-storage.com")
    );
  } catch {
    return false;
  }
}

export async function POST(request, { params }) {
  const ctx = await requireEmployee();
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const kind = body?.kind;
  const url = body?.url;

  if (!SHOOT_PHOTO_KINDS.includes(kind)) {
    return NextResponse.json(
      { error: "kind must be 'before' or 'after'" },
      { status: 400 }
    );
  }
  if (!url || !isVercelBlobUrl(url)) {
    return NextResponse.json(
      { error: "url must be a Vercel Blob URL" },
      { status: 400 }
    );
  }

  const shoot = await getShoot(id);
  if (!shoot) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isAdmin = ctx.roles.includes("admin");
  const isOwner = shoot.photographer_id === ctx.employee.id;
  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!canUploadPhotoKind(shoot.status, kind)) {
    return NextResponse.json(
      {
        error: `Cannot upload "${kind}" photos while shoot is ${shoot.status}.`,
      },
      { status: 400 }
    );
  }

  try {
    const row = await recordShootPhoto({
      shootId: shoot.id,
      kind,
      url,
      uploadedBy: ctx.employee.id,
    });
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Insert failed" },
      { status: 400 }
    );
  }
}

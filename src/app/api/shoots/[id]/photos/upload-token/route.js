import { NextResponse } from "next/server";
import { handleUpload } from "@vercel/blob/client";
import { requireEmployee } from "@/lib/auth/currentEmployee";
import {
  canUploadPhotoKind,
  getShoot,
  SHOOT_PHOTO_KINDS,
} from "@/lib/db/shoots";

export async function POST(request, { params }) {
  const { id } = await params;
  const body = await request.json();

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const ctx = await requireEmployee();
        const shoot = await getShoot(id);
        if (!shoot) {
          throw new Error("Shoot not found");
        }

        const isAdmin = ctx.roles.includes("admin");
        const isOwner = shoot.photographer_id === ctx.employee.id;
        if (!isAdmin && !isOwner) {
          throw new Error("Forbidden");
        }

        let kind = null;
        try {
          kind = clientPayload ? JSON.parse(clientPayload).kind : null;
        } catch {
          // fall through
        }
        if (!SHOOT_PHOTO_KINDS.includes(kind)) {
          throw new Error("Invalid photo kind");
        }
        if (!canUploadPhotoKind(shoot.status, kind)) {
          throw new Error(
            `Cannot upload "${kind}" photos while shoot is ${shoot.status}.`
          );
        }

        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
          ],
          addRandomSuffix: true,
          maximumSizeInBytes: 25 * 1024 * 1024,
          tokenPayload: JSON.stringify({ shootId: id, kind }),
        };
      },
      onUploadCompleted: async () => {
        // No-op: the client records the DB row via POST /api/shoots/[id]/photos
        // after upload() resolves. Vercel can't call back to localhost in dev.
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Upload failed" },
      { status: 400 }
    );
  }
}

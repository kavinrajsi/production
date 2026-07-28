import { notFound } from "next/navigation";
import Link from "next/link";
import { requireEmployee } from "@/lib/auth/currentEmployee";
import {
  canUploadPhotoKind,
  getShoot,
  listShootPhotos,
  SHOOT_PHOTO_KINDS,
} from "@/lib/db/shoots";
import PhotoUploader from "./PhotoUploader";

export const dynamic = "force-dynamic";

function fmt(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function uploaderName(emp) {
  if (!emp) return "Unknown";
  return (
    [emp.first_name, emp.last_name].filter(Boolean).join(" ") ||
    emp.work_email ||
    "Unknown"
  );
}

function PhotoGrid({ photos }) {
  if (!photos.length) {
    return <p className="muted">No photos yet.</p>;
  }
  return (
    <div className="photo-grid">
      {photos.map((p) => (
        <a
          key={p.id}
          href={p.url}
          target="_blank"
          rel="noopener noreferrer"
          title={`${uploaderName(p.employees)} · ${fmt(p.uploaded_at)}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.url} alt="Shoot photo" />
        </a>
      ))}
    </div>
  );
}

export default async function ShootPhotosPage({ params }) {
  const ctx = await requireEmployee();
  const { id } = await params;
  const shoot = await getShoot(id);
  if (!shoot) notFound();

  const photos = await listShootPhotos(shoot.id);
  const isAdmin = ctx.roles.includes("admin");
  const isOwner = shoot.photographer_id === ctx.employee.id;
  const canEdit = isAdmin || isOwner;

  const sections = SHOOT_PHOTO_KINDS.map((kind) => ({
    kind,
    label: kind === "before" ? "Before shoot" : "After shoot",
    photos: photos.filter((p) => p.kind === kind),
    canUpload: canEdit && canUploadPhotoKind(shoot.status, kind),
  }));

  return (
    <div className="stack">
      <div className="toolbar">
        <h1 style={{ margin: 0 }}>Photos · {shoot.title}</h1>
        <Link href={`/shoots/${shoot.id}`} className="btn secondary">
          Back to shoot
        </Link>
      </div>

      <p className="muted" style={{ marginTop: 0 }}>
        Status: <strong>{shoot.status}</strong>
      </p>

      {sections.map((s) => (
        <section key={s.kind} className="card stack">
          <h2 style={{ margin: 0 }}>{s.label}</h2>
          <PhotoGrid photos={s.photos} />
          {s.canUpload ? (
            <PhotoUploader shootId={shoot.id} kind={s.kind} />
          ) : canEdit ? (
            <p className="muted" style={{ fontSize: 13 }}>
              Uploads for &ldquo;{s.kind}&rdquo; are closed in the{" "}
              <strong>{shoot.status}</strong> state.
            </p>
          ) : null}
        </section>
      ))}
    </div>
  );
}

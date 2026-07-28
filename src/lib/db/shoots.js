import { sql, withTransaction } from "./client";

export const SHOOT_STATUSES = [
  "planned",
  "in_progress",
  "completed",
  "cancelled",
];

const STATUS_TRANSITIONS = {
  planned: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function nextStatuses(current) {
  return STATUS_TRANSITIONS[current] ?? [];
}

export function canTransition(from, to) {
  return nextStatuses(from).includes(to);
}

export async function updateShootStatus(id, status) {
  const rows = await sql`
    update production_shoots set status = ${status} where id = ${id} returning *
  `;
  return rows[0];
}

export const SHOOT_PHOTO_KINDS = ["before", "after"];

const PHOTO_KIND_STATUSES = {
  before: ["planned", "in_progress"],
  after: ["in_progress", "completed"],
};

export function canUploadPhotoKind(shootStatus, kind) {
  return (PHOTO_KIND_STATUSES[kind] ?? []).includes(shootStatus);
}

export async function listShootPhotos(shootId) {
  return await sql`
    select p.id, p.kind, p.url, p.uploaded_at,
      case when e.id is null then null else json_build_object(
        'first_name', e.first_name,
        'last_name', e.last_name,
        'work_email', e.work_email
      ) end as employees
    from production_shoot_photos p
    left join employees e on e.id = p.uploaded_by
    where p.shoot_id = ${shootId}
    order by p.uploaded_at asc
  `;
}

export async function recordShootPhoto({ shootId, kind, url, uploadedBy }) {
  const rows = await sql`
    insert into production_shoot_photos (shoot_id, kind, url, uploaded_by)
    values (${shootId}, ${kind}, ${url}, ${uploadedBy ?? null})
    returning *
  `;
  return rows[0];
}

export async function listShoots({ photographerId } = {}) {
  const pid = photographerId ?? null;
  return await sql`
    select s.id, s.title, s.client_name, s.location, s.shoot_start, s.shoot_end,
      s.status, s.photographer_id,
      case when e.id is null then null else json_build_object(
        'first_name', e.first_name,
        'last_name', e.last_name,
        'work_email', e.work_email
      ) end as employees
    from production_shoots s
    left join employees e on e.id = s.photographer_id
    where ${pid}::bigint is null or s.photographer_id = ${pid}::bigint
    order by s.shoot_start desc
  `;
}

export async function getShoot(id) {
  if (!/^\d+$/.test(String(id))) return null;
  const rows = await sql`
    select s.*,
      case when e.id is null then null else json_build_object(
        'first_name', e.first_name,
        'last_name', e.last_name,
        'work_email', e.work_email
      ) end as employees
    from production_shoots s
    left join employees e on e.id = s.photographer_id
    where s.id = ${id}
  `;
  const shoot = rows[0];
  if (!shoot) return null;

  const items = await sql`
    select se.id, se.quantity,
      json_build_object(
        'id', eq.id,
        'name', eq.name,
        'category', eq.category,
        'description', eq.description,
        'image_url', eq.image_url
      ) as equipment
    from production_shoot_equipment se
    join production_equipment eq on eq.id = se.equipment_id
    where se.shoot_id = ${id}
  `;

  return { ...shoot, items };
}

export async function availabilityFor({ start, end, excludeShootId = null }) {
  return await sql`
    select e.id, e.name, e.category, e.description, e.quantity, e.is_active,
      coalesce(
        equipment_available_qty(e.id, ${start}, ${end}, ${excludeShootId}::bigint),
        e.quantity
      ) as available
    from production_equipment e
    where e.is_active
    order by e.category asc nulls last, e.name asc
  `;
}

export async function createShootWithEquipment({ shoot, items }) {
  const validItems = (items ?? []).filter(
    (it) => it.equipment_id && it.quantity > 0
  );

  return withTransaction(async (client) => {
    const {
      rows: [inserted],
    } = await client.query(
      `insert into production_shoots
         (title, client_name, location, notes, shoot_start, shoot_end, status, photographer_id)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning *`,
      [
        shoot.title,
        shoot.client_name ?? null,
        shoot.location ?? null,
        shoot.notes ?? null,
        shoot.shoot_start,
        shoot.shoot_end,
        shoot.status ?? "planned",
        shoot.photographer_id ?? null,
      ]
    );

    if (validItems.length > 0) {
      // Serialize concurrent bookings of the same equipment so the
      // availability check below cannot race.
      await client.query(
        `select id from production_equipment where id = any($1::bigint[]) for update`,
        [validItems.map((it) => it.equipment_id)]
      );

      for (const it of validItems) {
        await client.query(
          `insert into production_shoot_equipment (shoot_id, equipment_id, quantity)
           values ($1, $2, $3)`,
          [inserted.id, it.equipment_id, it.quantity]
        );
      }

      for (const it of validItems) {
        const {
          rows: [check],
        } = await client.query(
          `select equipment_available_qty($1, $2, $3, null) as available,
                  (select name from production_equipment where id = $1) as name`,
          [it.equipment_id, shoot.shoot_start, shoot.shoot_end]
        );
        if (check && check.available != null && check.available < 0) {
          const err = new Error(
            `Not enough availability for "${check.name ?? "item"}" in that date range.`
          );
          err.code = "AVAILABILITY";
          throw err; // rolls back the whole transaction
        }
      }
    }

    return inserted;
  });
}

export async function getAdminNotifyRecipients() {
  let fromDb = [];
  try {
    const rows = await sql`
      select distinct e.work_email, e.first_name, e.last_name
      from employees e
      join employee_roles er on er.employee_id = e.id
      join roles r on r.id = er.role_id
      where r.name = 'admin' and e.employee_status = 'active'
    `;
    fromDb = rows
      .map((e) => ({
        address: e.work_email,
        name: [e.first_name, e.last_name].filter(Boolean).join(" "),
      }))
      .filter((r) => r.address);
  } catch (error) {
    console.error("[shoots] fetch admins failed", error);
  }

  const envList = (process.env.ADMIN_NOTIFY_EMAILS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((address) => ({ address }));

  const seen = new Set();
  return [...fromDb, ...envList].filter((r) => {
    const k = r.address.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

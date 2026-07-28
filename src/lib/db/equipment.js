import { sql } from "./client";

export async function listEquipment({ includeInactive = false } = {}) {
  return await sql`
    select id, name, description, category, quantity, image_url, is_active, created_at
    from production_equipment
    where ${includeInactive} or is_active
    order by category asc nulls last, name asc
  `;
}

export async function getEquipment(id) {
  if (!/^\d+$/.test(String(id))) return null;
  const rows = await sql`
    select * from production_equipment where id = ${id}
  `;
  return rows[0] ?? null;
}

export async function createEquipment(payload, createdBy) {
  const rows = await sql`
    insert into production_equipment (name, description, category, quantity, image_url, is_active, created_by)
    values (
      ${payload.name},
      ${payload.description || null},
      ${payload.category || null},
      ${payload.quantity ?? 1},
      ${payload.image_url || null},
      ${payload.is_active ?? true},
      ${createdBy ?? null}
    )
    returning *
  `;
  return rows[0];
}

const UPDATABLE = [
  "name",
  "description",
  "category",
  "quantity",
  "image_url",
  "is_active",
];

export async function updateEquipment(id, payload) {
  const sets = [];
  const values = [];
  for (const k of UPDATABLE) {
    if (k in payload) {
      values.push(payload[k]);
      sets.push(`${k} = $${values.length}`);
    }
  }
  if (!sets.length) return getEquipment(id);
  values.push(id);
  const rows = await sql.query(
    `update production_equipment set ${sets.join(", ")} where id = $${values.length} returning *`,
    values
  );
  return rows[0];
}

export async function deleteEquipment(id) {
  await sql`delete from production_equipment where id = ${id}`;
}

import { sql } from "./client";

export async function getEmployeeByEmail(email) {
  const rows = await sql`
    select * from employees where lower(work_email) = lower(${email}) limit 1
  `;
  return rows[0] ?? null;
}

export async function getEmployeeRoles(employeeId) {
  const rows = await sql`
    select r.name
    from employee_roles er
    join roles r on r.id = er.role_id
    where er.employee_id = ${employeeId}
  `;
  return rows.map((r) => r.name);
}

export async function listEmployees({ q = "", status = "active" } = {}) {
  const like = `%${q}%`;
  return await sql`
    select id, first_name, middle_name, last_name, work_email,
      designation, department, employee_status, employee_type
    from employees
    where (${status === "all"} or employee_status = ${status})
      and (${q === ""}
        or first_name ilike ${like}
        or last_name ilike ${like}
        or work_email ilike ${like}
        or designation ilike ${like}
        or department ilike ${like})
    order by first_name asc
  `;
}

export async function rolesByEmployeeIds(ids) {
  if (!ids.length) return {};
  const rows = await sql`
    select er.employee_id, r.name
    from employee_roles er
    join roles r on r.id = er.role_id
    where er.employee_id = any(${ids}::bigint[])
  `;
  const map = {};
  for (const r of rows) {
    (map[r.employee_id] ||= []).push(r.name);
  }
  return map;
}

import { requireEmployee } from "@/lib/auth/currentEmployee";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function UsersPage({ searchParams }) {
  await requireEmployee();
  const sp = (await searchParams) || {};
  const q = (sp.q || "").toString().trim();
  const statusFilter = (sp.status || "active").toString();

  const admin = createAdminClient();
  let query = admin
    .from("employees")
    .select(
      "id, first_name, middle_name, last_name, work_email, designation, department, employee_status, employee_type"
    )
    .order("first_name", { ascending: true });

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("employee_status", statusFilter);
  }
  if (q) {
    const like = `%${q}%`;
    query = query.or(
      [
        `first_name.ilike.${like}`,
        `last_name.ilike.${like}`,
        `work_email.ilike.${like}`,
        `designation.ilike.${like}`,
        `department.ilike.${like}`,
      ].join(",")
    );
  }

  const { data: employees, error } = await query;
  const ids = (employees ?? []).map((e) => e.id);

  let rolesByEmployee = {};
  if (ids.length) {
    const { data: roleRows } = await admin
      .from("employee_roles")
      .select("employee_id, roles(name)")
      .in("employee_id", ids);
    for (const r of roleRows ?? []) {
      const k = r.employee_id;
      (rolesByEmployee[k] ||= []).push(r.roles?.name);
    }
  }

  return (
    <div className="stack">
      <h1>People</h1>

      <form className="row" method="get">
        <div style={{ flex: 2 }}>
          <label>Search</label>
          <input
            name="q"
            defaultValue={q}
            placeholder="Name, email, designation, department"
          />
        </div>
        <div style={{ flex: 1 }}>
          <label>Status</label>
          <select name="status" defaultValue={statusFilter}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All</option>
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <button type="submit">Filter</button>
        </div>
      </form>

      {error ? (
        <div className="alert error">
          Failed to load: {error.message || String(error)}
        </div>
      ) : null}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Designation</th>
              <th>Department</th>
              <th>Email</th>
              <th>Roles</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(employees ?? []).length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">
                  No people found.
                </td>
              </tr>
            ) : null}
            {(employees ?? []).map((p) => {
              const fullName = [p.first_name, p.middle_name, p.last_name]
                .filter(Boolean)
                .join(" ");
              const roles = (rolesByEmployee[p.id] || []).filter(Boolean);
              return (
                <tr key={p.id}>
                  <td>
                    <strong>{fullName || "—"}</strong>
                    {p.employee_type ? (
                      <div className="muted" style={{ fontSize: 12 }}>
                        {p.employee_type}
                      </div>
                    ) : null}
                  </td>
                  <td>{p.designation || "—"}</td>
                  <td>{p.department || "—"}</td>
                  <td>
                    <a href={`mailto:${p.work_email}`}>{p.work_email}</a>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {roles.length === 0 ? (
                        <span className="muted">—</span>
                      ) : (
                        roles.map((r) => (
                          <span key={r} className="badge">
                            {r}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        p.employee_status === "active" ? "green" : "gray"
                      }`}
                    >
                      {p.employee_status || "—"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ fontSize: 12 }}>
        Showing {(employees ?? []).length} {statusFilter === "all" ? "" : statusFilter}{" "}
        {(employees ?? []).length === 1 ? "person" : "people"}.
      </p>
    </div>
  );
}

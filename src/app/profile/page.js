import { requireEmployee } from "@/lib/auth/currentEmployee";
import ThemeToggle from "@/components/ThemeToggle";

export const dynamic = "force-dynamic";

function fmt(v) {
  if (v == null || v === "") return "—";
  return String(v);
}

export default async function ProfilePage() {
  const ctx = await requireEmployee();
  const e = ctx.employee;
  const fullName = [e.first_name, e.middle_name, e.last_name]
    .filter(Boolean)
    .join(" ");

  const rows = [
    ["Employee #", e.employee_number],
    ["Designation", e.designation],
    ["Department", e.department],
    ["Work email", e.work_email],
    ["Personal email", e.personal_email],
    ["Mobile", e.mobile_number],
    ["Date of joining", e.date_of_joining],
  ];

  return (
    <div className="stack">
      <h1>Profile</h1>

      <div className="card stack">
        <div className="row" style={{ alignItems: "center" }}>
          <div style={{ flex: "0 0 auto" }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 999,
                background: "var(--bg-elev-2)",
                border: "1px solid var(--border-strong)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--fg-strong)",
                fontSize: 22,
                fontWeight: 600,
              }}
            >
              {(e.first_name?.[0] || "?").toUpperCase()}
              {(e.last_name?.[0] || "").toUpperCase()}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{ fontSize: 18, fontWeight: 600, color: "var(--fg-strong)" }}
            >
              {fullName || ctx.user.email}
            </div>
            <div className="muted">{ctx.user.email}</div>
            <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {ctx.roles.length === 0 ? (
                <span className="badge">no role</span>
              ) : (
                ctx.roles.map((r) => (
                  <span key={r} className="badge">
                    {r}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <h2>Details</h2>
      <div className="card">
        <table>
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k}>
                <td className="muted" style={{ width: 200 }}>
                  {k}
                </td>
                <td>{fmt(v)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Preferences</h2>
      <div className="card">
        <ThemeToggle />
      </div>
    </div>
  );
}

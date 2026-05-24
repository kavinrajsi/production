import Link from "next/link";
import { requireEmployee } from "@/lib/auth/currentEmployee";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }) {
  const ctx = await requireEmployee();
  const sp = (await searchParams) || {};
  const isAdmin = ctx.roles.includes("admin");

  return (
    <div className="stack">
      {sp.error === "forbidden" ? (
        <div className="alert error">
          You don&rsquo;t have access to that page.
        </div>
      ) : null}

      <h1>
        Welcome,{" "}
        {[ctx.employee.first_name, ctx.employee.last_name]
          .filter(Boolean)
          .join(" ")}
      </h1>
      <p className="muted">
        Signed in as {ctx.user.email} ·{" "}
        {ctx.roles.length ? ctx.roles.join(", ") : "no role assigned"}
      </p>

      <div className="row">
        <Link href="/shoots/new" className="card" style={{ display: "block" }}>
          <h2 style={{ marginTop: 0 }}>Book a shoot</h2>
          <p className="muted">
            Enter shoot details and pick the equipment you&rsquo;ll need.
          </p>
        </Link>
        <Link href="/shoots" className="card" style={{ display: "block" }}>
          <h2 style={{ marginTop: 0 }}>My shoots</h2>
          <p className="muted">See upcoming and past shoots.</p>
        </Link>
        <Link href="/equipment" className="card" style={{ display: "block" }}>
          <h2 style={{ marginTop: 0 }}>Equipment catalog</h2>
          <p className="muted">Browse what&rsquo;s available.</p>
        </Link>
        {isAdmin ? (
          <Link
            href="/admin/equipment"
            className="card"
            style={{ display: "block" }}
          >
            <h2 style={{ marginTop: 0 }}>Manage equipment</h2>
            <p className="muted">Add, edit, or retire catalog items.</p>
          </Link>
        ) : null}
      </div>
    </div>
  );
}

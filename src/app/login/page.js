import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }) {
  const sp = (await searchParams) || {};
  return (
    <div className="stack" style={{ maxWidth: 360, margin: "40px auto" }}>
      <h1>Sign in</h1>
      {sp.error ? <div className="alert error">{sp.error}</div> : null}
      <LoginForm next={sp.next || "/"} />
      <p className="muted" style={{ fontSize: 13 }}>
        Don&rsquo;t have an account? Ask an admin to add you.
      </p>
    </div>
  );
}

import Link from "next/link";
import SignupForm from "./SignupForm";

export const dynamic = "force-dynamic";

export default async function SignupPage({ searchParams }) {
  const sp = (await searchParams) || {};
  return (
    <div className="stack" style={{ maxWidth: 360, margin: "40px auto" }}>
      <h1>Create account</h1>
      {sp.error ? <div className="alert error">{sp.error}</div> : null}
      <SignupForm />
      <p className="muted" style={{ fontSize: 13 }}>
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </div>
  );
}

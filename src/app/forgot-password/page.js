import Link from "next/link";
import ForgotPasswordForm from "./ForgotPasswordForm";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <div className="stack" style={{ maxWidth: 360, margin: "40px auto" }}>
      <h1>Forgot password</h1>
      <p className="muted" style={{ fontSize: 13 }}>
        We&rsquo;ll email you a link to reset your password.
      </p>
      <ForgotPasswordForm />
      <p className="muted" style={{ fontSize: 13 }}>
        Remembered it? <Link href="/login">Back to sign in</Link>
      </p>
    </div>
  );
}

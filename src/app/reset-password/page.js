import ResetPasswordForm from "./ResetPasswordForm";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <div className="stack" style={{ maxWidth: 360, margin: "40px auto" }}>
      <h1>Set a new password</h1>
      <ResetPasswordForm />
    </div>
  );
}

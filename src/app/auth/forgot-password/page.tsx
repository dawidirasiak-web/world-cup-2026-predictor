import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="wc-hero-card w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <p className="wc-kicker mb-3">Mundial 2026</p>
        <h1 className="text-2xl font-semibold tracking-tight">Reset hasła</h1>
        <p className="mt-2 text-sm text-slate-600">
          Wpisz email, a system przygotuje link do ustawienia nowego hasła.
        </p>
        <ForgotPasswordForm />
      </div>
    </main>
  );
}

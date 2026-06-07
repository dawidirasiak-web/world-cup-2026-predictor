import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="wc-hero-card w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <p className="wc-kicker mb-3">Mundial 2026</p>
        <h1 className="text-2xl font-semibold tracking-tight">Rejestracja</h1>
        <p className="mt-2 text-sm text-slate-600">
          Nowe konto otrzymuje rolę USER. Rolę ADMIN można nadać w bazie.
        </p>
        <RegisterForm />
        <p className="mt-6 text-sm text-slate-600">
          Masz już konto?{" "}
          <Link href="/auth/signin" className="font-medium text-slate-900">
            Zaloguj się
          </Link>
        </p>
      </div>
    </main>
  );
}

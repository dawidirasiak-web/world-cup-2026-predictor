import Link from "next/link";
import { Suspense } from "react";
import { SignInForm } from "@/components/auth/sign-in-form";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="wc-hero-card w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <p className="wc-kicker mb-3">Mundial 2026</p>
        <h1 className="text-2xl font-semibold tracking-tight">Logowanie</h1>
        <p className="mt-2 text-sm text-slate-600">
          Zaloguj się, żeby typować mecze i śledzić ranking.
        </p>
        <Suspense>
          <SignInForm />
        </Suspense>
        <div className="mt-6 flex justify-between text-sm">
          <Link href="/auth/register" className="font-medium text-slate-900">
            Utwórz konto
          </Link>
          <Link
            href="/auth/forgot-password"
            className="font-medium text-slate-900"
          >
            Reset hasła
          </Link>
        </div>
      </div>
    </main>
  );
}

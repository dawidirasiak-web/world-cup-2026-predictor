import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";
import { getRegistrationSettings } from "@/lib/registration-settings";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const registrationSettings = await getRegistrationSettings();

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="wc-hero-card w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <p className="wc-kicker mb-3">Mundial 2026</p>
        <h1 className="text-2xl font-semibold tracking-tight">Rejestracja</h1>
        {registrationSettings.blocked ? (
          <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Rejestracja jest obecnie zablokowana. Zaloguj sie na istniejace
            konto, aby typowac mecze i sledzic ranking.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-slate-600">
              Utworz konto gracza, zeby typowac mecze i sledzic ranking.
            </p>
            <RegisterForm />
          </>
        )}
        <p className="mt-6 text-sm text-slate-600">
          Masz juz konto?{" "}
          <Link href="/auth/signin" className="font-medium text-slate-900">
            Zaloguj sie
          </Link>
        </p>
      </div>
    </main>
  );
}

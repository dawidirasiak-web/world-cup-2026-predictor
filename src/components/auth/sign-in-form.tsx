"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const notice = searchParams.get("registered")
    ? "Konto utworzone. Możesz się zalogować."
    : searchParams.get("reset")
      ? "Hasło zmienione. Możesz się zalogować."
      : "";

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsPending(true);

    const formData = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });

    setIsPending(false);

    if (result?.error) {
      setError("Niepoprawny email lub hasło.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      {notice ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <label className="block text-sm font-medium text-slate-700">
        Email
        <input
          name="email"
          type="email"
          required
          className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Hasło
        <input
          name="password"
          type="password"
          required
          className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
        />
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-slate-950 px-4 py-2 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isPending ? "Logowanie..." : "Zaloguj"}
      </button>
    </form>
  );
}

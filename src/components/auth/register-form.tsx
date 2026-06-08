"use client";

import { useActionState } from "react";
import { registerUser, type FormState } from "@/app/auth/actions";

const initialState: FormState = {
  ok: false,
  message: "",
};

export function RegisterForm() {
  const [state, action, isPending] = useActionState(registerUser, initialState);

  return (
    <form action={action} className="mt-6 space-y-4">
      {state.message ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </p>
      ) : null}
      <label className="block text-sm font-medium text-slate-700">
        Nick gracza
        <input
          name="name"
          required
          minLength={2}
          className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Imię
          <input
            name="firstName"
            required
            minLength={2}
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Nazwisko
          <input
            name="lastName"
            required
            minLength={2}
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
          />
        </label>
      </div>
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
        Haslo
        <input
          name="password"
          type="password"
          required
          minLength={8}
          className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
        />
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-slate-950 px-4 py-2 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isPending ? "Tworzenie..." : "Utworz konto"}
      </button>
    </form>
  );
}

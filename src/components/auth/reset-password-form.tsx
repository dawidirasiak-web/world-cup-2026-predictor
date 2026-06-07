"use client";

import { useActionState } from "react";
import { resetPassword, type FormState } from "@/app/auth/actions";

const initialState: FormState = {
  ok: false,
  message: "",
};

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, isPending] = useActionState(resetPassword, initialState);

  return (
    <form action={action} className="mt-6 space-y-4">
      {state.message ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </p>
      ) : null}
      <input type="hidden" name="token" value={token} />
      <label className="block text-sm font-medium text-slate-700">
        Nowe haslo
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
        disabled={isPending || !token}
        className="w-full rounded-md bg-slate-950 px-4 py-2 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isPending ? "Zapisywanie..." : "Zmien haslo"}
      </button>
    </form>
  );
}

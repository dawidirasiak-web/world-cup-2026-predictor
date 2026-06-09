"use server";

import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { sendPasswordResetEmail } from "@/lib/mail";

const registerSchema = z.object({
  name: z.string().trim().min(2, "Podaj nick gracza."),
  firstName: z.string().trim().min(2, "Podaj imie."),
  lastName: z.string().trim().min(2, "Podaj nazwisko."),
  email: z.string().trim().email("Podaj poprawny email."),
  password: z.string().min(8, "Haslo musi miec co najmniej 8 znakow."),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Podaj poprawny email."),
});

const resetPasswordSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(8, "Haslo musi miec co najmniej 8 znakow."),
});

export type FormState = {
  ok: boolean;
  message: string;
  resetUrl?: string;
};

const defaultError = {
  ok: false,
  message: "Nie udalo sie zapisac danych. Sprobuj ponownie.",
};

export async function registerUser(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? defaultError.message,
    };
  }

  const email = parsed.data.email.toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    return {
      ok: false,
      message: "Konto z tym adresem email juz istnieje.",
    };
  }

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email,
      passwordHash: await hashPassword(parsed.data.password),
    },
  });

  redirect("/auth/signin?registered=1");
}

export async function requestPasswordReset(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? defaultError.message,
    };
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return {
      ok: true,
      message: "Jesli konto istnieje, link resetujacy zostanie wyslany.",
    };
  }

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  const resetEmail = await sendPasswordResetEmail(user.email, token).catch(
    (error) => {
      console.error("Password reset email failed:", error);
      return null;
    },
  );

  if (!resetEmail) {
    return {
      ok: false,
      message:
        "Nie udalo sie wyslac maila resetujacego. Sprobuj ponownie pozniej.",
    };
  }

  const showLocalResetLink =
    process.env.NODE_ENV !== "production" && !resetEmail.sentByEmail;

  return {
    ok: true,
    message: showLocalResetLink
      ? "Link resetujacy zostal przygotowany lokalnie."
      : "Jesli konto istnieje, link resetujacy zostanie wyslany.",
    resetUrl: showLocalResetLink ? resetEmail.resetUrl : undefined,
  };
}

export async function resetPassword(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? defaultError.message,
    };
  }

  const tokenHash = crypto
    .createHash("sha256")
    .update(parsed.data.token)
    .digest("hex");

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (
    !resetToken ||
    resetToken.usedAt ||
    resetToken.expiresAt.getTime() <= Date.now()
  ) {
    return {
      ok: false,
      message: "Link resetujacy jest niepoprawny albo wygasl.",
    };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash: await hashPassword(parsed.data.password) },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ]);

  redirect("/auth/signin?reset=1");
}

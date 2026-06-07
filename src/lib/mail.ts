import nodemailer from "nodemailer";

export async function sendPasswordResetEmail(email: string, token: string) {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`;

  if (!process.env.SMTP_HOST) {
    console.info("Password reset link:", resetUrl);
    return { resetUrl, sentByEmail: false };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASSWORD
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          }
        : undefined,
  });

  await transporter.sendMail({
    to: email,
    from: process.env.SMTP_FROM ?? "no-reply@example.com",
    subject: "Reset hasla - World Cup 2026 Predictor",
    text: `Ustaw nowe hasło: ${resetUrl}`,
  });

  return { resetUrl, sentByEmail: true };
}

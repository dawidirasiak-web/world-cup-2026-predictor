import { prisma } from "@/lib/prisma";

export const REGISTRATION_AUTO_BLOCK_AT = new Date("2026-06-11T18:30:00.000Z");

export async function getRegistrationSettings() {
  const settings = await prisma.appSetting.upsert({
    where: { id: "global" },
    update: {},
    create: { id: "global" },
  });
  const autoBlocked = Date.now() >= REGISTRATION_AUTO_BLOCK_AT.getTime();

  return {
    manualBlocked: settings.registrationBlocked,
    autoBlocked,
    blocked: settings.registrationBlocked || autoBlocked,
    autoBlockAt: REGISTRATION_AUTO_BLOCK_AT,
  };
}

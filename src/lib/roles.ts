import type { Role } from "@/generated/prisma/enums";

export function isAdmin(role?: Role | null) {
  return role === "ADMIN";
}

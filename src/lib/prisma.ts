import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const cachedPrisma = globalForPrisma.prisma;
const cachedPrismaRuntime = cachedPrisma as
  | (PrismaClient & {
      tournamentResult?: unknown;
      appSetting?: unknown;
      rankingSnapshot?: unknown;
      user?: {
        fields?: {
          firstName?: unknown;
        };
      };
    })
  | undefined;
const hasCurrentSchema = Boolean(
  cachedPrismaRuntime?.tournamentResult &&
    cachedPrismaRuntime?.appSetting &&
    cachedPrismaRuntime?.rankingSnapshot &&
    cachedPrismaRuntime?.user?.fields?.firstName,
);

if (cachedPrisma && !hasCurrentSchema) {
  void cachedPrisma.$disconnect();
}

const prismaClient: PrismaClient =
  cachedPrisma && hasCurrentSchema
    ? cachedPrisma
    : new PrismaClient({ adapter });

export const prisma = prismaClient;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

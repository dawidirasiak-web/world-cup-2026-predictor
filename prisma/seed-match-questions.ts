import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { getMatchQuestion } from "./match-questions";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

async function main() {
  const matches = await prisma.match.findMany({
    orderBy: { displayOrder: "asc" },
    select: {
      id: true,
      displayOrder: true,
    },
  });

  for (const match of matches) {
    await prisma.matchQuestion.upsert({
      where: { matchId: match.id },
      update: {
        question: getMatchQuestion(match.displayOrder),
      },
      create: {
        matchId: match.id,
        question: getMatchQuestion(match.displayOrder),
      },
    });
  }

  console.log(`Match questions updated: ${matches.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

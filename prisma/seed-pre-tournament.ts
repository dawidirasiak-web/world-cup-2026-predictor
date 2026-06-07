import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

const questions = [
  "Czy podczas turnieju przynajmniej raz kibic wtargnie na murawę podczas meczu?",
  "Czy podczas turnieju zostanie przyznanych minimum 30 rzutów karnych (bez konkursów po meczu)?",
  "Czy podczas turnieju padną przynajmniej 3 gole samobójcze?",
  "Czy więcej niż 2 mecze zostaną przerwane na minimum 10 minut z przyczyn niezwiązanych z grą (pogoda, awaria, kibice itp.)?",
  "Czy zwycięzca Mistrzostw Świata wygra wszystkie mecze od fazy grupowej do finału (bez porażki i remisów)?",
];

async function main() {
  for (const [index, question] of questions.entries()) {
    const existingQuestion = await prisma.preTournamentQuestion.findFirst({
      where: { displayOrder: index + 1 },
    });

    if (existingQuestion) {
      await prisma.preTournamentQuestion.update({
        where: { id: existingQuestion.id },
        data: {
          question,
          type: "YES_NO",
          points: 5,
          displayOrder: index + 1,
        },
      });
    } else {
      await prisma.preTournamentQuestion.create({
        data: {
          question,
          type: "YES_NO",
          points: 5,
          displayOrder: index + 1,
        },
      });
    }
  }

  await prisma.preTournamentQuestion.deleteMany({
    where: {
      displayOrder: {
        gt: questions.length,
      },
    },
  });

  console.log(
    `Pre-tournament questions: ${await prisma.preTournamentQuestion.count()}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

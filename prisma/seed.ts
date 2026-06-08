import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

const users = [
  {
    name: "Admin",
    firstName: "Admin",
    lastName: "System",
    email: "admin@example.com",
    password: "Admin123!",
    role: "ADMIN" as const,
  },
  {
    name: "Test User",
    firstName: "Test",
    lastName: "User",
    email: "user@example.com",
    password: "User123!",
    role: "USER" as const,
  },
];

const teams = [
  {
    name: "Polska",
    shortName: "Polska",
    fifaCode: "POL",
    flagUrl: "https://flagcdn.com/w80/pl.png",
    group: "A",
    displayOrder: 1,
  },
  {
    name: "Brazylia",
    shortName: "Brazylia",
    fifaCode: "BRA",
    flagUrl: "https://flagcdn.com/w80/br.png",
    group: "A",
    displayOrder: 2,
  },
  {
    name: "Niemcy",
    shortName: "Niemcy",
    fifaCode: "GER",
    flagUrl: "https://flagcdn.com/w80/de.png",
    group: "B",
    displayOrder: 3,
  },
  {
    name: "Argentyna",
    shortName: "Argentyna",
    fifaCode: "ARG",
    flagUrl: "https://flagcdn.com/w80/ar.png",
    group: "B",
    displayOrder: 4,
  },
  {
    name: "Francja",
    shortName: "Francja",
    fifaCode: "FRA",
    flagUrl: "https://flagcdn.com/w80/fr.png",
    group: "C",
    displayOrder: 5,
  },
  {
    name: "Hiszpania",
    shortName: "Hiszpania",
    fifaCode: "ESP",
    flagUrl: "https://flagcdn.com/w80/es.png",
    group: "C",
    displayOrder: 6,
  },
];

const stadiums = [
  {
    name: "MetLife Stadium",
    city: "East Rutherford",
    country: "USA",
    capacity: 82500,
  },
  {
    name: "AT&T Stadium",
    city: "Arlington",
    country: "USA",
    capacity: 80000,
  },
  {
    name: "Estadio Azteca",
    city: "Mexico City",
    country: "Mexico",
    capacity: 87523,
  },
];

const preTournamentQuestions = [
  "Ktora druzyna zdobedzie najwiecej bramek w fazie grupowej?",
  "Czy gospodarz awansuje do cwiercfinalu?",
  "Ktora konfederacja bedzie miec najwiecej zespolow w 1/8 finalu?",
  "Czy final rozstrzygnie sie po dogrywce lub rzutach karnych?",
  "Ktory zespol bedzie najwieksza niespodzianka turnieju?",
];

async function main() {
  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      create: {
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        passwordHash: await hashPassword(user.password),
        role: user.role,
        emailVerifiedAt: new Date(),
      },
    });
  }

  for (const team of teams) {
    await prisma.team.upsert({
      where: { fifaCode: team.fifaCode },
      update: team,
      create: team,
    });
  }

  for (const stadium of stadiums) {
    const existing = await prisma.stadium.findFirst({
      where: {
        name: stadium.name,
        city: stadium.city,
      },
    });

    if (existing) {
      await prisma.stadium.update({
        where: { id: existing.id },
        data: stadium,
      });
    } else {
      await prisma.stadium.create({ data: stadium });
    }
  }

  const teamByCode = new Map(
    (await prisma.team.findMany()).map((team) => [team.fifaCode, team]),
  );
  const stadiumByName = new Map(
    (await prisma.stadium.findMany()).map((stadium) => [
      stadium.name,
      stadium,
    ]),
  );

  const matches = [
    {
      homeTeamCode: "POL",
      awayTeamCode: "BRA",
      stadiumName: "MetLife Stadium",
      startsAt: new Date("2026-06-11T19:00:00.000Z"),
      phase: "GROUP_STAGE" as const,
      group: "A",
      displayOrder: 1,
      question: "Czy w meczu padna co najmniej 3 bramki?",
    },
    {
      homeTeamCode: "GER",
      awayTeamCode: "ARG",
      stadiumName: "AT&T Stadium",
      startsAt: new Date("2026-06-12T20:00:00.000Z"),
      phase: "GROUP_STAGE" as const,
      group: "B",
      displayOrder: 2,
      question: "Czy pierwsza bramka padnie w pierwszej polowie?",
    },
    {
      homeTeamCode: "FRA",
      awayTeamCode: "ESP",
      stadiumName: "Estadio Azteca",
      startsAt: new Date("2026-06-13T18:00:00.000Z"),
      phase: "GROUP_STAGE" as const,
      group: "C",
      displayOrder: 3,
      question: "Czy obie druzyny strzela gola?",
    },
  ];

  for (const match of matches) {
    const homeTeam = teamByCode.get(match.homeTeamCode);
    const awayTeam = teamByCode.get(match.awayTeamCode);
    const stadium = stadiumByName.get(match.stadiumName);

    if (!homeTeam || !awayTeam) {
      throw new Error(`Missing team for match ${match.homeTeamCode}-${match.awayTeamCode}`);
    }

    const existingMatch = await prisma.match.findFirst({
      where: {
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        startsAt: match.startsAt,
      },
    });

    const matchData = {
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      stadiumId: stadium?.id,
      startsAt: match.startsAt,
      phase: match.phase,
      group: match.group,
      displayOrder: match.displayOrder,
    };

    const savedMatch = existingMatch
      ? await prisma.match.update({
          where: { id: existingMatch.id },
          data: matchData,
        })
      : await prisma.match.create({ data: matchData });

    await prisma.matchQuestion.upsert({
      where: { matchId: savedMatch.id },
      update: { question: match.question },
      create: {
        matchId: savedMatch.id,
        question: match.question,
      },
    });
  }

  for (const [index, question] of preTournamentQuestions.entries()) {
    const existingQuestion = await prisma.preTournamentQuestion.findFirst({
      where: { displayOrder: index + 1 },
    });

    if (existingQuestion) {
      await prisma.preTournamentQuestion.update({
        where: { id: existingQuestion.id },
        data: { question, points: 5, displayOrder: index + 1 },
      });
    } else {
      await prisma.preTournamentQuestion.create({
        data: { question, points: 5, displayOrder: index + 1 },
      });
    }
  }

  const counts = await Promise.all([
    prisma.user.count(),
    prisma.team.count(),
    prisma.stadium.count(),
    prisma.match.count(),
    prisma.matchQuestion.count(),
    prisma.preTournamentQuestion.count(),
  ]);

  console.log("Seed complete");
  console.log(`Users: ${counts[0]}`);
  console.log(`Teams: ${counts[1]}`);
  console.log(`Stadiums: ${counts[2]}`);
  console.log(`Matches: ${counts[3]}`);
  console.log(`Match questions: ${counts[4]}`);
  console.log(`Pre-tournament questions: ${counts[5]}`);
  console.log("");
  console.log("Test accounts:");
  console.log("ADMIN admin@example.com / Admin123!");
  console.log("USER  user@example.com / User123!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

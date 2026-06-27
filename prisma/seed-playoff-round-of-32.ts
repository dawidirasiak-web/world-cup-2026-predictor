import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

const teams = {
  RSA: ["Republika Południowej Afryki", "za"],
  CAN: ["Kanada", "ca"],
  BRA: ["Brazylia", "br"],
  JPN: ["Japonia", "jp"],
  GER: ["Niemcy", "de"],
  PAR: ["Paragwaj", "py"],
  NED: ["Holandia", "nl"],
  MAR: ["Maroko", "ma"],
  CIV: ["Wybrzeże Kości Słoniowej", "ci"],
  NOR: ["Norwegia", "no"],
  FRA: ["Francja", "fr"],
  SWE: ["Szwecja", "se"],
  MEX: ["Meksyk", "mx"],
  BEL: ["Belgia", "be"],
  USA: ["Stany Zjednoczone", "us"],
  BIH: ["Bośnia i Hercegowina", "ba"],
  ESP: ["Hiszpania", "es"],
  SUI: ["Szwajcaria", "ch"],
  AUS: ["Australia", "au"],
  EGY: ["Egipt", "eg"],
  ARG: ["Argentyna", "ar"],
  CPV: ["Republika Zielonego Przylądka", "cv"],
  TBD_3_CE: ["3. drużyna grupy C/E", null],
  TBD_1_L: ["Zwycięzca grupy L", null],
  TBD_3_IJK: ["3. drużyna grupy I/J/K", null],
  TBD_3_AIJ: ["3. drużyna grupy A/I/J", null],
  TBD_2_J: ["2. drużyna grupy J", null],
  TBD_2_K: ["2. drużyna grupy K", null],
  TBD_2_L: ["2. drużyna grupy L", null],
  TBD_3_EGIJ: ["3. drużyna grupy E/G/I/J", null],
  TBD_1_K: ["Zwycięzca grupy K", null],
  TBD_3_EIL: ["3. drużyna grupy E/I/L", null],
} satisfies Record<string, readonly [string, string | null]>;

const roundOf32Matchups = [
  [73, "RSA", "CAN"],
  [76, "BRA", "JPN"],
  [74, "GER", "PAR"],
  [75, "NED", "MAR"],
  [78, "CIV", "NOR"],
  [77, "FRA", "SWE"],
  [79, "MEX", "TBD_3_CE"],
  [80, "TBD_1_L", "TBD_3_IJK"],
  [82, "BEL", "TBD_3_AIJ"],
  [81, "USA", "BIH"],
  [84, "ESP", "TBD_2_J"],
  [83, "TBD_2_K", "TBD_2_L"],
  [85, "SUI", "TBD_3_EGIJ"],
  [88, "AUS", "EGY"],
  [86, "ARG", "CPV"],
  [87, "TBD_1_K", "TBD_3_EIL"],
] as const;

function flagUrl(flagCode: string | null) {
  return flagCode ? `https://flagcdn.com/w80/${flagCode}.png` : null;
}

async function upsertTeam(code: keyof typeof teams) {
  const [name, flagCode] = teams[code];

  return prisma.team.upsert({
    where: { fifaCode: code },
    update: {
      name,
      shortName: name,
      flagUrl: flagUrl(flagCode),
    },
    create: {
      fifaCode: code,
      name,
      shortName: name,
      flagUrl: flagUrl(flagCode),
    },
  });
}

async function main() {
  const teamCache = new Map<keyof typeof teams, Awaited<ReturnType<typeof upsertTeam>>>();

  for (const code of Object.keys(teams) as Array<keyof typeof teams>) {
    teamCache.set(code, await upsertTeam(code));
  }

  for (const [matchNumber, homeCode, awayCode] of roundOf32Matchups) {
    const homeTeam = teamCache.get(homeCode);
    const awayTeam = teamCache.get(awayCode);

    if (!homeTeam || !awayTeam) {
      throw new Error(`Missing team for match ${matchNumber}`);
    }

    await prisma.match.updateMany({
      where: { displayOrder: matchNumber },
      data: {
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        phase: "ROUND_OF_32",
        group: null,
      },
    });

    console.log(`Mecz ${matchNumber}: ${homeTeam.name} - ${awayTeam.name}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

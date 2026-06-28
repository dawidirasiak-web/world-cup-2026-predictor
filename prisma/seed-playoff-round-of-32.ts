import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  PLAYOFF_PHASE_BY_MATCH_NUMBER,
  PLAYOFF_SLOT_SOURCES,
  PLAYOFF_STARTS_AT_BY_MATCH_NUMBER,
  getPlayoffSlotLabel,
  placeholderTeamCode,
} from "../src/lib/playoff-bracket";
import { getMatchQuestion } from "./match-questions";

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
  ECU: ["Ekwador", "ec"],
  ENG: ["Anglia", "gb-eng"],
  COD: ["Demokratyczna Republika Konga", "cd"],
  BEL: ["Belgia", "be"],
  SEN: ["Senegal", "sn"],
  USA: ["Stany Zjednoczone", "us"],
  BIH: ["Bośnia i Hercegowina", "ba"],
  ESP: ["Hiszpania", "es"],
  AUT: ["Austria", "at"],
  POR: ["Portugalia", "pt"],
  CRO: ["Chorwacja", "hr"],
  SUI: ["Szwajcaria", "ch"],
  ALG: ["Algieria", "dz"],
  AUS: ["Australia", "au"],
  EGY: ["Egipt", "eg"],
  ARG: ["Argentyna", "ar"],
  CPV: ["Republika Zielonego Przylądka", "cv"],
  COL: ["Kolumbia", "co"],
  GHA: ["Ghana", "gh"],
} satisfies Record<string, readonly [string, string | null]>;

const roundOf32Matchups = [
  [73, "RSA", "CAN"],
  [74, "GER", "PAR"],
  [75, "NED", "MAR"],
  [76, "BRA", "JPN"],
  [77, "FRA", "SWE"],
  [78, "CIV", "NOR"],
  [79, "MEX", "ECU"],
  [80, "ENG", "COD"],
  [81, "USA", "BIH"],
  [82, "BEL", "SEN"],
  [83, "POR", "CRO"],
  [84, "ESP", "AUT"],
  [85, "SUI", "ALG"],
  [86, "ARG", "CPV"],
  [87, "COL", "GHA"],
  [88, "AUS", "EGY"],
] as const;

type PlayoffPhase =
  | "ROUND_OF_32"
  | "ROUND_OF_16"
  | "QUARTER_FINAL"
  | "SEMI_FINAL"
  | "THIRD_PLACE"
  | "FINAL";

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

async function upsertPlaceholderTeam(label: string) {
  return prisma.team.upsert({
    where: { fifaCode: placeholderTeamCode(label) },
    update: {
      name: label,
      shortName: label,
      flagUrl: null,
    },
    create: {
      fifaCode: placeholderTeamCode(label),
      name: label,
      shortName: label,
      flagUrl: null,
    },
  });
}

async function upsertMatch({
  matchNumber,
  homeTeamId,
  awayTeamId,
}: {
  matchNumber: number;
  homeTeamId: string;
  awayTeamId: string;
}) {
  const existingMatch = await prisma.match.findFirst({
    where: { displayOrder: matchNumber },
    select: { id: true },
  });
  const data = {
    homeTeamId,
    awayTeamId,
    startsAt: new Date(PLAYOFF_STARTS_AT_BY_MATCH_NUMBER[matchNumber]),
    phase: PLAYOFF_PHASE_BY_MATCH_NUMBER[matchNumber] as PlayoffPhase,
    group: null,
    displayOrder: matchNumber,
  };
  const match = existingMatch
    ? await prisma.match.update({
        where: { id: existingMatch.id },
        data,
      })
    : await prisma.match.create({ data });

  await prisma.matchQuestion.upsert({
    where: { matchId: match.id },
    update: { question: getMatchQuestion(matchNumber) },
    create: {
      matchId: match.id,
      question: getMatchQuestion(matchNumber),
    },
  });

  return match;
}

async function main() {
  const teamCache = new Map<
    keyof typeof teams,
    Awaited<ReturnType<typeof upsertTeam>>
  >();

  for (const code of Object.keys(teams) as Array<keyof typeof teams>) {
    teamCache.set(code, await upsertTeam(code));
  }

  for (const [matchNumber, homeCode, awayCode] of roundOf32Matchups) {
    const homeTeam = teamCache.get(homeCode);
    const awayTeam = teamCache.get(awayCode);

    if (!homeTeam || !awayTeam) {
      throw new Error(`Missing team for match ${matchNumber}`);
    }

    await upsertMatch({
      matchNumber,
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
    });

    console.log(`Mecz ${matchNumber}: ${homeTeam.name} - ${awayTeam.name}`);
  }

  for (const matchNumber of Object.keys(PLAYOFF_SLOT_SOURCES).map(Number)) {
    const homeTeam = await upsertPlaceholderTeam(
      getPlayoffSlotLabel(matchNumber, "home"),
    );
    const awayTeam = await upsertPlaceholderTeam(
      getPlayoffSlotLabel(matchNumber, "away"),
    );

    await upsertMatch({
      matchNumber,
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
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

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { getMatchQuestion } from "./match-questions";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

const WIKI_RAW_URL =
  "https://pl.wikipedia.org/w/index.php?title=Mistrzostwa_%C5%9Awiata_w_Pi%C5%82ce_No%C5%BCnej_2026&action=raw";

const teams = [
  ["MEX", "Meksyk", "mx", "A"],
  ["RSA", "Republika Południowej Afryki", "za", "A"],
  ["KOR", "Korea Południowa", "kr", "A"],
  ["CZE", "Czechy", "cz", "A"],
  ["CAN", "Kanada", "ca", "B"],
  ["BIH", "Bośnia i Hercegowina", "ba", "B"],
  ["QAT", "Katar", "qa", "B"],
  ["SUI", "Szwajcaria", "ch", "B"],
  ["BRA", "Brazylia", "br", "C"],
  ["MAR", "Maroko", "ma", "C"],
  ["HAI", "Haiti", "ht", "C"],
  ["SCO", "Szkocja", "gb-sct", "C"],
  ["USA", "Stany Zjednoczone", "us", "D"],
  ["PAR", "Paragwaj", "py", "D"],
  ["AUS", "Australia", "au", "D"],
  ["TUR", "Turcja", "tr", "D"],
  ["GER", "Niemcy", "de", "E"],
  ["CUW", "Curaçao", "cw", "E"],
  ["CIV", "Wybrzeże Kości Słoniowej", "ci", "E"],
  ["ECU", "Ekwador", "ec", "E"],
  ["NED", "Holandia", "nl", "F"],
  ["JPN", "Japonia", "jp", "F"],
  ["SWE", "Szwecja", "se", "F"],
  ["TUN", "Tunezja", "tn", "F"],
  ["BEL", "Belgia", "be", "G"],
  ["EGY", "Egipt", "eg", "G"],
  ["IRN", "Iran", "ir", "G"],
  ["NZL", "Nowa Zelandia", "nz", "G"],
  ["ESP", "Hiszpania", "es", "H"],
  ["CPV", "Republika Zielonego Przylądka", "cv", "H"],
  ["KSA", "Arabia Saudyjska", "sa", "H"],
  ["URU", "Urugwaj", "uy", "H"],
  ["FRA", "Francja", "fr", "I"],
  ["SEN", "Senegal", "sn", "I"],
  ["IRQ", "Irak", "iq", "I"],
  ["NOR", "Norwegia", "no", "I"],
  ["ARG", "Argentyna", "ar", "J"],
  ["ALG", "Algieria", "dz", "J"],
  ["AUT", "Austria", "at", "J"],
  ["JOR", "Jordania", "jo", "J"],
  ["POR", "Portugalia", "pt", "K"],
  ["COD", "Demokratyczna Republika Konga", "cd", "K"],
  ["UZB", "Uzbekistan", "uz", "K"],
  ["COL", "Kolumbia", "co", "K"],
  ["ENG", "Anglia", "gb-eng", "L"],
  ["CRO", "Chorwacja", "hr", "L"],
  ["GHA", "Ghana", "gh", "L"],
  ["PAN", "Panama", "pa", "L"],
] as const;

const stadiums = [
  ["Estadio Azteca", "Meksyk", "Mexico", 87523],
  ["Estadio Akron", "Guadalajara", "Mexico", 49850],
  ["Estadio BBVA", "Monterrey", "Mexico", 53500],
  ["BMO Field", "Toronto", "Canada", 45500],
  ["BC Place", "Vancouver", "Canada", 54500],
  ["MetLife Stadium", "East Rutherford", "USA", 82500],
  ["AT&T Stadium", "Arlington", "USA", 80000],
  ["Arrowhead Stadium", "Kansas City", "USA", 76416],
  ["Mercedes-Benz Stadium", "Atlanta", "USA", 71000],
  ["NRG Stadium", "Houston", "USA", 72220],
  ["Lincoln Financial Field", "Filadelfia", "USA", 67594],
  ["Hard Rock Stadium", "Miami Gardens", "USA", 64767],
  ["SoFi Stadium", "Inglewood", "USA", 70240],
  ["Levi's Stadium", "Santa Clara", "USA", 68500],
  ["Lumen Field", "Seattle", "USA", 69000],
  ["Gillette Stadium", "Foxborough", "USA", 65878],
] as const;

const stadiumAliases: Record<string, string> = {
  "BC Place Stadium": "BC Place",
  "CenturyLink Field": "Lumen Field",
  "Levi’s Stadium": "Levi's Stadium",
  "Levi's Stadium": "Levi's Stadium",
};

const externalStatsUrlsByMatchNumber: Record<number, string> = {
  1: "https://www.sofascore.com/football/match/mexico-south-africa/LUbsGVb#id:15186710",
  2: "https://www.sofascore.com/football/match/south-korea-czechia/oUbsKUb",
  3: "https://www.sofascore.com/football/match/canada-bosnia-and-herzegovina/EObscVb",
  4: "https://www.sofascore.com/football/match/paraguay-usa/zUbsOVb",
  5: "https://www.sofascore.com/football/match/morocco-brazil/YUbsDVb",
  6: "https://www.sofascore.com/football/match/australia-turkiye/aUbsQUb",
  7: "https://www.sofascore.com/football/match/haiti-scotland/VTbsEUc",
  8: "https://www.sofascore.com/football/match/qatar-switzerland/ZTbsRVb",
};

const phaseByMatchNumber = (number: number) => {
  if (number <= 72) return "GROUP_STAGE" as const;
  if (number <= 88) return "ROUND_OF_32" as const;
  if (number <= 96) return "ROUND_OF_16" as const;
  if (number <= 100) return "QUARTER_FINAL" as const;
  if (number <= 102) return "SEMI_FINAL" as const;
  if (number === 103) return "THIRD_PLACE" as const;
  return "FINAL" as const;
};

function findTemplates(source: string, name: string) {
  const templates: string[] = [];
  let index = 0;

  while (index < source.length) {
    const start = source.indexOf(`{{${name}`, index);
    if (start === -1) break;

    let depth = 0;
    let cursor = start;

    while (cursor < source.length - 1) {
      const pair = source.slice(cursor, cursor + 2);

      if (pair === "{{") {
        depth += 1;
        cursor += 2;
        continue;
      }

      if (pair === "}}") {
        depth -= 1;
        cursor += 2;

        if (depth === 0) {
          templates.push(source.slice(start, cursor));
          index = cursor;
          break;
        }

        continue;
      }

      cursor += 1;
    }
  }

  return templates;
}

function splitTemplate(template: string) {
  const inner = template.replace(/^{{/, "").replace(/}}$/, "");
  const parts: string[] = [];
  let current = "";
  let braceDepth = 0;
  let bracketDepth = 0;

  for (let index = 0; index < inner.length; index += 1) {
    const pair = inner.slice(index, index + 2);

    if (pair === "{{") {
      braceDepth += 1;
      current += pair;
      index += 1;
      continue;
    }

    if (pair === "}}") {
      braceDepth -= 1;
      current += pair;
      index += 1;
      continue;
    }

    if (pair === "[[") {
      bracketDepth += 1;
      current += pair;
      index += 1;
      continue;
    }

    if (pair === "]]") {
      bracketDepth -= 1;
      current += pair;
      index += 1;
      continue;
    }

    if (inner[index] === "|" && braceDepth === 0 && bracketDepth === 0) {
      parts.push(current.trim());
      current = "";
      continue;
    }

    current += inner[index];
  }

  parts.push(current.trim());
  return parts;
}

function parseTemplate(template: string) {
  const parts = splitTemplate(template);
  const positional = parts.slice(1, 5);
  const named = new Map<string, string>();

  for (const part of parts.slice(5)) {
    const equalIndex = part.indexOf("=");
    if (equalIndex === -1) continue;
    named.set(part.slice(0, equalIndex).trim(), part.slice(equalIndex + 1).trim());
  }

  return { positional, named };
}

function stripWiki(value: string) {
  return value
    .replace(/<ref[\s\S]*?<\/ref>/g, "")
    .replace(/<ref[^>]*\/>/g, "")
    .replace(/\{\{flaga\|[^}]+}}/g, "")
    .replace(/\{\{reprezentacjaL?\|([^|}]+)\|pn}}/g, "$1")
    .replace(/\[\[[^|\]]+\|([^\]]+)]]/g, "$1")
    .replace(/\[\[([^\]]+)]]/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function getTeamCode(value: string) {
  const representationMatch = value.match(/\{\{reprezentacjaL?\|([^|}]+)\|pn}}/i);
  if (representationMatch) {
    return representationMatch[1].toUpperCase();
  }

  const name = stripWiki(value);
  const code = `TBD-${name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 35)
    .toUpperCase()}`;

  return code;
}

function getDisplayName(value: string) {
  const code = getTeamCode(value);
  const knownTeam = teams.find((team) => team[0] === code);
  return knownTeam?.[1] ?? stripWiki(value);
}

function parseStadium(value: string) {
  const clean = stripWiki(value);
  const [stadiumPart, ...cityParts] = clean.split(",").map((part) => part.trim());
  const stadiumName = stadiumAliases[stadiumPart] ?? stadiumPart;
  const canonical = stadiums.find((stadium) => stadium[0] === stadiumName);
  const city = canonical?.[1] ?? (cityParts.join(", ") || "Do ustalenia");

  return { stadiumName, city };
}

function parseStartsAt(day: string, month: string, year: string, time: string) {
  const [hours, minutes] = time.replace(/ .*/, "").split(":");
  const iso = `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(
    2,
    "0",
  )}T${hours.padStart(2, "0")}:${(minutes ?? "00").padStart(2, "0")}:00+02:00`;

  return new Date(iso);
}

async function upsertTeam(code: string, name: string, group?: string, flagCode?: string) {
  return prisma.team.upsert({
    where: { fifaCode: code },
    update: {
      name,
      shortName: name,
      group,
      flagUrl: flagCode ? `https://flagcdn.com/w80/${flagCode}.png` : undefined,
    },
    create: {
      name,
      shortName: name,
      fifaCode: code,
      group,
      flagUrl: flagCode ? `https://flagcdn.com/w80/${flagCode}.png` : undefined,
    },
  });
}

async function upsertStadium(name: string, city: string, country = "Do ustalenia", capacity?: number) {
  const existing = await prisma.stadium.findFirst({ where: { name, city } });

  if (existing) {
    return prisma.stadium.update({
      where: { id: existing.id },
      data: { name, city, country, capacity },
    });
  }

  return prisma.stadium.create({ data: { name, city, country, capacity } });
}

async function main() {
  const response = await fetch(WIKI_RAW_URL);
  if (!response.ok) {
    throw new Error(`Wikipedia request failed: ${response.status}`);
  }

  const raw = await response.text();
  const templates = findTemplates(raw, "Mecz piłkarski");

  for (const [index, team] of teams.entries()) {
    await prisma.team.upsert({
      where: { fifaCode: team[0] },
      update: {
        name: team[1],
        shortName: team[1],
        flagUrl: `https://flagcdn.com/w80/${team[2]}.png`,
        group: team[3],
        displayOrder: index + 1,
      },
      create: {
        fifaCode: team[0],
        name: team[1],
        shortName: team[1],
        flagUrl: `https://flagcdn.com/w80/${team[2]}.png`,
        group: team[3],
        displayOrder: index + 1,
      },
    });
  }

  for (const stadium of stadiums) {
    await upsertStadium(stadium[0], stadium[1], stadium[2], stadium[3]);
  }

  const teamCache = new Map(
    (await prisma.team.findMany()).map((team) => [team.fifaCode, team]),
  );
  const stadiumCache = new Map(
    (await prisma.stadium.findMany()).map((stadium) => [
      `${stadium.name}|${stadium.city}`,
      stadium,
    ]),
  );

  const importedNumbers = new Set<number>();
  const usedTeamCodes = new Set<string>();
  const usedStadiumNames = new Set<string>();

  for (const template of templates) {
    const { positional, named } = parseTemplate(template);
    const number = Number(named.get("numer")?.match(/\d+/)?.[0]);
    const homeRaw = named.get("drużyna1");
    const awayRaw = named.get("drużyna2");
    const stadiumRaw = named.get("stadion");

    if (!number || !homeRaw || !awayRaw || !stadiumRaw) {
      continue;
    }

    const homeCode = getTeamCode(homeRaw);
    const awayCode = getTeamCode(awayRaw);

    if (!teamCache.has(homeCode)) {
      teamCache.set(homeCode, await upsertTeam(homeCode, getDisplayName(homeRaw)));
    }

    if (!teamCache.has(awayCode)) {
      teamCache.set(awayCode, await upsertTeam(awayCode, getDisplayName(awayRaw)));
    }

    usedTeamCodes.add(homeCode);
    usedTeamCodes.add(awayCode);

    const stadiumParsed = parseStadium(stadiumRaw);
    const stadiumKey = `${stadiumParsed.stadiumName}|${stadiumParsed.city}`;
    if (!stadiumCache.has(stadiumKey)) {
      stadiumCache.set(
        stadiumKey,
        await upsertStadium(stadiumParsed.stadiumName, stadiumParsed.city),
      );
    }

    usedStadiumNames.add(stadiumParsed.stadiumName);

    const existingMatch = await prisma.match.findFirst({
      where: { displayOrder: number },
    });

    const matchData = {
      homeTeamId: teamCache.get(homeCode)!.id,
      awayTeamId: teamCache.get(awayCode)!.id,
      stadiumId: stadiumCache.get(stadiumKey)!.id,
      startsAt: parseStartsAt(
        positional[0],
        positional[1],
        positional[2],
        positional[3],
      ),
      phase: phaseByMatchNumber(number),
      group: number <= 72 ? teamCache.get(homeCode)?.group ?? null : null,
      displayOrder: number,
      externalStatsUrl: externalStatsUrlsByMatchNumber[number],
    };

    const match = existingMatch
      ? await prisma.match.update({
          where: { id: existingMatch.id },
          data: matchData,
        })
      : await prisma.match.create({ data: matchData });

    await prisma.matchQuestion.upsert({
      where: { matchId: match.id },
      update: {
        question: getMatchQuestion(number),
      },
      create: {
        matchId: match.id,
        question: getMatchQuestion(number),
      },
    });

    importedNumbers.add(number);
  }

  await prisma.match.deleteMany({
    where: {
      displayOrder: {
        notIn: [...importedNumbers],
      },
    },
  });

  await prisma.team.deleteMany({
    where: {
      fifaCode: {
        notIn: [...usedTeamCodes],
      },
      homeMatches: { none: {} },
      awayMatches: { none: {} },
      finalistOnePredictions: { none: {} },
      finalistTwoPredictions: { none: {} },
    },
  });

  await prisma.stadium.deleteMany({
    where: {
      matches: { none: {} },
    },
  });

  console.log(`Imported matches: ${importedNumbers.size}`);
  console.log(`Teams: ${await prisma.team.count()}`);
  console.log(`Stadiums: ${await prisma.stadium.count()}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

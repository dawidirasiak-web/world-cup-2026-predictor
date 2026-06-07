import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { chromium, type Page } from "playwright";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

const SOFASCORE_TOURNAMENT_URL =
  "https://www.sofascore.com/football/tournament/world/world-championship/16#id:58210";

function widgetUrlFromEventId(eventId: string) {
  return `https://widgets.sofascore.com/embed/lineups?id=${eventId}&widgetTheme=light`;
}

function extractEventIdFromWidgetUrl(url: string) {
  return new URL(url).searchParams.get("id");
}

function normalizeSofaScoreUrl(url: string) {
  return url.startsWith("http") ? url : `https://www.sofascore.com${url}`;
}

async function closePopups(page: Page) {
  const buttons = [
    page.getByRole("button", { name: /accept|agree|ok|got it|allow/i }),
    page.getByLabel(/close/i),
  ];

  for (const button of buttons) {
    try {
      await button.first().click({ timeout: 1500 });
    } catch {
      // SofaScore shows different consent UI by region; ignore when absent.
    }
  }
}

async function getLineupsWidgetUrl(page: Page, url: string) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await closePopups(page);

  try {
    await page.getByRole("tab", { name: /lineups|sklady|składy/i }).click({
      timeout: 5000,
    });
  } catch {
    await page.locator("text=/Lineups|Składy|Sklady/i").first().click({
      timeout: 5000,
    });
  }

  await page.waitForTimeout(1000);

  const embedButton = page
    .locator("button")
    .filter({ hasText: /<\/>|embed|share lineups|udost/i })
    .last();

  try {
    await embedButton.click({ timeout: 5000 });
  } catch {
    await page.locator('[aria-label*="embed" i], [title*="embed" i]').first().click({
      timeout: 5000,
    });
  }

  await page.waitForTimeout(1000);

  const text = await page.locator("textarea, input, pre, code").evaluateAll(
    (nodes) => nodes.map((node) => (node as HTMLInputElement).value || node.textContent || ""),
  );
  const joined = text.join("\n");
  const srcMatch = joined.match(/src="([^"]*widgets\.sofascore\.com[^"]+)"/);

  if (srcMatch?.[1]) {
    return srcMatch[1].replace(/&amp;/g, "&");
  }

  const copiedText = await page.evaluate(async () => {
    try {
      return await navigator.clipboard.readText();
    } catch {
      return "";
    }
  });
  const copiedMatch = copiedText.match(/src="([^"]*widgets\.sofascore\.com[^"]+)"/);

  return copiedMatch?.[1]?.replace(/&amp;/g, "&") ?? null;
}

async function collectTournamentMatchLinks(page: Page) {
  await page.goto(SOFASCORE_TOURNAMENT_URL, {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  await closePopups(page);

  try {
    await page.getByRole("tab", { name: /matches|mecze/i }).click({
      timeout: 5000,
    });
  } catch {
    try {
      await page.getByText(/full schedule|pelny terminarz|pełny terminarz/i).click({
        timeout: 3000,
      });
    } catch {
      // The overview already contains some match links.
    }
  }

  for (let index = 0; index < 20; index += 1) {
    await page.mouse.wheel(0, 1600);
    await page.waitForTimeout(350);
  }

  const links = await page.locator('a[href*="/football/match/"]').evaluateAll(
    (anchors) =>
      anchors.map((anchor) => ({
        href: (anchor as HTMLAnchorElement).href,
        text: anchor.textContent ?? "",
      })),
  );

  const uniqueLinks = new Map<string, string>();

  for (const link of links) {
    uniqueLinks.set(normalizeSofaScoreUrl(link.href).replace(/#.*$/, ""), link.text);
  }

  return [...uniqueLinks.entries()].map(([href, text]) => ({ href, text }));
}

async function main() {
  if (process.argv.includes("--help")) {
    console.log(`
Uzycie:
  npm run import:sofascore-widgets

Skrypt otwiera Chrome, przechodzi po meczach z externalStatsUrl SofaScore,
probujac pobrac oficjalny iframe lineups z przycisku embed. Wyniki zapisuje
w polach Match.sofaScoreEventId i Match.sofaScoreWidgetUrl.
`);
    return;
  }

  const browser = await chromium.launch({
    headless: false,
    channel: "chrome",
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });

  console.log(`Otwieram turniej: ${SOFASCORE_TOURNAMENT_URL}`);
  console.log(
    "Jesli SofaScore pokaze cookies/captcha, ogarnij to w otwartym oknie. Skrypt bedzie przechodzil po meczach z URL SofaScore.",
  );

  const tournamentLinks = await collectTournamentMatchLinks(page);
  console.log(`Znaleziono linki meczow na SofaScore: ${tournamentLinks.length}`);

  const matchesForUrlSync = await prisma.match.findMany({
    orderBy: { displayOrder: "asc" },
    select: {
      id: true,
      displayOrder: true,
      externalStatsUrl: true,
      homeTeam: { select: { fifaCode: true, name: true } },
      awayTeam: { select: { fifaCode: true, name: true } },
    },
  });

  for (const match of matchesForUrlSync) {
    if (match.externalStatsUrl) {
      continue;
    }

    const foundLink = tournamentLinks.find((link) => {
      const text = link.text.toUpperCase();

      return (
        text.includes(match.homeTeam.fifaCode.toUpperCase()) &&
        text.includes(match.awayTeam.fifaCode.toUpperCase())
      );
    });

    if (!foundLink) {
      continue;
    }

    await prisma.match.update({
      where: { id: match.id },
      data: { externalStatsUrl: foundLink.href },
    });

    console.log(
      `Dopisano URL meczu ${match.displayOrder}: ${match.homeTeam.name} - ${match.awayTeam.name}`,
    );
  }

  const matches = await prisma.match.findMany({
    where: {
      externalStatsUrl: {
        contains: "sofascore.com/football/match",
      },
    },
    orderBy: { displayOrder: "asc" },
    select: {
      id: true,
      displayOrder: true,
      externalStatsUrl: true,
      sofaScoreEventId: true,
      sofaScoreWidgetUrl: true,
      homeTeam: { select: { name: true } },
      awayTeam: { select: { name: true } },
    },
  });

  for (const match of matches) {
    if (!match.externalStatsUrl || match.sofaScoreWidgetUrl) {
      continue;
    }

    console.log(
      `Mecz ${match.displayOrder}: ${match.homeTeam.name} - ${match.awayTeam.name}`,
    );

    let widgetUrl = match.sofaScoreEventId
      ? widgetUrlFromEventId(match.sofaScoreEventId)
      : null;

    if (!widgetUrl) {
      try {
        widgetUrl = await getLineupsWidgetUrl(page, match.externalStatsUrl);
      } catch (error) {
        console.warn(
          `Nie udalo sie pobrac widgetu dla meczu ${match.displayOrder}:`,
          error,
        );
      }
    }

    if (!widgetUrl) {
      continue;
    }

    const eventId = extractEventIdFromWidgetUrl(widgetUrl);

    await prisma.match.update({
      where: { id: match.id },
      data: {
        sofaScoreEventId: eventId ?? match.sofaScoreEventId,
        sofaScoreWidgetUrl: widgetUrl,
      },
    });

    console.log(`Zapisano widget: ${widgetUrl}`);
  }

  await browser.close();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

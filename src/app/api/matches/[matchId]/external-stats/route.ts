import { NextResponse } from "next/server";
import {
  getExternalStatsUrl,
  getKnownSofaScoreUrl,
  getSofaScoreTabUrls,
  getSofaScoreWidgetUrls,
} from "@/lib/external-stats";
import { prisma } from "@/lib/prisma";
import { getSofaScoreMatchData } from "@/lib/sofascore";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ matchId: string }> },
) {
  const { matchId } = await params;
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      homeTeam: true,
      awayTeam: true,
    },
  });

  if (!match) {
    return NextResponse.json({ error: "Nie znaleziono meczu." }, { status: 404 });
  }

  const knownUrl = getKnownSofaScoreUrl(match.displayOrder);
  const externalStatsUrl = getExternalStatsUrl({
    externalStatsUrl: match.externalStatsUrl ?? knownUrl,
    homeTeam: match.homeTeam.name,
    awayTeam: match.awayTeam.name,
  });
  const sofaScore = await getSofaScoreMatchData(externalStatsUrl);

  return NextResponse.json({
    provider: "SofaScore",
    externalStatsUrl,
    tabs: getSofaScoreTabUrls(externalStatsUrl),
    widgets: getSofaScoreWidgetUrls(externalStatsUrl),
    sofaScore,
  });
}

import { NextResponse } from "next/server";
import {
  getExternalStatsUrl,
  getKnownSofaScoreUrl,
  getResolvedSofaScoreEventId,
} from "@/lib/external-stats";
import { prisma } from "@/lib/prisma";

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
    matchNumber: match.displayOrder,
    homeTeam: match.homeTeam.name,
    awayTeam: match.awayTeam.name,
  });
  const sofaScoreEventId = getResolvedSofaScoreEventId({
    eventId: match.sofaScoreEventId,
    url: externalStatsUrl,
  });
  return NextResponse.json({
    provider: "SofaScore",
    externalStatsUrl,
    sofaScoreEventId,
    sofaScoreWidgetUrl:
      match.sofaScoreWidgetUrl ??
      (sofaScoreEventId
        ? `https://widgets.sofascore.com/embed/lineups?id=${sofaScoreEventId}&widgetTheme=light`
        : null),
  });
}

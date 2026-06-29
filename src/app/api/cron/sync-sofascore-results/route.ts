import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { updateMatchResultAndRecalculate } from "@/lib/match-points";
import { prisma } from "@/lib/prisma";
import { getSofaScoreEventData } from "@/lib/sofascore";

export const dynamic = "force-dynamic";

type SofaScoreEventPayload = {
  event?: {
    homeScore?: {
      current?: number;
      normaltime?: number;
    };
    awayScore?: {
      current?: number;
      normaltime?: number;
    };
    status?: {
      type?: string;
      description?: string;
    };
  };
};

function parseSofaScoreScore(data: unknown): {
  homeScore: number;
  awayScore: number;
  status: "LIVE" | "FINISHED";
} | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const event = (data as SofaScoreEventPayload).event;
  const homeScore = event?.homeScore?.normaltime ?? event?.homeScore?.current;
  const awayScore = event?.awayScore?.normaltime ?? event?.awayScore?.current;

  if (typeof homeScore !== "number" || typeof awayScore !== "number") {
    return null;
  }

  const statusType = event?.status?.type?.toLowerCase();
  const status =
    statusType === "finished" || statusType === "afterpenalties"
      ? "FINISHED"
      : statusType === "inprogress"
        ? "LIVE"
        : null;

  if (!status) {
    return null;
  }

  return { homeScore, awayScore, status };
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (cronSecret && authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const matches = await prisma.match.findMany({
    where: {
      sofaScoreEventId: { not: null },
      status: { not: "FINISHED" },
    },
    select: {
      id: true,
      displayOrder: true,
      externalStatsUrl: true,
      sofaScoreEventId: true,
    },
    orderBy: { startsAt: "asc" },
  });

  const synced: Array<{
    matchId: string;
    matchNumber: number;
    homeScore: number;
    awayScore: number;
    status: "LIVE" | "FINISHED";
  }> = [];
  const skipped: Array<{
    matchId: string;
    matchNumber: number;
    reason: string;
  }> = [];

  for (const match of matches) {
    if (!match.sofaScoreEventId) {
      continue;
    }

    const event = await getSofaScoreEventData({
      eventId: match.sofaScoreEventId,
      externalStatsUrl: match.externalStatsUrl,
    });

    if (!event.ok) {
      skipped.push({
        matchId: match.id,
        matchNumber: match.displayOrder,
        reason: `SofaScore status ${event.status}`,
      });
      continue;
    }

    const result = parseSofaScoreScore(event.data);

    if (!result) {
      skipped.push({
        matchId: match.id,
        matchNumber: match.displayOrder,
        reason: "Brak wyniku lub mecz przed startem",
      });
      continue;
    }

    await prisma.$transaction((transaction) =>
      updateMatchResultAndRecalculate(transaction, {
        matchId: match.id,
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        status: result.status,
      }),
    );

    synced.push({
      matchId: match.id,
      matchNumber: match.displayOrder,
      ...result,
    });
  }

  if (synced.length > 0) {
    revalidatePath("/dashboard");
    revalidatePath("/ranking");
    revalidatePath("/matches");
    revalidatePath("/match-center");
    revalidatePath("/playoff");
  }

  return NextResponse.json({
    checked: matches.length,
    synced,
    skipped,
  });
}

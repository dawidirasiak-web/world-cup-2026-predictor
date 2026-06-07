import { getResolvedSofaScoreEventId } from "@/lib/external-stats";

const SOFASCORE_API_BASE = "https://api.sofascore.com/api/v1";

type SofaScoreFetchResult = {
  ok: boolean;
  status: number;
  data: unknown;
};

async function fetchSofaScoreJson(path: string, referer?: string | null) {
  const response = await fetch(`${SOFASCORE_API_BASE}${path}`, {
    headers: {
      accept: "application/json",
      "accept-language": "pl-PL,pl;q=0.9,en;q=0.8",
      referer: referer ?? "https://www.sofascore.com/",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
    },
    next: { revalidate: 60 },
  });

  let data: unknown = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  } satisfies SofaScoreFetchResult;
}

export async function getSofaScoreEventData(params: {
  eventId: string;
  externalStatsUrl?: string | null;
}) {
  return fetchSofaScoreJson(`/event/${params.eventId}`, params.externalStatsUrl);
}

export async function getSofaScoreMatchData(params: {
  externalStatsUrl?: string | null;
  eventId?: string | null;
}) {
  const eventId = getResolvedSofaScoreEventId({
    eventId: params.eventId,
    url: params.externalStatsUrl,
  });

  if (!eventId) {
    return {
      available: false,
      reason: "Brak identyfikatora meczu SofaScore.",
      eventId: null,
      event: null,
      statistics: null,
      lineups: null,
      h2h: null,
    };
  }

  const [event, statistics, lineups, h2h] = await Promise.all([
    fetchSofaScoreJson(`/event/${eventId}`, params.externalStatsUrl),
    fetchSofaScoreJson(`/event/${eventId}/statistics`, params.externalStatsUrl),
    fetchSofaScoreJson(`/event/${eventId}/lineups`, params.externalStatsUrl),
    fetchSofaScoreJson(`/event/${eventId}/h2h`, params.externalStatsUrl),
  ]);

  const available = event.ok;

  return {
    available,
    reason: available
      ? null
      : `SofaScore API zwróciło status ${event.status}.`,
    eventId,
    event: event.ok ? event.data : null,
    statistics: statistics.ok ? statistics.data : null,
    lineups: lineups.ok ? lineups.data : null,
    h2h: h2h.ok ? h2h.data : null,
    statuses: {
      event: event.status,
      statistics: statistics.status,
      lineups: lineups.status,
      h2h: h2h.status,
    },
  };
}

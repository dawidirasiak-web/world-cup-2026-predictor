import {
  SOFASCORE_EVENT_IDS_BY_SLUG,
  SOFASCORE_MATCH_LINKS_BY_MATCH_NUMBER,
} from "@/lib/sofascore-links";

export function getSofaScoreSearchUrl(homeTeam: string, awayTeam: string) {
  const query = encodeURIComponent(`${homeTeam} ${awayTeam}`);
  return `https://www.sofascore.com/search?q=${query}`;
}

export function getKnownSofaScoreUrl(matchNumber: number) {
  return SOFASCORE_MATCH_LINKS_BY_MATCH_NUMBER[matchNumber]?.url ?? null;
}

export function getExternalStatsUrl(params: {
  externalStatsUrl?: string | null;
  matchNumber?: number | null;
  homeTeam: string;
  awayTeam: string;
}) {
  return (
    params.externalStatsUrl ??
    (params.matchNumber ? getKnownSofaScoreUrl(params.matchNumber) : null) ??
    getSofaScoreSearchUrl(params.homeTeam, params.awayTeam)
  );
}

export function getSofaScoreMatchSlug(url?: string | null) {
  if (!url) {
    return null;
  }

  return url.match(/\/match\/[^/]+\/([^#?]+)/)?.[1] ?? null;
}

export function getSofaScoreEventId(url?: string | null) {
  if (!url) {
    return null;
  }

  const idFromHash = url.match(/#id:(\d+)/)?.[1];
  if (idFromHash) {
    return idFromHash;
  }

  const slug = getSofaScoreMatchSlug(url);
  return slug ? SOFASCORE_EVENT_IDS_BY_SLUG[slug] ?? null : null;
}

export function getResolvedSofaScoreEventId(params: {
  eventId?: string | null;
  url?: string | null;
}) {
  return params.eventId ?? getSofaScoreEventId(params.url);
}

export function getSofaScoreBaseMatchUrl(url: string) {
  return url.replace(/#.*$/, "");
}

export function getSofaScoreTabUrls(url: string, eventId?: string | null) {
  if (!url.includes("/football/match/")) {
    return {
      overview: url,
      lineups: url,
      standings: url,
      matches: url,
    };
  }

  const baseUrl = getSofaScoreBaseMatchUrl(url);
  const resolvedEventId = eventId ?? getSofaScoreEventId(url);

  return {
    overview: resolvedEventId ? `${baseUrl}#id:${resolvedEventId}` : baseUrl,
    lineups: `${baseUrl}#tab:lineups`,
    standings: `${baseUrl}#tab:standings`,
    matches: `${baseUrl}#tab:matches`,
  };
}

export function getSofaScoreWidgetUrls(url: string, eventId?: string | null) {
  const resolvedEventId = eventId ?? getSofaScoreEventId(url);

  if (resolvedEventId) {
    const widgetBaseUrl = `https://widgets.sofascore.com/embed`;

    return {
      lineups: `${widgetBaseUrl}/lineups?id=${resolvedEventId}&widgetTheme=light`,
      attackMomentum: `${widgetBaseUrl}/attack-momentum?id=${resolvedEventId}&widgetTheme=light`,
      statistics: `${widgetBaseUrl}/statistics?id=${resolvedEventId}&widgetTheme=light`,
    };
  }

  const baseUrl = url.includes("/football/match/")
    ? getSofaScoreBaseMatchUrl(url)
    : url;

  return {
    lineups: url.includes("/football/match/") ? `${baseUrl}#tab:lineups` : url,
    attackMomentum: url,
    statistics: url.includes("/football/match/")
      ? `${baseUrl}#tab:details`
      : url,
  };
}

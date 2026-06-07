const KNOWN_SOFASCORE_EVENTS_BY_SLUG: Record<string, string> = {
  LUbsGVb: "15186710",
};

const KNOWN_SOFASCORE_URLS_BY_MATCH_NUMBER: Record<number, string> = {
  1: "https://www.sofascore.com/football/match/mexico-south-africa/LUbsGVb#id:15186710",
  2: "https://www.sofascore.com/football/match/south-korea-czechia/oUbsKUb",
  3: "https://www.sofascore.com/football/match/canada-bosnia-and-herzegovina/EObscVb",
  4: "https://www.sofascore.com/football/match/paraguay-usa/zUbsOVb",
  5: "https://www.sofascore.com/football/match/morocco-brazil/YUbsDVb",
  6: "https://www.sofascore.com/football/match/australia-turkiye/aUbsQUb",
  7: "https://www.sofascore.com/football/match/haiti-scotland/VTbsEUc",
  8: "https://www.sofascore.com/football/match/qatar-switzerland/ZTbsRVb",
};

export function getSofaScoreSearchUrl(homeTeam: string, awayTeam: string) {
  const query = encodeURIComponent(`${homeTeam} ${awayTeam}`);
  return `https://www.sofascore.com/search?q=${query}`;
}

export function getKnownSofaScoreUrl(matchNumber: number) {
  return KNOWN_SOFASCORE_URLS_BY_MATCH_NUMBER[matchNumber] ?? null;
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
  return slug ? KNOWN_SOFASCORE_EVENTS_BY_SLUG[slug] ?? null : null;
}

export function getSofaScoreBaseMatchUrl(url: string) {
  return url.replace(/#.*$/, "");
}

export function getSofaScoreTabUrls(url: string) {
  if (!url.includes("/football/match/")) {
    return {
      overview: url,
      lineups: url,
      standings: url,
      matches: url,
    };
  }

  const baseUrl = getSofaScoreBaseMatchUrl(url);
  const eventId = getSofaScoreEventId(url);

  return {
    overview: eventId ? `${baseUrl}#id:${eventId}` : baseUrl,
    lineups: `${baseUrl}#tab:lineups`,
    standings: `${baseUrl}#tab:standings`,
    matches: `${baseUrl}#tab:matches`,
  };
}

export function getSofaScoreWidgetUrls(url: string) {
  const eventId = getSofaScoreEventId(url);

  if (eventId) {
    const eventUrl = `https://www.sofascore.com/event/${eventId}`;

    return {
      lineups: `${eventUrl}/lineups/embed`,
      attackMomentum: `${eventUrl}/attack-momentum/embed`,
      statistics: `${eventUrl}/statistics/embed`,
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

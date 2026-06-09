const KNOWN_SOFASCORE_EVENTS_BY_SLUG: Record<string, string> = {
  LUbsGVb: "15186710",
};

const KNOWN_SOFASCORE_URLS_BY_MATCH_NUMBER: Record<number, string> = {
  1: "https://www.sofascore.com/football/match/mexico-south-africa/LUbsGVb#id:15186710",
  2: "https://www.sofascore.com/football/match/south-korea-czechia/oUbsKUb#id:15186720",
  3: "https://www.sofascore.com/football/match/canada-bosnia-and-herzegovina/EObscVb#id:15186836",
  4: "https://www.sofascore.com/football/match/paraguay-usa/zUbsOVb#id:15186873",
  5: "https://www.sofascore.com/football/match/morocco-brazil/YUbsDVb#id:15186850",
  6: "https://www.sofascore.com/football/match/australia-turkiye/aUbsQUb#id:15186874",
  7: "https://www.sofascore.com/football/match/haiti-scotland/VTbsEUc#id:15186853",
  8: "https://www.sofascore.com/football/match/qatar-switzerland/ZTbsRVb#id:15186526",
  9: "https://www.sofascore.com/football/match/curacao-germany/lUbsCqx#id:15186899",
  10: "https://www.sofascore.com/football/match/japan-netherlands/fUbsvVb#id:15186945",
  11: "https://www.sofascore.com/football/match/cote-divoire-ecuador/hVbstVb#id:15186904",
  12: "https://www.sofascore.com/football/match/tunisia-sweden/NTbsEUb#id:15186951",
  13: "https://www.sofascore.com/football/match/cabo-verde-spain/YTbsdVb#id:15186783",
  14: "https://www.sofascore.com/football/match/egypt-belgium/rUbsiVb#id:15186837",
  15: "https://www.sofascore.com/football/match/saudi-arabia-uruguay/AUbsJWb#id:15186811",
  16: "https://www.sofascore.com/football/match/new-zealand-iran/qVbsJVb#id:15186832",
  17: "https://www.sofascore.com/football/match/senegal-france/GObsOUb#id:15186501",
  18: "https://www.sofascore.com/football/match/iraq-norway/AObsrVb#id:15186773",
  19: "https://www.sofascore.com/football/match/argentina-algeria/QTbsuWb#id:15186854",
  20: "https://www.sofascore.com/football/match/jordan-austria/tUbswVb#id:15186751",
  21: "https://www.sofascore.com/football/match/dr-congo-portugal/eUbsyWb#id:15186709",
  22: "https://www.sofascore.com/football/match/croatia-england/nUbspUb#id:15186504",
  23: "https://www.sofascore.com/football/match/panama-ghana/oVbsodc#id:15186687",
  24: "https://www.sofascore.com/football/match/colombia-uzbekistan/yUbsvWb#id:15186722",
  42: "https://www.sofascore.com/football/match/senegal-norway/AObsOUb",
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

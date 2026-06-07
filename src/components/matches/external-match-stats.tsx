"use client";

import { useEffect, useState } from "react";

type StatisticItem = {
  name?: string;
  home?: string;
  away?: string;
};

type StatisticGroup = {
  groupName?: string;
  statisticsItems?: StatisticItem[];
};

type ExternalStatsPayload = {
  provider: string;
  externalStatsUrl: string;
  tabs?: {
    overview: string;
    lineups: string;
    standings: string;
    matches: string;
  };
  widgets?: {
    lineups: string;
    attackMomentum: string;
    statistics: string;
  } | null;
  sofaScore: {
    available: boolean;
    reason: string | null;
    eventId: string | null;
    event: unknown;
    statistics: unknown;
    lineups: unknown;
    h2h: unknown;
    statuses?: Record<string, number>;
  };
};

const widgetOptions = [
  { key: "lineups", label: "Składy", height: 580 },
  { key: "attackMomentum", label: "Momentum", height: 260 },
  { key: "statistics", label: "Statystyki", height: 520 },
] as const;

type WidgetKey = (typeof widgetOptions)[number]["key"];

function getEventName(event: unknown) {
  if (!event || typeof event !== "object" || !("event" in event)) {
    return null;
  }

  const item = (
    event as { event?: { slug?: string; status?: { description?: string } } }
  ).event;

  return {
    slug: item?.slug,
    status: item?.status?.description,
  };
}

function getStatisticGroups(statistics: unknown): StatisticGroup[] {
  if (
    !statistics ||
    typeof statistics !== "object" ||
    !("statistics" in statistics)
  ) {
    return [];
  }

  const groups = (
    statistics as {
      statistics?: Array<{
        groups?: StatisticGroup[];
      }>;
    }
  ).statistics;

  return groups?.flatMap((period) => period.groups ?? []).slice(0, 3) ?? [];
}

function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
    >
      {children}
    </a>
  );
}

export function ExternalMatchStats({
  matchId,
  externalStatsUrl,
}: {
  matchId: string;
  externalStatsUrl: string;
}) {
  const [payload, setPayload] = useState<ExternalStatsPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeWidget, setActiveWidget] = useState<WidgetKey>("lineups");

  useEffect(() => {
    let isMounted = true;

    async function loadStats() {
      setIsLoading(true);
      const response = await fetch(`/api/matches/${matchId}/external-stats`);
      const data = (await response.json()) as ExternalStatsPayload;

      if (isMounted) {
        setPayload(data);
        setIsLoading(false);
      }
    }

    loadStats().catch(() => {
      if (isMounted) {
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [matchId]);

  if (isLoading) {
    return (
      <div className="mt-5 rounded-md bg-slate-50 p-3 text-sm text-slate-600">
        Ładowanie danych SofaScore...
      </div>
    );
  }

  const eventInfo = getEventName(payload?.sofaScore.event);
  const statisticGroups = getStatisticGroups(payload?.sofaScore.statistics);
  const tabs = payload?.tabs;
  const widgets = payload?.widgets;
  const activeWidgetConfig =
    widgetOptions.find((option) => option.key === activeWidget) ??
    widgetOptions[0];
  const activeWidgetUrl = widgets?.[activeWidgetConfig.key];

  return (
    <div className="mt-5 space-y-4">
      {widgets ? (
        <div className="space-y-3 rounded-md border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap gap-2">
            {widgetOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setActiveWidget(option.key)}
                className={
                  option.key === activeWidget
                    ? "rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white"
                    : "rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                }
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-md border border-slate-200 bg-slate-50">
            <iframe
              key={activeWidgetUrl}
              src={activeWidgetUrl}
              title={`SofaScore ${activeWidgetConfig.label}`}
              className="w-full bg-white"
              style={{ height: activeWidgetConfig.height }}
              loading="lazy"
              referrerPolicy="origin"
            />
          </div>

          <p className="text-xs leading-5 text-slate-500">
            Panel jest ładowany bezpośrednio z SofaScore. Przy meczach z
            rozpoznanym event ID używamy adresów embed, a przy pozostałych
            pokazujemy widok SofaScore jako fallback. Jeśli provider zablokuje
            osadzenie, użyj przycisków poniżej.
          </p>
        </div>
      ) : (
        <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          Brak adresów widgetów dla tego meczu. Potrzebny jest identyfikator
          eventu SofaScore.
        </div>
      )}

      {payload?.sofaScore.available ? (
        <>
          <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">
            Dane SofaScore pobrane dla event ID {payload.sofaScore.eventId}
            {eventInfo?.status ? ` · ${eventInfo.status}` : ""}.
          </div>

          {statisticGroups.length > 0 ? (
            <div className="space-y-3">
              {statisticGroups.map((group, index) => (
                <div
                  key={`${group.groupName}-${index}`}
                  className="rounded-md bg-slate-50 p-3"
                >
                  <p className="text-sm font-semibold">
                    {group.groupName ?? "Statystyki"}
                  </p>
                  <div className="mt-3 space-y-2">
                    {(group.statisticsItems ?? []).slice(0, 6).map((item) => (
                      <div
                        key={item.name}
                        className="grid grid-cols-[50px_1fr_50px] items-center gap-3 text-sm"
                      >
                        <span className="font-medium">{item.home ?? "-"}</span>
                        <span className="text-center text-slate-600">
                          {item.name}
                        </span>
                        <span className="text-right font-medium">
                          {item.away ?? "-"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">
              SofaScore rozpoznał mecz, ale szczegółowe statystyki mogą być
              dostępne dopiero bliżej rozpoczęcia spotkania lub w trakcie live.
            </div>
          )}
        </>
      ) : (
        <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          Nie udało się pobrać danych przez API.{" "}
          {payload?.sofaScore.reason ?? "Endpoint nie odpowiedział poprawnie."}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <a
          href={payload?.externalStatsUrl ?? externalStatsUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Otwórz mecz
        </a>
        {tabs ? (
          <>
            <ExternalLink href={tabs.lineups}>Składy</ExternalLink>
            <ExternalLink href={tabs.standings}>Tabela</ExternalLink>
            <ExternalLink href={tabs.matches}>H2H / mecze</ExternalLink>
          </>
        ) : null}
      </div>
    </div>
  );
}

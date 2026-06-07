"use client";

import { useEffect, useState } from "react";

type ExternalStatsPayload = {
  provider: string;
  externalStatsUrl: string;
  sofaScoreEventId?: string | null;
  sofaScoreWidgetUrl?: string | null;
};

export function ExternalMatchStats({
  matchId,
  externalStatsUrl,
}: {
  matchId: string;
  externalStatsUrl: string;
}) {
  const [payload, setPayload] = useState<ExternalStatsPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
        Ładowanie składów SofaScore...
      </div>
    );
  }

  const matchUrl = payload?.externalStatsUrl ?? externalStatsUrl;

  return (
    <div className="mt-5 space-y-4">
      {payload?.sofaScoreWidgetUrl ? (
        <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
          <iframe
            src={payload.sofaScoreWidgetUrl}
            title="Składy SofaScore"
            className="h-[786px] w-full"
            scrolling="no"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="rounded-md bg-amber-50 p-3 text-sm leading-6 text-amber-900">
          Nie mamy jeszcze zapisanego oficjalnego widgetu składów dla tego
          meczu. Gdy uzupełnimy event ID SofaScore, skład pojawi się tutaj
          automatycznie.
        </div>
      )}

      <a
        href={matchUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
      >
        Otwórz mecz w SofaScore
      </a>
    </div>
  );
}

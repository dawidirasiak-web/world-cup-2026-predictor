export const PLAYOFF_MATCH_NUMBERS = Array.from(
  { length: 32 },
  (_, index) => index + 73,
);

export const PLAYOFF_PHASE_BY_MATCH_NUMBER: Record<number, string> = {
  73: "ROUND_OF_32",
  74: "ROUND_OF_32",
  75: "ROUND_OF_32",
  76: "ROUND_OF_32",
  77: "ROUND_OF_32",
  78: "ROUND_OF_32",
  79: "ROUND_OF_32",
  80: "ROUND_OF_32",
  81: "ROUND_OF_32",
  82: "ROUND_OF_32",
  83: "ROUND_OF_32",
  84: "ROUND_OF_32",
  85: "ROUND_OF_32",
  86: "ROUND_OF_32",
  87: "ROUND_OF_32",
  88: "ROUND_OF_32",
  89: "ROUND_OF_16",
  90: "ROUND_OF_16",
  91: "ROUND_OF_16",
  92: "ROUND_OF_16",
  93: "ROUND_OF_16",
  94: "ROUND_OF_16",
  95: "ROUND_OF_16",
  96: "ROUND_OF_16",
  97: "QUARTER_FINAL",
  98: "QUARTER_FINAL",
  99: "QUARTER_FINAL",
  100: "QUARTER_FINAL",
  101: "SEMI_FINAL",
  102: "SEMI_FINAL",
  103: "THIRD_PLACE",
  104: "FINAL",
};

export const PLAYOFF_STARTS_AT_BY_MATCH_NUMBER: Record<number, string> = {
  73: "2026-06-28T21:00:00+02:00",
  74: "2026-06-29T19:00:00+02:00",
  75: "2026-06-29T22:30:00+02:00",
  76: "2026-06-29T19:00:00+02:00",
  77: "2026-06-30T22:00:00+02:00",
  78: "2026-06-30T19:00:00+02:00",
  79: "2026-07-01T03:00:00+02:00",
  80: "2026-07-01T18:00:00+02:00",
  81: "2026-07-02T02:00:00+02:00",
  82: "2026-07-01T22:00:00+02:00",
  83: "2026-07-03T01:00:00+02:00",
  84: "2026-07-02T21:00:00+02:00",
  85: "2026-07-03T05:00:00+02:00",
  86: "2026-07-04T00:00:00+02:00",
  87: "2026-07-04T03:30:00+02:00",
  88: "2026-07-03T20:00:00+02:00",
  89: "2026-07-04T18:00:00+02:00",
  90: "2026-07-04T22:00:00+02:00",
  91: "2026-07-05T18:00:00+02:00",
  92: "2026-07-05T22:00:00+02:00",
  93: "2026-07-06T18:00:00+02:00",
  94: "2026-07-06T22:00:00+02:00",
  95: "2026-07-07T18:00:00+02:00",
  96: "2026-07-07T22:00:00+02:00",
  97: "2026-07-09T22:00:00+02:00",
  98: "2026-07-10T22:00:00+02:00",
  99: "2026-07-11T18:00:00+02:00",
  100: "2026-07-11T22:00:00+02:00",
  101: "2026-07-14T22:00:00+02:00",
  102: "2026-07-15T22:00:00+02:00",
  103: "2026-07-18T18:00:00+02:00",
  104: "2026-07-19T18:00:00+02:00",
};

export const PLAYOFF_SLOT_SOURCES: Record<
  number,
  { home: number; away: number; mode: "winner" | "loser" }
> = {
  89: { home: 74, away: 77, mode: "winner" },
  90: { home: 73, away: 75, mode: "winner" },
  91: { home: 76, away: 78, mode: "winner" },
  92: { home: 79, away: 80, mode: "winner" },
  93: { home: 83, away: 84, mode: "winner" },
  94: { home: 81, away: 82, mode: "winner" },
  95: { home: 86, away: 88, mode: "winner" },
  96: { home: 85, away: 87, mode: "winner" },
  97: { home: 89, away: 90, mode: "winner" },
  98: { home: 93, away: 94, mode: "winner" },
  99: { home: 91, away: 92, mode: "winner" },
  100: { home: 95, away: 96, mode: "winner" },
  101: { home: 97, away: 98, mode: "winner" },
  102: { home: 99, away: 100, mode: "winner" },
  103: { home: 101, away: 102, mode: "loser" },
  104: { home: 101, away: 102, mode: "winner" },
};

export const NEXT_PLAYOFF_SLOTS: Record<
  number,
  Array<{ targetMatchNumber: number; side: "home" | "away"; mode: "winner" | "loser" }>
> = Object.entries(PLAYOFF_SLOT_SOURCES).flatMap(([target, source]) => [
  {
    sourceMatchNumber: source.home,
    targetMatchNumber: Number(target),
    side: "home" as const,
    mode: source.mode,
  },
  {
    sourceMatchNumber: source.away,
    targetMatchNumber: Number(target),
    side: "away" as const,
    mode: source.mode,
  },
]).reduce<Record<number, Array<{ targetMatchNumber: number; side: "home" | "away"; mode: "winner" | "loser" }>>>(
  (bySource, slot) => {
    bySource[slot.sourceMatchNumber] = bySource[slot.sourceMatchNumber] ?? [];
    bySource[slot.sourceMatchNumber].push({
      targetMatchNumber: slot.targetMatchNumber,
      side: slot.side,
      mode: slot.mode,
    });
    return bySource;
  },
  {},
);

export function placeholderTeamCode(label: string) {
  return `TBD-${label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toUpperCase()}`;
}

export function getPlayoffSlotLabel(
  targetMatchNumber: number,
  side: "home" | "away",
) {
  const source = PLAYOFF_SLOT_SOURCES[targetMatchNumber];

  if (!source) {
    return "Do ustalenia";
  }

  const sourceMatchNumber = source[side];
  const prefix = source.mode === "winner" ? "Zwycięzca" : "Przegrany";

  return `${prefix} meczu ${sourceMatchNumber}`;
}

export function formatMatchDate(date: Date) {
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Warsaw",
  }).format(date);
}

export function phaseLabel(phase: string) {
  const labels: Record<string, string> = {
    GROUP_STAGE: "Faza grupowa",
    ROUND_OF_32: "1/16 finału",
    ROUND_OF_16: "1/8 finału",
    QUARTER_FINAL: "Ćwierćfinał",
    SEMI_FINAL: "Półfinał",
    THIRD_PLACE: "Mecz o 3. miejsce",
    FINAL: "Finał",
  };

  return labels[phase] ?? phase;
}

export function getLocalDayRange(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}

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

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);
  const zonedAsUtc = Date.UTC(
    value("year"),
    value("month") - 1,
    value("day"),
    value("hour"),
    value("minute"),
    value("second"),
  );

  return zonedAsUtc - date.getTime();
}

function warsawDateTimeToUtc(year: number, month: number, day: number) {
  const utcGuess = Date.UTC(year, month - 1, day, 0, 0, 0);
  const offset = getTimeZoneOffsetMs(new Date(utcGuess), "Europe/Warsaw");

  return new Date(utcGuess - offset);
}

export function getLocalDayRange(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);
  const year = value("year");
  const month = value("month");
  const day = value("day");
  const start = warsawDateTimeToUtc(year, month, day);
  const end = warsawDateTimeToUtc(year, month, day + 1);

  return { start, end };
}

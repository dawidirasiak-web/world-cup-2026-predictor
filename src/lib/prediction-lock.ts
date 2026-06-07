export function isMatchPredictionOpen(startsAt: Date, now = new Date()) {
  return now.getTime() < startsAt.getTime();
}

export function isPreTournamentPredictionOpen(
  tournamentStartsAt: Date,
  now = new Date(),
) {
  return now.getTime() < tournamentStartsAt.getTime();
}

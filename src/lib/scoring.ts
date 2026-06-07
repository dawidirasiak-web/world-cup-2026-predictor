export function calculateMatchScorePoints(params: {
  predictedHomeScore: number;
  predictedAwayScore: number;
  homeScore: number;
  awayScore: number;
}) {
  const {
    predictedHomeScore,
    predictedAwayScore,
    homeScore,
    awayScore,
  } = params;

  if (predictedHomeScore === homeScore && predictedAwayScore === awayScore) {
    return 5;
  }

  const predictedDiff = predictedHomeScore - predictedAwayScore;
  const actualDiff = homeScore - awayScore;

  if (actualDiff === 0) {
    return predictedDiff === 0 ? 3 : 0;
  }

  const predictedWinnerMatches =
    (actualDiff > 0 && predictedDiff > 0) ||
    (actualDiff < 0 && predictedDiff < 0);

  if (!predictedWinnerMatches) {
    return 0;
  }

  return predictedDiff === actualDiff ? 3 : 2;
}

export function calculateMatchQuestionPoints(
  answer?: string | null,
  correctAnswer?: string | null,
) {
  if (!answer || !correctAnswer) {
    return 0;
  }

  return answer.trim().toLowerCase() === correctAnswer.trim().toLowerCase()
    ? 1
    : 0;
}

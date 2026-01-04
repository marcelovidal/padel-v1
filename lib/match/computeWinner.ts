export type SetScore = { a: number; b: number };
export type ComputeWinnerResult = {
  perSetWinners: ("A" | "B")[];
  setsWonA: number;
  setsWonB: number;
  winnerTeam?: "A" | "B";
  isFinished: boolean;
  normalizedSets: SetScore[];
  errors: string[];
};

function isValidSet(set: SetScore): boolean {
  const { a, b } = set;
  if (!Number.isInteger(a) || !Number.isInteger(b)) return false;
  if (a < 0 || b < 0) return false;
  if (a === b) return false;

  const max = Math.max(a, b);
  const min = Math.min(a, b);

  // Winner must have at least 6 games
  if (max < 6) return false;

  // Normal win: 6-x with diff >= 2 (e.g., 6-0..6-4)
  if (max === 6 && max - min >= 2) return true;

  // Extended wins: 7-5 or 7-6
  if (max === 7 && (min === 5 || min === 6)) return true;

  return false;
}

export function computeWinner(sets: SetScore[]): ComputeWinnerResult {
  const res: ComputeWinnerResult = {
    perSetWinners: [],
    setsWonA: 0,
    setsWonB: 0,
    isFinished: false,
    normalizedSets: [],
    errors: [],
  };

  if (!Array.isArray(sets)) {
    res.errors.push("Sets debe ser un arreglo");
    return res;
  }

  for (let i = 0; i < sets.length; i++) {
    const s = sets[i];
    if (!s || typeof s !== "object") {
      res.errors.push(`Set ${i + 1} inválido`);
      continue;
    }

    const { a, b } = s as SetScore;

    if (a === b) {
      res.errors.push(`Set ${i + 1} inválido: empate (${a}-${b})`);
      continue;
    }

    if (!isValidSet({ a, b })) {
      res.errors.push(`Set ${i + 1} inválido: marcador no permitido (${a}-${b})`);
      continue;
    }

    // Determine set winner
    const winner = a > b ? "A" : "B";
    res.perSetWinners.push(winner);
    if (winner === "A") res.setsWonA += 1;
    else res.setsWonB += 1;

    res.normalizedSets.push({ a, b });

    // If someone reached 2 sets won, match finished -> stop processing further sets
    if (res.setsWonA === 2 || res.setsWonB === 2) {
      res.isFinished = true;
      res.winnerTeam = res.setsWonA === 2 ? "A" : "B";
      // Truncate normalizedSets to current set index (inclusive)
      res.normalizedSets = res.normalizedSets.slice(0, res.perSetWinners.length);
      break;
    }
  }

  // If loop finished without someone reaching 2 sets, isFinished remains false
  return res;
}

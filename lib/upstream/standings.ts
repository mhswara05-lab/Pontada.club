/**
 * Scoring Engine — pure standings computation (DESIGN.md §9). Turns played
 * matches into ranked standings using configurable points + ordered tie-breakers.
 */

export type TieBreaker = "HEAD_TO_HEAD" | "POINT_DIFF" | "POINTS_FOR";

export interface ScoringConfig {
  pointsPerWin: number;
  pointsPerLoss: number;
  tieBreakers: TieBreaker[];
}

export interface PlayedMatch {
  teamA: string[];
  teamB: string[];
  scoreA: number;
  scoreB: number;
}

export interface Standing {
  playerId: string;
  points: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;
  rank: number;
}

export function computeStandings(
  config: ScoringConfig,
  matches: PlayedMatch[],
  participantIds: string[],
): Standing[] {
  const table = new Map<string, Standing>();
  for (const id of participantIds) {
    table.set(id, {
      playerId: id,
      points: 0,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointDiff: 0,
      rank: 0,
    });
  }

  for (const m of matches) {
    const aWon = m.scoreA > m.scoreB;
    credit(table, m.teamA, m.scoreA, m.scoreB, aWon, config);
    credit(table, m.teamB, m.scoreB, m.scoreA, !aWon, config);
  }

  for (const s of table.values()) s.pointDiff = s.pointsFor - s.pointsAgainst;

  const standings = [...table.values()].sort((a, b) =>
    compare(a, b, config.tieBreakers, matches),
  );

  // Standard competition ranking (ties share a rank, e.g. 1,2,2,4).
  let rank = 0;
  let prev: Standing | null = null;
  standings.forEach((s, i) => {
    if (!prev || compare(prev, s, config.tieBreakers, matches) !== 0) {
      rank = i + 1;
    }
    s.rank = rank;
    prev = s;
  });

  return standings;
}

function credit(
  table: Map<string, Standing>,
  team: string[],
  scoreFor: number,
  scoreAgainst: number,
  won: boolean,
  config: ScoringConfig,
) {
  for (const id of team) {
    const s = table.get(id);
    if (!s) continue;
    s.pointsFor += scoreFor;
    s.pointsAgainst += scoreAgainst;
    if (won) {
      s.wins++;
      s.points += config.pointsPerWin;
    } else {
      s.losses++;
      s.points += config.pointsPerLoss;
    }
  }
}

/** Returns <0 if a ranks above b. Higher points/diff/etc. = better = comes first. */
function compare(
  a: Standing,
  b: Standing,
  tieBreakers: TieBreaker[],
  matches: PlayedMatch[],
): number {
  if (a.points !== b.points) return b.points - a.points;

  for (const tb of tieBreakers) {
    if (tb === "POINT_DIFF" && a.pointDiff !== b.pointDiff) {
      return b.pointDiff - a.pointDiff;
    }
    if (tb === "POINTS_FOR" && a.pointsFor !== b.pointsFor) {
      return b.pointsFor - a.pointsFor;
    }
    if (tb === "HEAD_TO_HEAD") {
      const h2h = headToHead(a.playerId, b.playerId, matches);
      if (h2h !== 0) return h2h;
    }
  }
  return 0;
}

/**
 * Net point differential between two players in matches where they were on
 * opposite teams. Negative result means `a` is ahead (sorts first).
 */
function headToHead(a: string, b: string, matches: PlayedMatch[]): number {
  let aNet = 0;
  for (const m of matches) {
    const aOnA = m.teamA.includes(a);
    const aOnB = m.teamB.includes(a);
    const bOnA = m.teamA.includes(b);
    const bOnB = m.teamB.includes(b);
    if (aOnA && bOnB) aNet += m.scoreA - m.scoreB;
    else if (aOnB && bOnA) aNet += m.scoreB - m.scoreA;
  }
  return -aNet; // higher net for a → a sorts first
}

/**
 * Canonical rotation construction for the Individual Round Robin ("mixer").
 * Players are referenced by seat index in the host-controlled order (seat 0 =
 * player 1, …). The construction is the circle / rotation method:
 *
 *  - ODD player counts: in round r, **player r sits out** (so byes rotate in
 *    order: P1, P2, P3, …), and the rest pair by distance —
 *    team = (r+1, r−1) and (r+2, r−2) … (mod N). Every pair partners exactly
 *    once over N rounds; no team ever repeats.
 *  - EVEN player counts: nobody sits; the standard fixed-pivot circle method
 *    gives N−1 rounds in which every pair partners exactly once.
 *
 * Each round yields a set of two-player teams (partnerships). Assigning teams to
 * courts (and any overflow byes) happens in the engine.
 */

export interface CycleRound {
  /** Seat indices sitting out this round (the rotating primary bye). */
  sittingOut: number[];
  /** Partnerships for the round, each a pair of seat indices. */
  teams: [number, number][];
}

function oddRotation(n: number): CycleRound[] {
  const half = (n - 1) / 2;
  const rounds: CycleRound[] = [];
  for (let r = 0; r < n; r++) {
    const teams: [number, number][] = [];
    for (let k = 1; k <= half; k++) {
      teams.push([(r + k) % n, (r - k + n) % n]);
    }
    rounds.push({ sittingOut: [r], teams });
  }
  return rounds;
}

function evenRotation(n: number): CycleRound[] {
  let pos = Array.from({ length: n }, (_, i) => i);
  const rounds: CycleRound[] = [];
  for (let r = 0; r < n - 1; r++) {
    const teams: [number, number][] = [];
    for (let i = 0; i < n / 2; i++) teams.push([pos[i], pos[n - 1 - i]]);
    rounds.push({ sittingOut: [], teams });
    // Keep seat 0 fixed, rotate the rest one step.
    pos = [pos[0], pos[n - 1], ...pos.slice(1, n - 1)];
  }
  return rounds;
}

/** Build one full cycle of the rotation for `n` players (seat indices). */
export function buildRotation(n: number): CycleRound[] {
  if (n < 4) throw new Error("Need at least 4 players for a doubles rotation");
  return n % 2 === 1 ? oddRotation(n) : evenRotation(n);
}

/**
 * Singles round-robin pairings: the same circle method, but each pair is a 1v1
 * MATCH (opponents) rather than a partnership. Needs only 2+ players. Over one
 * cycle every player meets every other exactly once; with odd counts one player
 * byes each round (rotating in seed order).
 */
export function buildSinglesRotation(n: number): CycleRound[] {
  if (n < 2) throw new Error("Need at least 2 players for a singles round robin");
  return n % 2 === 1 ? oddRotation(n) : evenRotation(n);
}

// ── Hand-verified golden fixtures (used by tests) ────────────────────────────

/** 4 players — 3 rounds, no byes, every pair partners once. */
export const ROTATION_4: CycleRound[] = buildRotation(4);

/** 5 players — 5 rounds, byes rotate P1→P5, every pair partners once. */
export const ROTATION_5: CycleRound[] = buildRotation(5);

export type Task = { id: string; name: string };
export type Person = { id: string; name: string };
export type BenchRecord = { id: string; taskId: string; personId: string; ms: number; at: number };

export type Stats = {
  count: number;
  best: number;
  worst: number;
  avg: number;
  median: number;
  stdDev: number;
  last: number;
};

export function stats(times: number[]): Stats | null {
  if (!times.length) return null;
  const sorted = [...times].sort((a, b) => a - b);
  const count = times.length;
  const avg = times.reduce((a, b) => a + b, 0) / count;
  const mid = Math.floor(count / 2);
  const median = count % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const variance = times.reduce((a, t) => a + (t - avg) ** 2, 0) / count;
  return {
    count,
    best: sorted[0],
    worst: sorted[count - 1],
    avg,
    median,
    stdDev: Math.sqrt(variance),
    last: times[count - 1],
  };
}

/**
 * Trend: average of the latest (up to) 3 runs minus the average of all earlier runs.
 * Negative = getting faster. null with fewer than 2 runs.
 * `times` must be in chronological order.
 */
export function trend(times: number[]): number | null {
  if (times.length < 2) return null;
  const recentN = Math.min(3, times.length - 1);
  const recent = times.slice(-recentN);
  const earlier = times.slice(0, times.length - recentN);
  const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  return avg(recent) - avg(earlier);
}

export type Row = { person: Person; stats: Stats; trendMs: number | null; rank: number };

export type SortKey = 'best' | 'avg';

/** Leaderboard for one task. Persons with no runs are omitted. Ties share a rank. */
export function leaderboard(
  records: BenchRecord[],
  persons: Person[],
  taskId: string,
  sortBy: SortKey = 'best',
): Row[] {
  const rows: Omit<Row, 'rank'>[] = [];
  for (const person of persons) {
    const times = records
      .filter((r) => r.taskId === taskId && r.personId === person.id)
      .sort((a, b) => a.at - b.at)
      .map((r) => r.ms);
    const st = stats(times);
    if (st) rows.push({ person, stats: st, trendMs: trend(times) });
  }
  rows.sort((a, b) => a.stats[sortBy] - b.stats[sortBy]);
  let rank = 0;
  return rows.map((r, i) => {
    if (i === 0 || r.stats[sortBy] !== rows[i - 1].stats[sortBy]) rank = i + 1;
    return { ...r, rank };
  });
}

export function taskSummary(records: BenchRecord[], taskId: string): Stats | null {
  return stats(records.filter((r) => r.taskId === taskId).map((r) => r.ms));
}

/** Newest first. */
export function history(records: BenchRecord[], taskId: string, personId?: string): BenchRecord[] {
  return records
    .filter((r) => r.taskId === taskId && (!personId || r.personId === personId))
    .sort((a, b) => b.at - a.at);
}

/** Is this run a new personal best for that person on that task (strictly faster than all earlier runs)? */
export function isPersonalBest(records: BenchRecord[], rec: BenchRecord): boolean {
  return !records.some((r) => r.id !== rec.id && r.taskId === rec.taskId && r.personId === rec.personId && r.ms <= rec.ms);
}

export function removeTask(records: BenchRecord[], tasks: Task[], taskId: string) {
  return { tasks: tasks.filter((t) => t.id !== taskId), records: records.filter((r) => r.taskId !== taskId) };
}

export function removePerson(records: BenchRecord[], persons: Person[], personId: string) {
  return { persons: persons.filter((p) => p.id !== personId), records: records.filter((r) => r.personId !== personId) };
}

let counter = 0;
export function newId(prefix: string): string {
  counter += 1;
  return `${prefix}${Date.now().toString(36)}${counter}`;
}

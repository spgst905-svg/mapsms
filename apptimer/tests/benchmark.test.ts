import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  stats, trend, leaderboard, taskSummary, history, isPersonalBest, removePerson, removeTask,
  type BenchRecord, type Person, type Task,
} from '../src/lib/benchmark.ts';

const rec = (id: string, personId: string, ms: number, at: number, taskId = 't1'): BenchRecord => ({ id, taskId, personId, ms, at });
const ann: Person = { id: 'a', name: 'Ann' };
const bob: Person = { id: 'b', name: 'Bob' };
const cy: Person = { id: 'c', name: 'Cy' };

test('stats: best/worst/avg/median/stdDev/last', () => {
  assert.equal(stats([]), null);
  const s = stats([4000, 2000, 6000, 8000])!;
  assert.equal(s.best, 2000);
  assert.equal(s.worst, 8000);
  assert.equal(s.avg, 5000);
  assert.equal(s.median, 5000);
  assert.equal(s.last, 8000);
  assert.ok(Math.abs(s.stdDev - Math.sqrt(5000000)) < 1e-6);
  assert.equal(stats([3, 1, 2])!.median, 2);
});

test('trend: negative when recent runs are faster', () => {
  assert.equal(trend([5000]), null);
  assert.equal(trend([6000, 4000]), -2000);
  assert.equal(trend([10, 10, 10, 4, 4, 4]), -6);
  assert.ok(trend([4, 4, 4, 10, 10, 10])! > 0);
});

test('leaderboard ranks by best, shares ties, omits persons with no runs, uses chronological trend', () => {
  const records = [
    rec('1', 'a', 5000, 1), rec('2', 'a', 4000, 2),
    rec('3', 'b', 4000, 3),
    rec('4', 'a', 9999, 4, 'other-task'),
  ];
  const rows = leaderboard(records, [ann, bob, cy], 't1');
  assert.deepEqual(rows.map((r) => [r.person.name, r.rank]), [['Ann', 1], ['Bob', 1]]);
  assert.equal(rows[0].trendMs, -1000);
  const byAvg = leaderboard(records, [ann, bob], 't1', 'avg');
  assert.deepEqual(byAvg.map((r) => r.person.name), ['Bob', 'Ann']);
});

test('taskSummary and history', () => {
  const records = [rec('1', 'a', 5000, 1), rec('2', 'b', 3000, 2), rec('3', 'a', 1, 3, 'x')];
  assert.equal(taskSummary(records, 't1')!.best, 3000);
  assert.equal(taskSummary(records, 'none'), null);
  assert.deepEqual(history(records, 't1').map((r) => r.id), ['2', '1']);
  assert.deepEqual(history(records, 't1', 'a').map((r) => r.id), ['1']);
});

test('isPersonalBest is strict and per task/person', () => {
  const records = [rec('1', 'a', 5000, 1), rec('2', 'a', 4000, 2), rec('3', 'b', 1000, 3)];
  assert.equal(isPersonalBest(records, records[1]), true);
  assert.equal(isPersonalBest(records, records[0]), false);
  const tie = rec('4', 'a', 4000, 4);
  assert.equal(isPersonalBest([...records, tie], tie), false);
});

test('removing a task or person cascades to records', () => {
  const tasks: Task[] = [{ id: 't1', name: 'x' }, { id: 't2', name: 'y' }];
  const records = [rec('1', 'a', 1, 1, 't1'), rec('2', 'b', 1, 2, 't2')];
  assert.deepEqual(removeTask(records, tasks, 't1').records.map((r) => r.id), ['2']);
  const rp = removePerson(records, [ann, bob], 'a');
  assert.deepEqual(rp.persons, [bob]);
  assert.deepEqual(rp.records.map((r) => r.id), ['2']);
});

import type { BattleUnit } from '../types';

/**
 * BFS で mov マス以内の到達可能セルを列挙する。
 * - 他ユニットがいるマスは通過・停止不可
 * - 自分自身のマスは結果に含めない（現在地は移動先に含めない）
 */
export function calcReachable(
  unit: BattleUnit,
  mov: number,
  allUnits: BattleUnit[],
  mapWidth: number,
  mapHeight: number,
): { x: number; y: number }[] {
  if (unit.hasMoved) return [];

  const occupied = new Set(
    allUnits
      .filter((u) => u.characterId !== unit.characterId)
      .map((u) => `${u.position.x},${u.position.y}`),
  );

  const start = unit.position;
  const visited = new Set<string>();
  const reachable: { x: number; y: number }[] = [];
  const queue: { x: number; y: number; cost: number }[] = [{ ...start, cost: 0 }];
  visited.add(`${start.x},${start.y}`);

  while (queue.length > 0) {
    const { x, y, cost } = queue.shift()!;
    if (cost > 0) reachable.push({ x, y });
    if (cost >= mov) continue;

    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      const key = `${nx},${ny}`;
      if (nx < 0 || nx >= mapWidth || ny < 0 || ny >= mapHeight) continue;
      if (visited.has(key)) continue;
      if (occupied.has(key)) continue;
      visited.add(key);
      queue.push({ x: nx, y: ny, cost: cost + 1 });
    }
  }

  return reachable;
}

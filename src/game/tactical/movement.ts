import type { BattleUnit, TerrainType } from '../types';
import { TERRAIN_DEFS } from '../terrain';

export function calcReachable(
  unit: BattleUnit,
  mov: number,
  allUnits: BattleUnit[],
  mapWidth: number,
  mapHeight: number,
  terrain: TerrainType[][],
): { x: number; y: number }[] {
  if (unit.hasMoved) return [];

  const occupied = new Set(
    allUnits
      .filter((u) => u.characterId !== unit.characterId)
      .map((u) => `${u.position.x},${u.position.y}`),
  );

  const start = unit.position;
  const visited = new Map<string, number>(); // key → lowest cost seen
  const reachable: { x: number; y: number }[] = [];
  const queue: { x: number; y: number; cost: number }[] = [{ ...start, cost: 0 }];
  visited.set(`${start.x},${start.y}`, 0);

  while (queue.length > 0) {
    const { x, y, cost } = queue.shift()!;
    if (cost > 0) reachable.push({ x, y });

    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      const key = `${nx},${ny}`;
      if (nx < 0 || nx >= mapWidth || ny < 0 || ny >= mapHeight) continue;
      if (occupied.has(key)) continue;

      const movCost = TERRAIN_DEFS[terrain[ny]?.[nx] ?? 'plain'].movCost;
      const newCost = cost + movCost;
      if (newCost > mov) continue;
      if ((visited.get(key) ?? Infinity) <= newCost) continue;

      visited.set(key, newCost);
      queue.push({ x: nx, y: ny, cost: newCost });
    }
  }

  return reachable;
}

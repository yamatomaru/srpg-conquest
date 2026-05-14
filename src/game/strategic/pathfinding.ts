import type { Territory } from '../types';

/**
 * BFS で自国領地を経由してターゲットまでの最短経路を探す。
 * 中継地点はプレイヤー所有領地のみ通過可。最終地点のみ敵領地可。
 * 到達不能なら null を返す。
 */
export function findMarchPath(
  fromId: string,
  toId: string,
  territories: Record<string, Territory>,
  playerNationId: string,
): string[] | null {
  if (fromId === toId) return null;
  const queue: string[][] = [[fromId]];
  const visited = new Set([fromId]);
  while (queue.length > 0) {
    const path = queue.shift()!;
    const current = path[path.length - 1];
    for (const adj of (territories[current]?.adjacentTo ?? [])) {
      if (visited.has(adj)) continue;
      const newPath = [...path, adj];
      if (adj === toId) return newPath;
      // 中継は自国領地のみ
      if (territories[adj]?.ownerId === playerNationId) {
        visited.add(adj);
        queue.push(newPath);
      }
    }
  }
  return null;
}

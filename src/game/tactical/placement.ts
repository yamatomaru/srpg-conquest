import type { BattleUnit, Character } from '../types';

const GRID_H = 8;

function placeGroup(
  ids: string[],
  characters: Record<string, Character>,
  side: 'attacker' | 'defender',
  baseX: number,
  xDir: 1 | -1,
): BattleUnit[] {
  return ids.map((cId, i) => {
    const colIdx = Math.floor(i / GRID_H);
    const rowInCol = i % GRID_H;
    // 縦方向に中央寄せ
    const colCount = Math.min(ids.length - colIdx * GRID_H, GRID_H);
    const startRow = Math.floor((GRID_H - colCount) / 2);
    return {
      characterId: cId,
      side,
      position: { x: baseX + xDir * colIdx, y: startRow + rowInCol },
      currentHp: characters[cId].hp,
      hasMoved: false,
      hasActed: false,
    };
  });
}

/**
 * 攻撃側・防衛側のユニットを 8×8 グリッドに初期配置する。
 * 攻撃側は左端（x=0）から、防衛側は右端（x=7）から縦並び。
 */
export function placeUnits(
  attackerIds: string[],
  defenderIds: string[],
  characters: Record<string, Character>,
): BattleUnit[] {
  return [
    ...placeGroup(attackerIds, characters, 'attacker', 0, 1),
    ...placeGroup(defenderIds, characters, 'defender', 7, -1),
  ];
}

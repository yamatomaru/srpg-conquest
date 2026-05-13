import type { BattleUnit, Character } from '../types';

const GRID_H = 6;
export const MAX_BATTLE_UNITS = 6; // 戦術マップ参戦上限（片側）

/** 参戦する最大6体を選出（戦力 atk+matk+def の高い順）*/
export function selectBattleParticipants(
  ids: string[],
  characters: Record<string, Character>,
): string[] {
  const alive = ids.filter((id) => (characters[id]?.hp ?? 0) > 0);
  if (alive.length <= MAX_BATTLE_UNITS) return alive;
  return [...alive]
    .sort((a, b) => {
      const ca = characters[a];
      const cb = characters[b];
      return (cb.atk + cb.matk + cb.def) - (ca.atk + ca.matk + ca.def);
    })
    .slice(0, MAX_BATTLE_UNITS);
}

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
      usedSkill: false,
    };
  });
}

/**
 * 攻撃側・防衛側のユニットを 8×6 グリッドに初期配置する。
 * 各側最大6体（戦力上位）。攻撃側は左端（x=0）、防衛側は右端（x=7）から縦並び。
 */
export function placeUnits(
  attackerIds: string[],
  defenderIds: string[],
  characters: Record<string, Character>,
): BattleUnit[] {
  const selectedAttackers = selectBattleParticipants(attackerIds, characters);
  const selectedDefenders = selectBattleParticipants(defenderIds, characters);
  return [
    ...placeGroup(selectedAttackers, characters, 'attacker', 0, 1),
    ...placeGroup(selectedDefenders, characters, 'defender', 7, -1),
  ];
}

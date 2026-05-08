import type { BattleState, BattleUnit, Character } from '../types';
import { calcReachable } from './movement';
import { getAttackTargets } from './attack';

export type AIAction =
  | { type: 'attack'; attackerId: string; targetId: string }
  | { type: 'move'; unitId: string; to: { x: number; y: number } }
  | { type: 'wait'; unitId: string }

function manhattan(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * 射程持ち（弓師・魔術師・槍士）向け：
 * 近接敵から安全距離を保ちつつターゲットに射程が届く最適ポジション。
 */
function bestRangedCell(
  reachable: { x: number; y: number }[],
  target: BattleUnit,
  ownRange: number,
  meleeEnemies: BattleUnit[],
): { x: number; y: number } | null {
  const inRangeCells = reachable.filter((c) => {
    const d = manhattan(c, target.position);
    return d >= 1 && d <= ownRange;
  });

  const candidates = inRangeCells.length > 0 ? inRangeCells : reachable;

  if (meleeEnemies.length === 0) {
    // 近接敵なし → ターゲットに最も近いセルへ
    return [...candidates].sort(
      (a, b) => manhattan(a, target.position) - manhattan(b, target.position),
    )[0] ?? null;
  }

  return [...candidates].sort((a, b) => {
    const safenessA = Math.min(...meleeEnemies.map((e) => manhattan(a, e.position)));
    const safenessB = Math.min(...meleeEnemies.map((e) => manhattan(b, e.position)));
    if (safenessB !== safenessA) return safenessB - safenessA;
    return manhattan(a, target.position) - manhattan(b, target.position);
  })[0] ?? null;
}

export function decideAIUnitAction(
  unit: BattleUnit,
  characters: Record<string, Character>,
  battle: BattleState,
): AIAction {
  const ch = characters[unit.characterId];
  const enemies = battle.units.filter((u) => u.side !== unit.side);

  if (enemies.length === 0) return { type: 'wait', unitId: unit.characterId };

  // 攻撃可能なら最も HP の低い敵を攻撃
  const attackTargets = getAttackTargets(unit, ch, battle.units);
  if (attackTargets.length > 0) {
    const target = attackTargets
      .map((id) => battle.units.find((u) => u.characterId === id)!)
      .sort((a, b) => a.currentHp - b.currentHp)[0];
    return { type: 'attack', attackerId: unit.characterId, targetId: target.characterId };
  }

  if (!unit.hasMoved) {
    const reachable = calcReachable(unit, ch.mov, battle.units, battle.map.width, battle.map.height, battle.map.terrain);
    if (reachable.length === 0) return { type: 'wait', unitId: unit.characterId };

    const meleeEnemies = enemies.filter((e) => characters[e.characterId]?.range === 1);

    if (ch.range >= 2) {
      // 槍士・弓師・魔術師：最も弱い敵に射程距離から攻撃
      const targetEnemy = [...enemies].sort((a, b) => a.currentHp - b.currentHp)[0];
      const safeEnemies = meleeEnemies.length > 0 ? meleeEnemies : enemies;
      const best = bestRangedCell(reachable, targetEnemy, ch.range, safeEnemies);
      if (best) return { type: 'move', unitId: unit.characterId, to: best };
    } else {
      // 盾士・戦士：最近傍の敵へ直進
      const nearest = [...enemies].sort(
        (a, b) => manhattan(unit.position, a.position) - manhattan(unit.position, b.position),
      )[0];
      const bestCell = [...reachable].sort(
        (a, b) => manhattan(a, nearest.position) - manhattan(b, nearest.position),
      )[0];
      return { type: 'move', unitId: unit.characterId, to: bestCell };
    }
  }

  return { type: 'wait', unitId: unit.characterId };
}

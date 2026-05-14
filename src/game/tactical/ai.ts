import type { BattleState, BattleUnit, Character } from '../types';
import { calcReachable } from './movement';
import { getAttackTargets } from './attack';

export type AIAction =
  | { type: 'attack'; attackerId: string; targetId: string }
  | { type: 'move'; unitId: string; to: { x: number; y: number } }
  | { type: 'skill'; unitId: string; targetId?: string }
  | { type: 'wait'; unitId: string }

function manhattan(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * 射程持ち（弓師・魔術師・槍士・僧侶）向け：
 * - 射程内に届くセルがあれば → 近接敵から最も安全なセルを選ぶ
 * - まだ射程に届かない場合 → ターゲットに近づく（安全度は無視）
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

  // 射程に届かない場合はターゲットへ近づくだけ（安全度ソートは逆効果になる）
  if (inRangeCells.length === 0) {
    return [...reachable].sort(
      (a, b) => manhattan(a, target.position) - manhattan(b, target.position),
    )[0] ?? null;
  }

  // 射程内セルあり → 近接敵から安全なポジションを選ぶ
  if (meleeEnemies.length === 0) {
    return [...inRangeCells].sort(
      (a, b) => manhattan(a, target.position) - manhattan(b, target.position),
    )[0] ?? null;
  }

  return [...inRangeCells].sort((a, b) => {
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
  const allies = battle.units.filter((u) => u.side === unit.side);

  if (enemies.length === 0) return { type: 'wait', unitId: unit.characterId };

  // ── スキル判断（行動前・未使用時のみ）─────────────────
  if (!unit.usedSkill && !unit.hasActed) {
    const jobId = ch.jobId;

    // 魔術師: 射程内に敵2体以上 → 全体魔法（通常攻撃の代わりに最優先）
    if (jobId === 'mage') {
      const inRange = enemies.filter((e) => {
        const d = manhattan(unit.position, e.position);
        return d >= 1 && d <= ch.range;
      });
      if (inRange.length >= 2) {
        return { type: 'skill', unitId: unit.characterId };
      }
    }

    // 弓師: 射程内に敵がいれば連射（2回攻撃 > 1回攻撃）
    if (jobId === 'archer') {
      const targets = getAttackTargets(unit, ch, battle.units);
      if (targets.length > 0) {
        const target = battle.units
          .filter((u) => targets.includes(u.characterId))
          .sort((a, b) => a.currentHp - b.currentHp)[0];
        return { type: 'skill', unitId: unit.characterId, targetId: target.characterId };
      }
    }

    // 騎士: 射程内に敵がいれば二連撃
    if (jobId === 'knight') {
      const targets = getAttackTargets(unit, ch, battle.units);
      if (targets.length > 0) {
        const target = battle.units
          .filter((u) => targets.includes(u.characterId))
          .sort((a, b) => a.currentHp - b.currentHp)[0];
        return { type: 'skill', unitId: unit.characterId, targetId: target.characterId };
      }
    }

    // 戦士: 射程内に敵がいれば渾身撃（直後に2倍ダメージで攻撃）
    if (jobId === 'warrior') {
      const targets = getAttackTargets(unit, ch, battle.units);
      if (targets.length > 0) {
        return { type: 'skill', unitId: unit.characterId };
      }
    }

    // 槍士: 通常射程外・突撃射程内（range+1）の敵 → 突撃
    if (jobId === 'spearman') {
      const chargeOnly = enemies.filter((e) => {
        const d = manhattan(unit.position, e.position);
        return d === ch.range + 1; // 通常攻撃不可・突撃のみ届く距離
      });
      if (chargeOnly.length > 0) {
        const target = chargeOnly.sort((a, b) => a.currentHp - b.currentHp)[0];
        return { type: 'skill', unitId: unit.characterId, targetId: target.characterId };
      }
    }

    // 盾士: HP が60%未満なら庇護の構え
    if (jobId === 'shielder' && unit.currentHp < ch.maxHp * 0.6) {
      return { type: 'skill', unitId: unit.characterId };
    }

    // 僧侶: 射程内に HPが70%未満の味方がいれば回復スキル発動
    if (jobId === 'priest') {
      const woundedAlly = allies.find((a) => {
        const allyCh = characters[a.characterId];
        if (!allyCh) return false;
        const dist = manhattan(unit.position, a.position);
        return dist <= ch.range && a.currentHp < allyCh.maxHp * 0.7;
      });
      if (woundedAlly) {
        return { type: 'skill', unitId: unit.characterId };
      }
    }
  }

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

    if (ch.jobId === 'priest') {
      // 僧侶: 最も瀕死の味方に近づく
      const woundedAlly = [...allies].sort((a, b) => {
        const aCh = characters[a.characterId];
        const bCh = characters[b.characterId];
        const aRatio = aCh ? a.currentHp / aCh.maxHp : 1;
        const bRatio = bCh ? b.currentHp / bCh.maxHp : 1;
        return aRatio - bRatio;
      })[0];
      const bestCell = [...reachable].sort(
        (a, b) => manhattan(a, woundedAlly.position) - manhattan(b, woundedAlly.position),
      )[0];
      return { type: 'move', unitId: unit.characterId, to: bestCell };
    }

    if (ch.range >= 2) {
      // 槍士・弓師・魔術師：最も弱い敵に射程距離から攻撃
      const targetEnemy = [...enemies].sort((a, b) => a.currentHp - b.currentHp)[0];
      const safeEnemies = meleeEnemies.length > 0 ? meleeEnemies : enemies;
      const best = bestRangedCell(reachable, targetEnemy, ch.range, safeEnemies);
      if (best) return { type: 'move', unitId: unit.characterId, to: best };
    } else {
      // 盾士・戦士・騎士：最近傍の敵へ直進
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

import type { BattleUnit, Character } from '../types';

export function calculateDamage(attacker: Character, defender: Character): number {
  return Math.max(1, attacker.atk - defender.def);
}

export function canAttack(
  attacker: BattleUnit,
  target: BattleUnit,
  attackerChar: Character,
): boolean {
  if (attacker.side === target.side) return false;
  if (attacker.hasActed) return false;
  const dist =
    Math.abs(attacker.position.x - target.position.x) +
    Math.abs(attacker.position.y - target.position.y);
  return dist >= 1 && dist <= attackerChar.range;
}

export function getAttackTargets(
  attacker: BattleUnit,
  attackerChar: Character,
  allUnits: BattleUnit[],
): string[] {
  return allUnits
    .filter((u) => canAttack(attacker, u, attackerChar))
    .map((u) => u.characterId);
}

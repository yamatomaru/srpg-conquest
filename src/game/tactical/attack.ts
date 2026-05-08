import type { BattleUnit, Character, TerrainType } from '../types';
import { TERRAIN_DEFS } from '../terrain';

export function calculateDamage(
  attacker: Character,
  defender: Character,
  terrain?: TerrainType,
  powerAttack = false,
): number {
  const defBonus  = terrain ? TERRAIN_DEFS[terrain].defBonus  : 0;
  const mdefBonus = terrain ? TERRAIN_DEFS[terrain].mdefBonus : 0;

  const raw = attacker.jobId === 'mage'
    ? attacker.matk - (defender.mdef + mdefBonus)
    : attacker.atk  - (defender.def  + defBonus);

  return Math.max(1, powerAttack ? raw * 2 : raw);
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

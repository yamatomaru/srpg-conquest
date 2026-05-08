import type { GameState } from '../types';

/** AI同士（またはプレイヤー不在）の戦闘を兵力比で自動解決 */
export function resolveAutoBattle(
  state: GameState,
  fromId: string,
  toId: string,
): { winnerSide: 'attacker' | 'defender'; survivingAttackerIds: string[] } {
  const from = state.territories[fromId];
  const to = state.territories[toId];

  const attackerPower = from.garrisonIds
    .filter((id) => (state.characters[id]?.hp ?? 0) > 0)
    .reduce((sum, id) => {
      const ch = state.characters[id];
      return sum + ch.atk + ch.hp;
    }, 0);
  const defenderPower = to.garrisonIds
    .filter((id) => (state.characters[id]?.hp ?? 0) > 0)
    .reduce((sum, id) => {
      const ch = state.characters[id];
      return sum + ch.atk + ch.hp + ch.def * 2; // 防衛有利
    }, 0);

  const attackerWins = attackerPower > defenderPower;
  const ratio = attackerWins
    ? attackerPower / (attackerPower + defenderPower)
    : 0;

  const aliveAttackerIds = from.garrisonIds.filter((id) => (state.characters[id]?.hp ?? 0) > 0);

  // 攻撃側の生存者（勝利時は生存比率に応じて削減）
  const survivingCount = attackerWins
    ? Math.max(1, Math.round(aliveAttackerIds.length * (ratio - 0.2)))
    : Math.floor(aliveAttackerIds.length * 0.5);

  const survivingAttackerIds = aliveAttackerIds.slice(0, survivingCount);

  return {
    winnerSide: attackerWins ? 'attacker' : 'defender',
    survivingAttackerIds,
  };
}

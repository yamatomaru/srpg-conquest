import type { GameState } from '../types';

/** AI同士（またはプレイヤー不在）の戦闘を兵力比で自動解決 */
export function resolveAutoBattle(
  state: GameState,
  fromId: string,
  toId: string,
): { winnerSide: 'attacker' | 'defender'; survivingAttackerIds: string[] } {
  const from = state.territories[fromId];
  const to = state.territories[toId];

  // atk+matk+def で全ジョブをほぼ均等評価（盾士21/戦士21/魔術師24/弓師20/槍士19）
  const unitPower = (id: string) => {
    const ch = state.characters[id];
    if (!ch) return 0;
    return ch.atk + ch.matk + ch.def;
  };

  const aliveAttackerIds = from.garrisonIds.filter((id) => (state.characters[id]?.hp ?? 0) > 0);
  const aliveDefenderIds = to.garrisonIds.filter((id) => (state.characters[id]?.hp ?? 0) > 0);

  // 攻撃側に20%ボーナス（先手利・攻勢の優位）。防衛DEFボーナスは廃止
  const rawAttacker = aliveAttackerIds.reduce((s, id) => s + unitPower(id), 0) * 1.2;
  const rawDefender = aliveDefenderIds.reduce((s, id) => s + unitPower(id), 0);

  // ±20%の戦場ランダム要素（地形・士気・指揮の不確定性）
  const noise = () => 0.8 + Math.random() * 0.4; // 0.8〜1.2
  const attackerPower = rawAttacker * noise();
  const defenderPower = rawDefender * noise();

  const attackerWins = attackerPower > defenderPower;
  const ratio = attackerWins ? attackerPower / (attackerPower + defenderPower) : 0;

  // ceilで生存者を多めに確保（連鎖侵攻を維持できるように）
  const survivingCount = attackerWins
    ? Math.max(1, Math.ceil(aliveAttackerIds.length * ratio))
    : 0;

  return {
    winnerSide: attackerWins ? 'attacker' : 'defender',
    survivingAttackerIds: aliveAttackerIds.slice(0, survivingCount),
  };
}

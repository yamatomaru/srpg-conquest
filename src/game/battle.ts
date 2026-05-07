import type { GameState } from './types';

/**
 * ダミー戦闘ロジック（Sprint 2）。
 * 兵数比較のみで勝敗を決定。Sprint 4 で HP/ATK/DEF を使う本物に差し替える。
 *
 * 攻撃側兵数 > 防衛側兵数 → 攻撃側勝利
 *   移動兵 = 攻撃側の前半（切り上げ）、残留兵 = 後半
 *   防衛側全滅、領地の所有権が攻撃側に移る
 *
 * 攻撃側兵数 ≤ 防衛側兵数 → 防衛側勝利
 *   攻撃側全滅、領地の所有権変化なし
 */
export function executeDummyBattle(
  state: GameState,
  fromId: string,
  toId: string,
): Pick<GameState, 'nations' | 'territories'> {
  const from = state.territories[fromId];
  const to = state.territories[toId];
  const attackerNationId = from.ownerId;
  const defenderNationId = to.ownerId;
  const attackerCount = from.garrisonIds.length;
  const defenderCount = to.garrisonIds.length;

  const newNations = {
    ...state.nations,
    [attackerNationId]: { ...state.nations[attackerNationId] },
    [defenderNationId]: { ...state.nations[defenderNationId] },
  };
  let newTerritories = { ...state.territories };

  if (attackerCount > defenderCount) {
    // 攻撃側勝利
    const moveCount = Math.ceil(attackerCount / 2);
    const movingIds = from.garrisonIds.slice(0, moveCount);
    const stayingIds = from.garrisonIds.slice(moveCount);
    const deadIds = to.garrisonIds;

    newNations[defenderNationId] = {
      ...newNations[defenderNationId],
      characterIds: newNations[defenderNationId].characterIds.filter(
        (id) => !deadIds.includes(id),
      ),
    };

    newTerritories = {
      ...newTerritories,
      [fromId]: { ...from, garrisonIds: stayingIds, hasActed: true },
      [toId]: {
        ...to,
        ownerId: attackerNationId,
        garrisonIds: movingIds,
        hasActed: false,
      },
    };

    // 防衛側が全領地を失ったら defeated
    const defenderTerritoryCount = Object.values(newTerritories).filter(
      (t) => t.ownerId === defenderNationId,
    ).length;
    if (defenderTerritoryCount === 0) {
      newNations[defenderNationId] = {
        ...newNations[defenderNationId],
        defeated: true,
      };
    }
  } else {
    // 防衛側勝利
    const deadIds = from.garrisonIds;

    newNations[attackerNationId] = {
      ...newNations[attackerNationId],
      characterIds: newNations[attackerNationId].characterIds.filter(
        (id) => !deadIds.includes(id),
      ),
    };

    newTerritories = {
      ...newTerritories,
      [fromId]: { ...from, garrisonIds: [], hasActed: true },
    };

    // 攻撃側が全領地かつ全兵を失ったら defeated
    const attackerTerritoryCount = Object.values(newTerritories).filter(
      (t) => t.ownerId === attackerNationId,
    ).length;
    if (
      attackerTerritoryCount === 0 &&
      newNations[attackerNationId].characterIds.length === 0
    ) {
      newNations[attackerNationId] = {
        ...newNations[attackerNationId],
        defeated: true,
      };
    }
  }

  return { nations: newNations, territories: newTerritories };
}

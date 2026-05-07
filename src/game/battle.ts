import type { GameState } from './types';

type BattleResult = Pick<GameState, 'nations' | 'territories'>;

/** 攻撃側勝利時の領地・キャラ更新。Sprint 4 で HP 計算後に呼ばれる前提。 */
export function applyAttackerWins(
  state: GameState,
  fromId: string,
  toId: string,
): BattleResult {
  const from = state.territories[fromId];
  const to = state.territories[toId];
  const attackerNationId = from.ownerId;
  const defenderNationId = to.ownerId;

  const moveCount = Math.ceil(from.garrisonIds.length / 2);
  const movingIds = from.garrisonIds.slice(0, moveCount);
  const stayingIds = from.garrisonIds.slice(moveCount);
  const deadIds = to.garrisonIds;

  const newNations = {
    ...state.nations,
    [defenderNationId]: {
      ...state.nations[defenderNationId],
      characterIds: state.nations[defenderNationId].characterIds.filter(
        (id) => !deadIds.includes(id),
      ),
    },
  };

  const newTerritories = {
    ...state.territories,
    [fromId]: { ...from, garrisonIds: stayingIds, hasActed: true },
    [toId]: { ...to, ownerId: attackerNationId, garrisonIds: movingIds, hasActed: false },
  };

  // 防衛側が全領地を失ったら defeated
  const defenderTerritoryCount = Object.values(newTerritories).filter(
    (t) => t.ownerId === defenderNationId,
  ).length;
  if (defenderTerritoryCount === 0) {
    newNations[defenderNationId] = { ...newNations[defenderNationId], defeated: true };
  }

  return { nations: newNations, territories: newTerritories };
}

/** 防衛側勝利時の領地・キャラ更新。 */
export function applyDefenderWins(
  state: GameState,
  fromId: string,
  toId: string,
): BattleResult {
  const from = state.territories[fromId];
  const attackerNationId = from.ownerId;
  const deadIds = from.garrisonIds;

  const newNations = {
    ...state.nations,
    [attackerNationId]: {
      ...state.nations[attackerNationId],
      characterIds: state.nations[attackerNationId].characterIds.filter(
        (id) => !deadIds.includes(id),
      ),
    },
  };

  const newTerritories = {
    ...state.territories,
    [fromId]: { ...from, garrisonIds: [], hasActed: true },
  };

  // 攻撃側の兵が全滅したら defeated
  if (newNations[attackerNationId].characterIds.length === 0) {
    newNations[attackerNationId] = { ...newNations[attackerNationId], defeated: true };
  }

  return { nations: newNations, territories: newTerritories };
}

/**
 * ダミー戦闘（Sprint 2 互換）。兵数比較で勝者を決め、上記関数を呼ぶ。
 * Sprint 4 で HP/ATK/DEF ベースに差し替える。
 */
export function executeDummyBattle(
  state: GameState,
  fromId: string,
  toId: string,
): BattleResult {
  const attackerCount = state.territories[fromId].garrisonIds.length;
  const defenderCount = state.territories[toId].garrisonIds.length;
  return attackerCount > defenderCount
    ? applyAttackerWins(state, fromId, toId)
    : applyDefenderWins(state, fromId, toId);
}

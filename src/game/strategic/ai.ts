import type { GameState } from '../types';

export type StrategicAction =
  | { type: 'invade'; fromId: string; toId: string }
  | { type: 'pass' }

export interface AITransfer {
  fromId: string;
  toId: string;
  charIds: string[];
}

/** 最も弱い（駐留数が少ない）隣接敵領地に侵攻（同盟国は攻撃しない） */
export function decideAINationAction(nationId: string, state: GameState): StrategicAction {
  const playerNationId = Object.values(state.nations).find((n) => n.isPlayer)?.id ?? '';
  // プレイヤーとの同盟チェック
  const allianceWithPlayer = state.relations?.[nationId]?.status === 'alliance';

  const myTerritories = Object.values(state.territories).filter(
    (t) => t.ownerId === nationId && !t.hasActed && t.garrisonIds.length > 0,
  );

  let bestFrom = '';
  let bestTo = '';
  let bestScore = Infinity;

  for (const from of myTerritories) {
    for (const adjId of from.adjacentTo) {
      const adj = state.territories[adjId];
      if (adj.ownerId === nationId) continue;
      const targetNationId = adj.ownerId;
      const enemyNation = state.nations[targetNationId];
      if (!enemyNation || enemyNation.defeated) continue;
      // 同盟国のプレイヤー領地は攻撃しない
      if (allianceWithPlayer && targetNationId === playerNationId) continue;
      const score = adj.garrisonIds.length - from.garrisonIds.length;
      if (score < bestScore) {
        bestScore = score;
        bestFrom = from.id;
        bestTo = adj.id;
      }
    }
  }

  if (bestFrom && bestTo) return { type: 'invade', fromId: bestFrom, toId: bestTo };
  return { type: 'pass' };
}

/** 内陸の余剰兵力を国境領地へ移動させる */
export function decideAITransfers(nationId: string, state: GameState): AITransfer[] {
  const myTerritories = Object.values(state.territories).filter(
    (t) => t.ownerId === nationId && !t.hasActed,
  );
  const transfers: AITransfer[] = [];

  for (const from of myTerritories) {
    const aliveInFrom = from.garrisonIds.filter((id) => state.characters[id]?.hp > 0);
    if (aliveInFrom.length < 2) continue;

    const fromIsBorder = from.adjacentTo.some((adjId) => {
      const adj = state.territories[adjId];
      return adj.ownerId !== nationId && !state.nations[adj.ownerId]?.defeated;
    });
    if (fromIsBorder) continue; // 国境領地は転出しない

    const friendlyBorderAdj = from.adjacentTo
      .filter((adjId) => {
        const adj = state.territories[adjId];
        if (adj.ownerId !== nationId || adj.hasActed) return false;
        return adj.adjacentTo.some((a2) => {
          const t2 = state.territories[a2];
          return t2.ownerId !== nationId && !state.nations[t2.ownerId]?.defeated;
        });
      })
      .sort((a, b) => state.territories[a].garrisonIds.length - state.territories[b].garrisonIds.length);

    if (friendlyBorderAdj.length === 0) continue;

    const toId = friendlyBorderAdj[0];
    const to = state.territories[toId];
    const aliveInTo = to.garrisonIds.filter((id) => state.characters[id]?.hp > 0);

    if (aliveInFrom.length <= aliveInTo.length) continue;

    const surplus = aliveInFrom.length - aliveInTo.length;
    const count = Math.max(1, Math.floor(surplus / 2));
    const charIds = aliveInFrom.slice(0, count);

    transfers.push({ fromId: from.id, toId, charIds });
  }

  return transfers;
}

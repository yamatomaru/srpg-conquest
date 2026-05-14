import type { Difficulty, GameState, Territory } from '../types';

export type StrategicAction =
  | { type: 'invade'; fromId: string; toId: string }
  | { type: 'pass' }

export interface AITransfer {
  fromId: string;
  toId: string;
  charIds: string[];
}

// ── ヘルパー ──────────────────────────────────────────

function getMyTerritories(nationId: string, state: GameState) {
  return Object.values(state.territories).filter(
    (t) => t.ownerId === nationId && !t.hasActed &&
           t.garrisonIds.some((id) => (state.characters[id]?.hp ?? 0) > 0),
  );
}

function liveCount(t: Territory, state: GameState) {
  return t.garrisonIds.filter((id) => state.characters[id]?.hp > 0).length;
}

function getEnemyAdj(from: Territory, nationId: string, state: GameState, skipNationId?: string) {
  return from.adjacentTo
    .map((id) => state.territories[id])
    .filter((adj) => {
      if (adj.ownerId === nationId) return false;
      const en = state.nations[adj.ownerId];
      if (!en || en.defeated) return false;
      if (skipNationId && adj.ownerId === skipNationId) return false;
      return true;
    });
}

// ── 朱雀：機を見て最弱を叩く・適度な読めなさ ─────────

function decideSuzaku(nationId: string, state: GameState, alliancePlayerId?: string): StrategicAction {
  const mine = getMyTerritories(nationId, state);

  // 隣接敵国の中で最も領地数が少ない国を特定し、集中攻撃
  const adjNationTerritories: Record<string, number> = {};
  for (const from of mine) {
    for (const adj of getEnemyAdj(from, nationId, state, alliancePlayerId)) {
      if (adjNationTerritories[adj.ownerId] === undefined) {
        adjNationTerritories[adj.ownerId] = Object.values(state.territories)
          .filter((t) => t.ownerId === adj.ownerId).length;
      }
    }
  }
  const weakestNationId = Object.entries(adjNationTerritories)
    .sort(([, a], [, b]) => a - b)[0]?.[0];

  const candidates: { from: string; to: string; score: number }[] = [];
  for (const from of mine) {
    const myCount = liveCount(from, state);
    for (const adj of getEnemyAdj(from, nationId, state, alliancePlayerId)) {
      const enemyCount = liveCount(adj, state);
      if (myCount < enemyCount * 0.7) continue;
      // 最弱国への攻撃を優先（スコア-3のボーナス）
      const focus = adj.ownerId === weakestNationId ? -3 : 0;
      const score = focus + enemyCount - myCount + (Math.random() * 2 - 1);
      candidates.push({ from: from.id, to: adj.id, score });
    }
  }
  if (candidates.length === 0) return { type: 'pass' };

  candidates.sort((a, b) => a.score - b.score);
  const pick = candidates[Math.floor(Math.random() * Math.min(2, candidates.length))];
  return { type: 'invade', fromId: pick.from, toId: pick.to };
}

// ── 青龍：数的優位を確立してから攻勢 ─────────────────

function decideSeiryu(nationId: string, state: GameState, alliancePlayerId?: string): StrategicAction {
  const mine = getMyTerritories(nationId, state);

  const myTotal = mine.reduce((s, t) => s + liveCount(t, state), 0);
  const enemyBorderTotal = mine.reduce((s, from) => {
    return s + getEnemyAdj(from, nationId, state, alliancePlayerId)
      .reduce((es, adj) => es + liveCount(adj, state), 0);
  }, 0);

  if (myTotal < enemyBorderTotal * 0.7) return { type: 'pass' };

  const candidates: { from: string; to: string; score: number }[] = [];
  for (const from of mine) {
    for (const adj of getEnemyAdj(from, nationId, state, alliancePlayerId)) {
      const score = liveCount(adj, state) - liveCount(from, state) + (Math.random() - 0.5);
      candidates.push({ from: from.id, to: adj.id, score });
    }
  }
  if (candidates.length === 0) return { type: 'pass' };
  candidates.sort((a, b) => a.score - b.score);
  return { type: 'invade', fromId: candidates[0].from, toId: candidates[0].to };
}

// ── 玄武：守備優先、数的有利のみ攻撃 ────────────────

function decideGenbu(nationId: string, state: GameState, alliancePlayerId?: string): StrategicAction {
  const mine = getMyTerritories(nationId, state);

  const candidates: { from: string; to: string; score: number }[] = [];
  for (const from of mine) {
    for (const adj of getEnemyAdj(from, nationId, state, alliancePlayerId)) {
      const myCount = liveCount(from, state);
      const enemyCount = liveCount(adj, state);
      // 0.55倍以上なら攻める（守備優先だが積極性も維持）
      if (myCount < enemyCount * 0.55) continue;
      const score = enemyCount - myCount + (Math.random() - 0.5);
      candidates.push({ from: from.id, to: adj.id, score });
    }
  }
  if (candidates.length === 0) return { type: 'pass' };
  candidates.sort((a, b) => a.score - b.score);
  return { type: 'invade', fromId: candidates[0].from, toId: candidates[0].to };
}

// ── 黄竜：前線に満遍なく配置して攻撃 ────────────────

function decideKoryu(nationId: string, state: GameState, alliancePlayerId?: string): StrategicAction {
  const mine = getMyTerritories(nationId, state);

  const allTargets: { from: string; to: string; ratio: number }[] = [];
  for (const from of mine) {
    for (const adj of getEnemyAdj(from, nationId, state, alliancePlayerId)) {
      const ratio = liveCount(from, state) / (liveCount(adj, state) + 1);
      allTargets.push({ from: from.id, to: adj.id, ratio });
    }
  }
  if (allTargets.length === 0) return { type: 'pass' };

  // 均等な配置感を出すため自軍有利な箇所から攻撃
  allTargets.sort((a, b) => b.ratio - a.ratio);
  const pick = allTargets[0];
  if (pick.ratio >= 0.5) return { type: 'invade', fromId: pick.from, toId: pick.to };
  return { type: 'pass' };
}

// ── 白虎：速攻・積極攻勢 ─────────────────────────────

function decideByakko(nationId: string, state: GameState, alliancePlayerId?: string): StrategicAction {
  const mine = getMyTerritories(nationId, state);

  // 最弱国に集中（Suzakuと同様）
  const adjNationTerritories: Record<string, number> = {};
  for (const from of mine) {
    for (const adj of getEnemyAdj(from, nationId, state, alliancePlayerId)) {
      if (adjNationTerritories[adj.ownerId] === undefined) {
        adjNationTerritories[adj.ownerId] = Object.values(state.territories)
          .filter((t) => t.ownerId === adj.ownerId).length;
      }
    }
  }
  const weakestNationId = Object.entries(adjNationTerritories)
    .sort(([, a], [, b]) => a - b)[0]?.[0];

  const candidates: { from: string; to: string; score: number }[] = [];
  for (const from of mine) {
    const myCount = liveCount(from, state);
    for (const adj of getEnemyAdj(from, nationId, state, alliancePlayerId)) {
      const enemyCount = liveCount(adj, state);
      if (myCount < enemyCount * 0.7) continue;
      const focus = adj.ownerId === weakestNationId ? -3 : 0;
      const score = focus + enemyCount + (Math.random() - 0.5);
      candidates.push({ from: from.id, to: adj.id, score });
    }
  }
  if (candidates.length === 0) return { type: 'pass' };
  candidates.sort((a, b) => a.score - b.score);
  return { type: 'invade', fromId: candidates[0].from, toId: candidates[0].to };
}

// ── Hard 専用：pass 時の強行侵攻 ─────────────────────

function hardForcedInvade(nationId: string, state: GameState, alliancePlayerId?: string): StrategicAction {
  const mine = getMyTerritories(nationId, state);
  const candidates: { from: string; to: string; score: number }[] = [];
  for (const from of mine) {
    for (const adj of getEnemyAdj(from, nationId, state, alliancePlayerId)) {
      // Hard: 0.6 倍でも侵攻する（通常より積極的）
      if (liveCount(from, state) >= liveCount(adj, state) * 0.6) {
        candidates.push({ from: from.id, to: adj.id, score: liveCount(adj, state) - liveCount(from, state) });
      }
    }
  }
  if (candidates.length === 0) return { type: 'pass' };
  candidates.sort((a, b) => a.score - b.score);
  return { type: 'invade', fromId: candidates[0].from, toId: candidates[0].to };
}

// ── 公開API ──────────────────────────────────────────

export function decideAINationAction(
  nationId: string,
  state: GameState,
  difficulty: Difficulty = 'normal',
): StrategicAction {
  const nation = state.nations[nationId];
  const playerNationId = Object.values(state.nations).find((n) => n.isPlayer)?.id ?? '';
  const allianceWithPlayer = state.relations?.[nationId]?.status === 'alliance';
  const skipPlayer = allianceWithPlayer ? playerNationId : undefined;

  // Easy: 50% の確率で侵攻をパス
  if (difficulty === 'easy' && Math.random() < 0.5) return { type: 'pass' };

  let result: StrategicAction;
  switch (nation?.faction) {
    case '朱雀': result = decideSuzaku(nationId, state, skipPlayer); break;
    case '青龍': result = decideSeiryu(nationId, state, skipPlayer); break;
    case '玄武': result = decideGenbu(nationId, state, skipPlayer); break;
    case '黄竜': result = decideKoryu(nationId, state, skipPlayer); break;
    case '白虎': result = decideByakko(nationId, state, skipPlayer); break;
    default:     result = decideSuzaku(nationId, state, skipPlayer); break;
  }

  // Hard: 通常判断が pass なら強行侵攻を試みる
  if (difficulty === 'hard' && result.type === 'pass') {
    return hardForcedInvade(nationId, state, skipPlayer);
  }

  return result;
}

// ── 兵力移動：勢力別 ─────────────────────────────────

export function decideAITransfers(nationId: string, state: GameState): AITransfer[] {
  const nation = state.nations[nationId];
  const faction = nation?.faction ?? '';
  const transfers: AITransfer[] = [];

  const myTerritories = Object.values(state.territories).filter(
    (t) => t.ownerId === nationId && !t.hasActed,
  );

  for (const from of myTerritories) {
    const aliveInFrom = from.garrisonIds.filter((id) => state.characters[id]?.hp > 0);
    if (aliveInFrom.length < 2) continue;

    const fromIsBorder = from.adjacentTo.some((adjId) => {
      const adj = state.territories[adjId];
      return adj.ownerId !== nationId && !state.nations[adj.ownerId]?.defeated;
    });

    // 玄武は国境にも増援を送り続ける（守備強化）
    if (fromIsBorder && faction !== '玄武') continue;
    // 玄武：国境領地も余剰があれば隣接国境へ分散
    if (fromIsBorder && faction === '玄武' && aliveInFrom.length < 3) continue;

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

    // 送り先より多い場合のみ（ただし1人は守備に残す）
    if (aliveInFrom.length < 2) continue;
    const maxSend = aliveInFrom.length - 1; // 1人守備に残す
    if (maxSend <= 0 || aliveInTo.length >= aliveInFrom.length + 1) continue;

    // 青龍：より多く集める（ratio高め）/ 黄竜：均等に分散（ratio低め）
    const ratio = faction === '青龍' ? 0.75 : faction === '黄竜' ? 0.4 : 0.5;
    const count = Math.max(1, Math.floor(maxSend * ratio));
    const charIds = aliveInFrom.slice(0, count);

    transfers.push({ fromId: from.id, toId, charIds });
  }

  return transfers;
}

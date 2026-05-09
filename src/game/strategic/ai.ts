import type { GameState, Territory } from '../types';

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
    (t) => t.ownerId === nationId && !t.hasActed && t.garrisonIds.length > 0,
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

// ── 朱雀：流動的・読めない ────────────────────────────

function decideSuzaku(nationId: string, state: GameState, alliancePlayerId?: string): StrategicAction {
  const mine = getMyTerritories(nationId, state);
  const candidates: { from: string; to: string; score: number }[] = [];

  for (const from of mine) {
    for (const adj of getEnemyAdj(from, nationId, state, alliancePlayerId)) {
      // スコアにランダム性を加えて読めない行動に
      const random = Math.random() * 4 - 2;
      const score = adj.garrisonIds.length - liveCount(from, state) + random;
      candidates.push({ from: from.id, to: adj.id, score });
    }
  }
  if (candidates.length === 0) return { type: 'pass' };

  // ランダム性を持ちつつ有利な方向へ
  candidates.sort((a, b) => a.score - b.score);
  // 上位3択からランダムに選ぶ
  const pick = candidates[Math.floor(Math.random() * Math.min(3, candidates.length))];
  return { type: 'invade', fromId: pick.from, toId: pick.to };
}

// ── 青龍：数的優位を確立してから攻勢 ─────────────────

function decideSeiryu(nationId: string, state: GameState, alliancePlayerId?: string): StrategicAction {
  const mine = getMyTerritories(nationId, state);

  // 自軍合計 vs 全隣接敵合計
  const myTotal = mine.reduce((s, t) => s + liveCount(t, state), 0);
  const enemyBorderTotal = mine.reduce((s, from) => {
    return s + getEnemyAdj(from, nationId, state, alliancePlayerId)
      .reduce((es, adj) => es + liveCount(adj, state), 0);
  }, 0);

  // 兵数比が 1.4 倍超えたら攻勢
  if (myTotal < enemyBorderTotal * 1.4) return { type: 'pass' };

  let best = { from: '', to: '', score: Infinity };
  for (const from of mine) {
    for (const adj of getEnemyAdj(from, nationId, state, alliancePlayerId)) {
      const score = liveCount(adj, state) - liveCount(from, state);
      if (score < best.score) { best = { from: from.id, to: adj.id, score }; }
    }
  }
  if (best.from) return { type: 'invade', fromId: best.from, toId: best.to };
  return { type: 'pass' };
}

// ── 玄武：守備優先、数的有利のみ攻撃 ────────────────

function decideGenbu(nationId: string, state: GameState, alliancePlayerId?: string): StrategicAction {
  const mine = getMyTerritories(nationId, state);

  let best = { from: '', to: '', score: Infinity };
  for (const from of mine) {
    for (const adj of getEnemyAdj(from, nationId, state, alliancePlayerId)) {
      const myCount = liveCount(from, state);
      const enemyCount = liveCount(adj, state);
      // 自軍が 2 倍以上のときだけ攻める
      if (myCount < enemyCount * 2) continue;
      const score = enemyCount - myCount;
      if (score < best.score) { best = { from: from.id, to: adj.id, score }; }
    }
  }
  if (best.from) return { type: 'invade', fromId: best.from, toId: best.to };
  return { type: 'pass' };
}

// ── 黄竜：前線に満遍なく配置して攻撃 ────────────────

function decideKoryu(nationId: string, state: GameState, alliancePlayerId?: string): StrategicAction {
  const mine = getMyTerritories(nationId, state);

  // 国境領地ごとに均等に兵を配置する意図で、
  // 各国境から均等に攻撃（最弱ではなく均等に）
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
  if (pick.ratio >= 0.8) return { type: 'invade', fromId: pick.from, toId: pick.to };
  return { type: 'pass' };
}

// ── 白虎：速攻・積極攻勢 ─────────────────────────────

function decideByakko(nationId: string, state: GameState, alliancePlayerId?: string): StrategicAction {
  const mine = getMyTerritories(nationId, state);

  // 兵数有利不利に関わらず常に最弱の敵へ攻め込む
  let best = { from: '', to: '', score: Infinity };
  for (const from of mine) {
    for (const adj of getEnemyAdj(from, nationId, state, alliancePlayerId)) {
      // 敵が少ないほど優先（自軍の多さは考慮しない）
      const score = liveCount(adj, state);
      if (score < best.score) { best = { from: from.id, to: adj.id, score }; }
    }
  }
  if (best.from) return { type: 'invade', fromId: best.from, toId: best.to };
  return { type: 'pass' };
}

// ── 公開API ──────────────────────────────────────────

export function decideAINationAction(nationId: string, state: GameState): StrategicAction {
  const nation = state.nations[nationId];
  const playerNationId = Object.values(state.nations).find((n) => n.isPlayer)?.id ?? '';
  const allianceWithPlayer = state.relations?.[nationId]?.status === 'alliance';
  const skipPlayer = allianceWithPlayer ? playerNationId : undefined;

  switch (nation?.faction) {
    case '朱雀': return decideSuzaku(nationId, state, skipPlayer);
    case '青龍': return decideSeiryu(nationId, state, skipPlayer);
    case '玄武': return decideGenbu(nationId, state, skipPlayer);
    case '黄竜': return decideKoryu(nationId, state, skipPlayer);
    case '白虎': return decideByakko(nationId, state, skipPlayer);
    default:     return decideSuzaku(nationId, state, skipPlayer);
  }
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

    if (aliveInFrom.length <= aliveInTo.length) continue;

    const surplus = aliveInFrom.length - aliveInTo.length;
    // 青龍：より多く集める（ratio高め）/ 黄竜：均等に分散（ratio低め）
    const ratio = faction === '青龍' ? 0.75 : faction === '黄竜' ? 0.4 : 0.5;
    const count = Math.max(1, Math.floor(surplus * ratio));
    const charIds = aliveInFrom.slice(0, count);

    transfers.push({ fromId: from.id, toId, charIds });
  }

  return transfers;
}

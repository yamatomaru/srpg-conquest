import type { GameState } from './types';
import { NATIONS } from '../data/nations';
import { TERRITORIES } from '../data/territories';
import { CHARACTERS } from '../data/characters';
import { decideAINationAction, decideAITransfers } from './strategic/ai';
import { resolveAutoBattle } from './strategic/autoBattle';

// ── 型定義 ──────────────────────────────────────────

export interface SimRunResult {
  winnerId: string | null;
  winnerName: string;
  winnerFaction: string;
  months: number;
  targetWon: boolean;
  finalTerritories: Record<string, number>; // nationId → 領地数
  finalGold: Record<string, number>;        // nationId → gold
}

export interface NationStats {
  id: string;
  name: string;
  faction: string;
  wins: number;
  winRate: number;
  avgFinalTerritories: number;
  avgFinalGold: number;
}

export interface SimStats {
  runs: number;
  targetNationId: string;
  targetNationName: string;
  targetWinRate: number;
  avgMonths: number;
  minMonths: number;
  maxMonths: number;
  nations: NationStats[];
  suggestions: string[];
  rawResults: SimRunResult[];
}

// ── 内部ステート ────────────────────────────────────

interface SimState {
  nations: GameState['nations'];
  territories: GameState['territories'];
  characters: GameState['characters'];
  relations: GameState['relations'];
  winnerId: string | null;
  month: number;
}

function buildSimState(targetNationId: string): SimState {
  const nations: GameState['nations'] = {};
  for (const [id, n] of Object.entries(NATIONS)) {
    nations[id] = { ...n, isPlayer: id === targetNationId, defeated: false };
  }

  const territories: GameState['territories'] = {};
  for (const [id, t] of Object.entries(TERRITORIES)) {
    territories[id] = { ...t, garrisonIds: [...t.garrisonIds], hasActed: false };
  }

  const characters: GameState['characters'] = {};
  for (const [id, c] of Object.entries(CHARACTERS)) {
    characters[id] = { ...c };
  }

  const relations: GameState['relations'] = {};
  return { nations, territories, characters, relations, winnerId: null, month: 1 };
}

// resolveAutoBattle / decideAINationAction が期待する GameState の最小互換型
type MinimalGameState = Pick<GameState, 'nations' | 'territories' | 'characters' | 'relations'>;

function toGS(s: SimState): MinimalGameState {
  return s as unknown as MinimalGameState;
}

function computeWinner(nations: GameState['nations']): string | null {
  const alive = Object.values(nations).filter((n) => !n.defeated);
  if (alive.length === 1) return alive[0].id;
  return null;
}

function applyInvasion(state: SimState, fromId: string, toId: string): void {
  const gsFull = state as unknown as GameState;
  const result = resolveAutoBattle(gsFull, fromId, toId);
  const from = state.territories[fromId];
  const to = state.territories[toId];
  const attackerNationId = from.ownerId;
  const defenderNationId = to.ownerId;

  if (result.winnerSide === 'attacker') {
    const surviving = result.survivingAttackerIds;
    const survivingSet = new Set(surviving);
    const moveCount = Math.max(1, Math.ceil(surviving.length * 0.75)); // 75%前進で連鎖侵攻を維持
    const movingIds = surviving.slice(0, moveCount);
    const stayingIds = surviving.slice(moveCount);

    // 戦死した攻撃側: HP=0 かつガリソンから除去（advanceMonth が本拠地帰還を処理）
    from.garrisonIds.forEach((id) => {
      if (!survivingSet.has(id) && state.characters[id]) {
        state.characters[id] = { ...state.characters[id], hp: 0 };
      }
    });
    // 防衛側: HP=0 かつガリソンから除去（即時本拠地帰還させない）
    to.garrisonIds.forEach((id) => {
      if (state.characters[id]) {
        state.characters[id] = { ...state.characters[id], hp: 0 };
      }
    });

    // ガリソンには生存者のみ配置（死亡キャラは除去）
    state.territories[fromId] = { ...from, garrisonIds: stayingIds, hasActed: true };
    state.territories[toId] = { ...to, ownerId: attackerNationId, garrisonIds: movingIds, hasActed: true };

    // 敗北判定: 首都陥落 OR 残領地3以下
    const capitalCaptured = state.nations[defenderNationId].capitalTerritoryId === toId;
    const remainingTerr = Object.values(state.territories).filter((t) => t.ownerId === defenderNationId).length;
    if (capitalCaptured || remainingTerr <= 3) {
      state.nations[defenderNationId] = { ...state.nations[defenderNationId], defeated: true };
    }
  } else {
    // 防衛側勝利: 攻撃側全員 HP=0 かつガリソンから除去
    from.garrisonIds.forEach((id) => {
      if (state.characters[id]) {
        state.characters[id] = { ...state.characters[id], hp: 0 };
      }
    });
    // 攻撃側領地は空になる（次ターンは守備なし→占領されやすくなる）
    state.territories[fromId] = { ...from, garrisonIds: [], hasActed: true };
    if (Object.values(state.territories).filter((t) => t.ownerId === attackerNationId).length === 0) {
      state.nations[attackerNationId] = { ...state.nations[attackerNationId], defeated: true };
    }
  }

  state.winnerId = computeWinner(state.nations);
}

function runNationTurn(state: SimState, nationId: string): void {
  if (state.winnerId) return;
  const nation = state.nations[nationId];
  if (!nation || nation.defeated) return;

  // 兵力移動
  const transfers = decideAITransfers(nationId, toGS(state) as GameState);
  for (const tr of transfers) {
    const from = state.territories[tr.fromId];
    const to = state.territories[tr.toId];
    if (!from || !to) continue;
    state.territories[tr.fromId] = {
      ...from,
      garrisonIds: from.garrisonIds.filter((id) => !tr.charIds.includes(id)),
      hasActed: true,
    };
    state.territories[tr.toId] = {
      ...to,
      garrisonIds: [...to.garrisonIds, ...tr.charIds],
    };
  }

  // 侵攻（30%確率で2回目）
  for (let i = 0; i < 2; i++) {
    if (i === 1 && Math.random() > 0.4) break;
    const action = decideAINationAction(nationId, toGS(state) as GameState);
    if (action.type !== 'invade') break;
    applyInvasion(state, action.fromId, action.toId);
    if (state.winnerId) return;
  }
}

function advanceMonth(state: SimState): void {
  // hasActed リセット
  for (const id of Object.keys(state.territories)) {
    state.territories[id] = { ...state.territories[id], hasActed: false };
  }

  // 収入
  for (const t of Object.values(state.territories)) {
    const n = state.nations[t.ownerId];
    if (n && !n.defeated) {
      state.nations[t.ownerId] = { ...n, gold: n.gold + t.income };
    }
  }

  // HP 回復
  const garrisonedSet = new Set<string>();
  Object.values(state.territories).forEach((t) => t.garrisonIds.forEach((id) => garrisonedSet.add(id)));
  for (const [id, ch] of Object.entries(state.characters)) {
    if (ch.hp < ch.maxHp) {
      const recovered = Math.min(ch.maxHp, ch.hp + Math.ceil(ch.maxHp * 0.25));
      const wasZero = ch.hp <= 0;
      state.characters[id] = { ...ch, hp: recovered };

      if (wasZero && recovered > 0 && !garrisonedSet.has(id)) {
        const ownerNation = Object.values(state.nations).find((n) => n.characterIds.includes(id));
        if (ownerNation) {
          const capId = ownerNation.capitalTerritoryId;
          const cap = state.territories[capId];
          if (cap && cap.ownerId === ownerNation.id && !cap.garrisonIds.includes(id)) {
            state.territories[capId] = { ...cap, garrisonIds: [...cap.garrisonIds, id] };
            garrisonedSet.add(id);
          }
        }
      }
    }
  }

  state.month++;
}

function runSimulation(targetNationId: string, maxMonths = 60): SimRunResult {
  const state = buildSimState(targetNationId);

  for (let m = 0; m < maxMonths; m++) {
    if (state.winnerId) break;

    // 毎ターン国の行動順をシャッフル（同一順序による決定論的結果を防ぐ）
    const nationIds = Object.keys(state.nations).sort(() => Math.random() - 0.5);
    for (const nid of nationIds) {
      if (state.winnerId) break;
      runNationTurn(state, nid);
    }

    if (!state.winnerId) advanceMonth(state);
  }

  const winnerId = state.winnerId;
  const winner = winnerId ? state.nations[winnerId] : null;
  const finalTerritories: Record<string, number> = {};
  const finalGold: Record<string, number> = {};
  for (const n of Object.values(state.nations)) {
    finalTerritories[n.id] = Object.values(state.territories).filter((t) => t.ownerId === n.id).length;
    finalGold[n.id] = n.gold;
  }

  return {
    winnerId,
    winnerName: winner?.name ?? '引き分け',
    winnerFaction: winner?.faction ?? '—',
    months: state.month,
    targetWon: winnerId === targetNationId,
    finalTerritories,
    finalGold,
  };
}

// ── 改善提案生成 ──────────────────────────────────────

function generateSuggestions(stats: Omit<SimStats, 'suggestions'>, targetNationId: string): string[] {
  const suggestions: string[] = [];
  const sorted = [...stats.nations].sort((a, b) => b.winRate - a.winRate);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];
  const target = stats.nations.find((n) => n.id === targetNationId);

  if (!target) return suggestions;

  // 目標国の勝率
  if (target.winRate < 0.1) {
    suggestions.push(`⚠️ ${target.name}の勝率が${(target.winRate * 100).toFixed(0)}%と非常に低いです。初期配置・兵力・収入の見直しを推奨します。`);
  } else if (target.winRate < 0.2) {
    suggestions.push(`📉 ${target.name}の勝率(${(target.winRate * 100).toFixed(0)}%)が低めです。隣接国との力関係を再考してください。`);
  } else if (target.winRate > 0.4) {
    suggestions.push(`📈 ${target.name}の勝率が${(target.winRate * 100).toFixed(0)}%と高めです。初期配置が有利すぎる可能性があります。`);
  }

  // 支配的な勢力
  if (top.winRate > 0.5) {
    suggestions.push(`🏆 ${top.name}(${top.faction})が勝率${(top.winRate * 100).toFixed(0)}%と突出しています。AI戦略「${top.faction}」が強すぎる可能性があります。`);
  }

  // 勝てない勢力
  if (bottom.winRate === 0) {
    suggestions.push(`💀 ${bottom.name}(${bottom.faction})が${stats.runs}回中一度も勝てていません。初期兵力・位置またはAI戦略の見直しが必要です。`);
  } else if (bottom.winRate < 0.05) {
    suggestions.push(`⚠️ ${bottom.name}(${bottom.faction})の勝率が極めて低いです(${(bottom.winRate * 100).toFixed(0)}%)。バランス調整を検討してください。`);
  }

  // ゲーム長
  if (stats.avgMonths < 15) {
    suggestions.push(`⚡ 平均${stats.avgMonths.toFixed(1)}ヶ月と短すぎます。初期国境隣接数が多すぎるか、兵力差が大きい可能性があります。`);
  } else if (stats.avgMonths > 60) {
    suggestions.push(`🐢 平均${stats.avgMonths.toFixed(1)}ヶ月と長すぎます。守備型AIの閾値を下げるか、収入バランスを調整してください。`);
  }

  // 勢力格差
  const winRates = stats.nations.map((n) => n.winRate);
  const maxRate = Math.max(...winRates);
  const minRate = Math.min(...winRates);
  if (maxRate - minRate > 0.4) {
    suggestions.push(`📊 勝率の格差(最高${(maxRate * 100).toFixed(0)}% vs 最低${(minRate * 100).toFixed(0)}%)が大きいです。国家間の初期バランスを均等化してください。`);
  }

  // 領地集中
  const avgTerr = Object.values(stats.nations).reduce((s, n) => s + n.avgFinalTerritories, 0) / stats.nations.length;
  const maxTerr = Math.max(...stats.nations.map((n) => n.avgFinalTerritories));
  if (maxTerr > avgTerr * 2.5) {
    const dominantNation = stats.nations.find((n) => n.avgFinalTerritories === maxTerr);
    suggestions.push(`🗺️ ${dominantNation?.name}が終盤に領地を独占する傾向があります。包囲されやすい配置の見直しを検討してください。`);
  }

  if (suggestions.length === 0) {
    suggestions.push('✅ バランスは概ね良好です。各国の勝率・ゲーム長に大きな偏りは見られません。');
  }

  return suggestions;
}

// ── 公開 API ──────────────────────────────────────────

export async function runBatchSimulation(
  targetNationId: string,
  runs: number,
  onProgress: (done: number, total: number) => void,
): Promise<SimStats> {
  const results: SimRunResult[] = [];
  const BATCH = 10;

  for (let i = 0; i < runs; i += BATCH) {
    const batchEnd = Math.min(i + BATCH, runs);
    for (let j = i; j < batchEnd; j++) {
      results.push(runSimulation(targetNationId));
    }
    onProgress(batchEnd, runs);
    // UIスレッドに制御を返す
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }

  // 集計
  const nationIds = Object.keys(NATIONS);
  const nationStats: NationStats[] = nationIds.map((id) => {
    const n = NATIONS[id];
    const wins = results.filter((r) => r.winnerId === id).length;
    const terrSum = results.reduce((s, r) => s + (r.finalTerritories[id] ?? 0), 0);
    const goldSum = results.reduce((s, r) => s + (r.finalGold[id] ?? 0), 0);
    return {
      id,
      name: n.name,
      faction: n.faction,
      wins,
      winRate: wins / runs,
      avgFinalTerritories: terrSum / runs,
      avgFinalGold: goldSum / runs,
    };
  });

  const targetNation = NATIONS[targetNationId];
  const targetWins = results.filter((r) => r.winnerId === targetNationId).length;
  const monthsArr = results.map((r) => r.months);
  const avgMonths = monthsArr.reduce((s, m) => s + m, 0) / runs;

  const baseStats = {
    runs,
    targetNationId,
    targetNationName: targetNation?.name ?? targetNationId,
    targetWinRate: targetWins / runs,
    avgMonths,
    minMonths: Math.min(...monthsArr),
    maxMonths: Math.max(...monthsArr),
    nations: nationStats,
    rawResults: results,
  };

  return {
    ...baseStats,
    suggestions: generateSuggestions(baseStats, targetNationId),
  };
}

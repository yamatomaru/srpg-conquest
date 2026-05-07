import { create } from 'zustand';
import type { BattleState, GameState, Side, UISelection } from './types';
import { NATIONS } from '../data/nations';
import { TERRITORIES } from '../data/territories';
import { CHARACTERS } from '../data/characters';
import { applyAttackerWins, applyDefenderWins } from './battle';

const playerNation = Object.values(NATIONS).find((n) => n.isPlayer);
if (!playerNation) {
  throw new Error('プレイヤー国が定義されていません（nations.ts を確認）');
}

const INITIAL_UI: UISelection = {
  selectedTerritoryId: null,
  invasionMode: null,
  gameOverShown: false,
  log: [],
};

const getInitialState = (): GameState => ({
  phase: 'strategic',
  month: 1,
  currentNationId: playerNation!.id,
  nations: { ...NATIONS },
  territories: { ...TERRITORIES },
  characters: { ...CHARACTERS },
  battle: null,
  winnerId: null,
  ui: { ...INITIAL_UI },
});

interface GameActions {
  reset: () => void;
  // 戦略マップ操作
  selectTerritory: (id: string | null) => void;
  startInvasion: (fromId: string) => void;
  cancelInvasion: () => void;
  executeInvasion: (fromId: string, toId: string) => void;
  endPlayerTurn: () => void;
  // 戦闘フェーズ
  endBattle: (winnerSide: Side) => void;
  // 戦術マップ操作（Step 3〜5 で実装）
  selectUnit: (unitId: string | null) => void;
  moveUnit: (unitId: string, to: { x: number; y: number }) => void;
  endTacticalTurn: () => void;
}

/** 勝者 ID を計算する純粋関数。 */
function computeWinner(
  nations: GameState['nations'],
  currentWinnerId: string | null,
): string | null {
  if (currentWinnerId !== null) return currentWinnerId;
  const player = Object.values(nations).find((n) => n.isPlayer)!;
  if (player.defeated) {
    return Object.values(nations).find((n) => !n.isPlayer && !n.defeated)?.id ?? null;
  }
  if (Object.values(nations).every((n) => n.isPlayer || n.defeated)) {
    return player.id;
  }
  return null;
}

/** 戦闘解決して戦略マップに戻る際の状態差分を返す。 */
function resolveBattle(
  state: GameState,
  winnerSide: Side,
): Partial<GameState> {
  const { fromTerritoryId, territoryId, attackerNationId } = state.battle!;
  const result =
    winnerSide === 'attacker'
      ? applyAttackerWins(state, fromTerritoryId, territoryId)
      : applyDefenderWins(state, fromTerritoryId, territoryId);

  const winnerId = computeWinner(result.nations, state.winnerId);
  const toName = state.territories[territoryId].name;
  const attackerName = state.nations[attackerNationId].name;
  const entry =
    winnerSide === 'attacker'
      ? `★ ${attackerName}が「${toName}」を占領`
      : `✕ ${attackerName}の「${toName}」攻略失敗`;

  return {
    ...result,
    phase: 'strategic',
    battle: null,
    winnerId,
    ui: {
      ...state.ui,
      invasionMode: null,
      gameOverShown: winnerId !== null,
      log: [entry, ...state.ui.log].slice(0, 5),
    },
  };
}

export const useGameStore = create<GameState & GameActions>((set) => ({
  ...getInitialState(),

  reset: () => set(getInitialState()),

  // ── 戦略マップ操作 ────────────────────────────────

  selectTerritory: (id) =>
    set((state) => ({
      ui: { ...state.ui, selectedTerritoryId: id, invasionMode: null },
    })),

  startInvasion: (fromId) =>
    set((state) => ({
      ui: { ...state.ui, invasionMode: { fromTerritoryId: fromId } },
    })),

  cancelInvasion: () =>
    set((state) => ({
      ui: { ...state.ui, invasionMode: null },
    })),

  // Sprint 3 〜: 戦術マップへ遷移（Sprint 2 のダミー戦闘から差し替え）
  executeInvasion: (fromId, toId) =>
    set((state) => {
      const from = state.territories[fromId];
      const to = state.territories[toId];
      const attackerName = state.nations[from.ownerId].name;
      const defenderName = state.nations[to.ownerId].name;

      const battle: BattleState = {
        attackerNationId: from.ownerId,
        defenderNationId: to.ownerId,
        fromTerritoryId: fromId,
        territoryId: toId,
        map: { width: 8, height: 8 },
        units: [], // Step 2 で placement.ts から生成
        currentSide: 'attacker',
        turnCount: 0,
        selectedUnitId: null,
        reachableCells: [],
        maxTurns: 30,
      };

      const entry = `⚔ ${attackerName}が${defenderName}の「${to.name}」に侵攻`;

      return {
        phase: 'tactical',
        battle,
        ui: {
          ...state.ui,
          invasionMode: null,
          selectedTerritoryId: null,
          log: [entry, ...state.ui.log].slice(0, 5),
        },
      };
    }),

  endPlayerTurn: () =>
    set((state) => {
      if (state.winnerId !== null) return state;

      // AI ターン（Sprint 5 まではパス）

      const newTerritories = Object.fromEntries(
        Object.entries(state.territories).map(([id, t]) => [id, { ...t, hasActed: false }]),
      );

      const incomeByNation: Record<string, number> = {};
      Object.values(newTerritories).forEach((t) => {
        incomeByNation[t.ownerId] = (incomeByNation[t.ownerId] ?? 0) + t.income;
      });
      const newNations = Object.fromEntries(
        Object.entries(state.nations).map(([id, n]) => [
          id,
          { ...n, gold: n.gold + (incomeByNation[id] ?? 0) },
        ]),
      );

      const player = Object.values(newNations).find((n) => n.isPlayer)!;
      const winnerId = computeWinner(newNations, null);
      const income = incomeByNation[player.id] ?? 0;
      const monthEntry = `── 月${state.month + 1}開始 / ${player.name}: +¥${income}収入 ──`;

      return {
        territories: newTerritories,
        nations: newNations,
        month: state.month + 1,
        currentNationId: player.id,
        winnerId,
        ui: {
          ...state.ui,
          invasionMode: null,
          gameOverShown: winnerId !== null,
          log: [monthEntry, ...state.ui.log].slice(0, 5),
        },
      };
    }),

  // ── 戦闘フェーズ ────────────────────────────────

  endBattle: (winnerSide) =>
    set((state) => {
      if (!state.battle) return state;
      return resolveBattle(state, winnerSide);
    }),

  // Step 3 で実装
  selectUnit: (_unitId) => set((state) => state),

  // Step 4 で実装
  moveUnit: (_unitId, _to) => set((state) => state),

  // Step 5 で実装
  endTacticalTurn: () => set((state) => state),
}));

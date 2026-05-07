import { create } from 'zustand';
import type { GameState, UISelection } from './types';
import { NATIONS } from '../data/nations';
import { TERRITORIES } from '../data/territories';
import { CHARACTERS } from '../data/characters';
import { executeDummyBattle } from './battle';

const playerNation = Object.values(NATIONS).find((n) => n.isPlayer);
if (!playerNation) {
  throw new Error('プレイヤー国が定義されていません（nations.ts を確認）');
}

const INITIAL_UI: UISelection = {
  selectedTerritoryId: null,
  invasionMode: null,
  gameOverShown: false,
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
  selectTerritory: (id: string | null) => void;
  startInvasion: (fromId: string) => void;
  cancelInvasion: () => void;
  executeInvasion: (fromId: string, toId: string) => void;
  endPlayerTurn: () => void;
}

export const useGameStore = create<GameState & GameActions>((set) => ({
  ...getInitialState(),

  reset: () => set(getInitialState()),

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

  // Sprint 4 で本物の戦闘ロジック（HP/ATK/DEF）に差し替える。
  executeInvasion: (fromId, toId) =>
    set((state) => {
      const result = executeDummyBattle(state, fromId, toId);
      return { ...result, ui: { ...state.ui, invasionMode: null } };
    }),

  endPlayerTurn: () =>
    set((state) => {
      if (state.winnerId !== null) return state;

      // AI ターン（Sprint 2: 全国パス）

      // 全領地の hasActed をリセット
      const newTerritories = Object.fromEntries(
        Object.entries(state.territories).map(([id, t]) => [
          id,
          { ...t, hasActed: false },
        ]),
      );

      // 月収入を加算（所有領地の income 合計）
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

      // 勝敗判定
      const player = Object.values(newNations).find((n) => n.isPlayer)!;
      let winnerId: string | null = null;
      if (player.defeated) {
        winnerId =
          Object.values(newNations).find((n) => !n.isPlayer && !n.defeated)?.id ??
          null;
      } else if (Object.values(newNations).every((n) => n.isPlayer || n.defeated)) {
        winnerId = player.id;
      }

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
        },
      };
    }),
}));

import { create } from 'zustand';
import type { GameState } from './types';
import { NATIONS } from '../data/nations';
import { TERRITORIES } from '../data/territories';
import { CHARACTERS } from '../data/characters';

// プレイヤー国を最初の行動者に設定
const playerNation = Object.values(NATIONS).find((n) => n.isPlayer);
if (!playerNation) {
  throw new Error('プレイヤー国が定義されていません（nations.ts を確認）');
}

const initialState: GameState = {
  phase: 'strategic',
  month: 1,
  currentNationId: playerNation.id,
  // 不変データを浅くコピー（リセット時に元データを保つため）
  nations: { ...NATIONS },
  territories: { ...TERRITORIES },
  characters: { ...CHARACTERS },
  battle: null,
  winnerId: null,
};

interface GameActions {
  reset: () => void;
  // Sprint 2 以降で実装:
  // selectTerritory(id), invadeTerritory(from, to), endPlayerTurn(), ...
}

export const useGameStore = create<GameState & GameActions>((set) => ({
  ...initialState,
  reset: () => set(initialState),
}));

import { create } from 'zustand';
import type { BattleLogEntry, BattleState, GameState, Side, UISelection } from './types';
import { NATIONS } from '../data/nations';
import { TERRITORIES } from '../data/territories';
import { CHARACTERS } from '../data/characters';
import { placeUnits } from './tactical/placement';
import { calcReachable } from './tactical/movement';
import { calculateDamage, canAttack, getAttackTargets } from './tactical/attack';

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
  // 戦術マップ操作
  selectUnit: (unitId: string | null) => void;
  moveUnit: (unitId: string, to: { x: number; y: number }) => void;
  attackUnit: (attackerId: string, targetId: string) => void;
  endUnitTurn: (unitId: string) => void;
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

/**
 * 戦闘解決して戦略マップに戻る。
 * battle.units の生存者を使って garrisonIds を再計算する（Sprint 4+）。
 */
function resolveBattle(state: GameState, winnerSide: Side): Partial<GameState> {
  const battle = state.battle!;
  const { fromTerritoryId, territoryId, attackerNationId } = battle;

  const survivingAttackerIds = battle.units
    .filter((u) => u.side === 'attacker')
    .map((u) => u.characterId);

  const from = state.territories[fromTerritoryId];
  const to = state.territories[territoryId];
  const defenderNationId = to.ownerId;

  const newNations = { ...state.nations };
  let newTerritories: GameState['territories'];

  if (winnerSide === 'attacker') {
    const moveCount = Math.ceil(survivingAttackerIds.length / 2);
    const movingIds = survivingAttackerIds.slice(0, moveCount);
    const stayingIds = survivingAttackerIds.slice(moveCount);
    newTerritories = {
      ...state.territories,
      [fromTerritoryId]: { ...from, garrisonIds: stayingIds, hasActed: true },
      [territoryId]: { ...to, ownerId: attackerNationId, garrisonIds: movingIds, hasActed: false },
    };
    // 防衛側が全領地を失ったら defeated
    const defenderTerritoryCount = Object.values(newTerritories).filter(
      (t) => t.ownerId === defenderNationId,
    ).length;
    if (defenderTerritoryCount === 0) {
      newNations[defenderNationId] = { ...newNations[defenderNationId], defeated: true };
    }
  } else {
    // 防衛側勝利: 生存している攻撃側は元領地に帰還
    newTerritories = {
      ...state.territories,
      [fromTerritoryId]: { ...from, garrisonIds: survivingAttackerIds, hasActed: true },
    };
    if (newNations[attackerNationId].characterIds.length === 0) {
      newNations[attackerNationId] = { ...newNations[attackerNationId], defeated: true };
    }
  }

  const winnerId = computeWinner(newNations, state.winnerId);
  const toName = state.territories[territoryId].name;
  const attackerName = state.nations[attackerNationId].name;
  const entry =
    winnerSide === 'attacker'
      ? `★ ${attackerName}が「${toName}」を占領`
      : `✕ ${attackerName}の「${toName}」攻略失敗`;

  return {
    nations: newNations,
    territories: newTerritories,
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
        units: placeUnits(from.garrisonIds, to.garrisonIds, state.characters),
        currentSide: 'attacker',
        turnCount: 0,
        selectedUnitId: null,
        reachableCells: [],
        attackTargets: [],
        recentLog: [],
        pendingEnd: null,
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

  selectUnit: (unitId) =>
    set((state) => {
      if (!state.battle) return state;
      if (unitId === null) {
        return {
          battle: {
            ...state.battle,
            selectedUnitId: null,
            reachableCells: [],
            attackTargets: [],
          },
        };
      }
      const unit = state.battle.units.find((u) => u.characterId === unitId);
      if (!unit) return state;
      if (unit.side !== state.battle.currentSide) return state;
      if (unit.hasActed) return state;

      const ch = state.characters[unitId];
      const reachable = unit.hasMoved
        ? []
        : calcReachable(unit, ch.mov, state.battle.units, state.battle.map.width, state.battle.map.height);
      const attackTargets = getAttackTargets(unit, ch, state.battle.units);

      return {
        battle: { ...state.battle, selectedUnitId: unitId, reachableCells: reachable, attackTargets },
      };
    }),

  moveUnit: (unitId, to) =>
    set((state) => {
      if (!state.battle) return state;
      const isReachable = state.battle.reachableCells.some(
        (c) => c.x === to.x && c.y === to.y,
      );
      if (!isReachable) return state;
      const movedUnit = {
        ...state.battle.units.find((u) => u.characterId === unitId)!,
        position: to,
        hasMoved: true,
      };
      const newUnits = state.battle.units.map((u) =>
        u.characterId === unitId ? movedUnit : u,
      );
      const ch = state.characters[unitId];
      const attackTargets = getAttackTargets(movedUnit, ch, newUnits);
      return {
        battle: {
          ...state.battle,
          units: newUnits,
          selectedUnitId: unitId,   // 攻撃のため選択維持
          reachableCells: [],        // 移動済みなのでクリア
          attackTargets,
        },
      };
    }),

  attackUnit: (attackerId, targetId) =>
    set((state) => {
      if (!state.battle) return state;
      const attacker = state.battle.units.find((u) => u.characterId === attackerId);
      const target = state.battle.units.find((u) => u.characterId === targetId);
      if (!attacker || !target) return state;

      const attackerChar = state.characters[attackerId];
      const defenderChar = state.characters[targetId];
      if (!canAttack(attacker, target, attackerChar)) return state;

      const damage = calculateDamage(attackerChar, defenderChar);
      const newHp = target.currentHp - damage;
      const defeated = newHp <= 0;

      // ユニット更新（撃破なら除外）
      const newUnits = state.battle.units
        .map((u) =>
          u.characterId === targetId
            ? { ...u, currentHp: newHp }
            : u.characterId === attackerId
            ? { ...u, hasActed: true }
            : u,
        )
        .filter((u) => u.characterId !== targetId || !defeated);

      // 撃破時は Nation.characterIds から除外
      const losingNationId =
        target.side === 'attacker'
          ? state.battle.attackerNationId
          : state.battle.defenderNationId;
      const newNations = defeated
        ? {
            ...state.nations,
            [losingNationId]: {
              ...state.nations[losingNationId],
              characterIds: state.nations[losingNationId].characterIds.filter(
                (id) => id !== targetId,
              ),
            },
          }
        : state.nations;

      // ログ
      const logEntry: BattleLogEntry = {
        attackerName: attackerChar.name,
        defenderName: defenderChar.name,
        damage,
        defeated,
        defenderPos: { ...target.position },
      };
      const newLog = [logEntry, ...state.battle.recentLog].slice(0, 5);

      // 戦闘終了判定（ポップアップ表示のため pendingEnd で遅延解決）
      const attackerUnits = newUnits.filter((u) => u.side === 'attacker');
      const defenderUnits = newUnits.filter((u) => u.side === 'defender');
      const pendingEnd: Side | null =
        defenderUnits.length === 0 ? 'attacker' :
        attackerUnits.length === 0 ? 'defender' : null;

      const newBattle = {
        ...state.battle,
        units: newUnits,
        selectedUnitId: null,
        reachableCells: [],
        attackTargets: [],
        recentLog: newLog,
        pendingEnd,
      };

      return { nations: newNations, battle: newBattle };
    }),

  endUnitTurn: (unitId) =>
    set((state) => {
      if (!state.battle) return state;
      const newUnits = state.battle.units.map((u) =>
        u.characterId === unitId ? { ...u, hasActed: true } : u,
      );
      return {
        battle: {
          ...state.battle,
          units: newUnits,
          selectedUnitId: null,
          reachableCells: [],
          attackTargets: [],
        },
      };
    }),

  endTacticalTurn: () =>
    set((state) => {
      if (!state.battle) return state;

      const nextSide: 'attacker' | 'defender' =
        state.battle.currentSide === 'attacker' ? 'defender' : 'attacker';
      const newTurnCount =
        state.battle.currentSide === 'defender'
          ? state.battle.turnCount + 1
          : state.battle.turnCount;

      if (newTurnCount >= state.battle.maxTurns) {
        return resolveBattle(state, 'defender');
      }

      // 防衛側 AI は即パス（Sprint 5 で実装）
      const afterAi =
        nextSide === 'defender'
          ? (() => {
              const resetUnits = state.battle!.units.map((u) =>
                u.side === 'attacker' ? { ...u, hasMoved: false, hasActed: false } : u,
              );
              return {
                ...state.battle!,
                currentSide: 'attacker' as const,
                turnCount: newTurnCount + 1,
                units: resetUnits,
                selectedUnitId: null,
                reachableCells: [],
                attackTargets: [],
              };
            })()
          : {
              ...state.battle,
              currentSide: nextSide,
              turnCount: newTurnCount,
              units: state.battle.units.map((u) =>
                u.side === nextSide ? { ...u, hasMoved: false, hasActed: false } : u,
              ),
              selectedUnitId: null,
              reachableCells: [],
              attackTargets: [],
            };

      if (afterAi.turnCount >= state.battle.maxTurns) {
        return resolveBattle({ ...state, battle: afterAi }, 'defender');
      }

      return { battle: afterAi };
    }),
}));

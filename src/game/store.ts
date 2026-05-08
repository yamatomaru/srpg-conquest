import { create } from 'zustand';
import type { BattleLogEntry, BattleState, CampaignProgress, CampaignScenario, Character, DiplomaticStatus, GameState, Side, UISelection } from './types';
import { NATIONS } from '../data/nations';
import { TERRITORIES } from '../data/territories';
import { CHARACTERS } from '../data/characters';
import { JOBS } from '../data/jobs';
import { CAMPAIGNS } from '../data/campaigns';
import { placeUnits } from './tactical/placement';
import { calcReachable } from './tactical/movement';
import { calculateDamage, canAttack, getAttackTargets } from './tactical/attack';
import { decideAIUnitAction } from './tactical/ai';
import { decideAINationAction, decideAITransfers } from './strategic/ai';
import { resolveAutoBattle } from './strategic/autoBattle';
import { generateTerrain } from './terrain';
import { generateRandomEvent } from '../data/events';
import { INITIAL_OBJECTIVES, checkObjectives } from '../data/objectives';
import { pickMercPool } from '../data/mercenaries';

const INITIAL_UI: UISelection = {
  selectedTerritoryId: null,
  invasionMode: null,
  invasionPending: null,
  transferMode: null,
  transferPending: null,
  gameOverShown: false,
  log: [],
  activePanel: 'none',
};

function buildRelations(nations: Record<string, { id: string }>, playerNationId: string): GameState['relations'] {
  return Object.fromEntries(
    Object.values(nations)
      .filter((n) => n.id !== playerNationId)
      .map((n) => [n.id, { status: 'neutral' as DiplomaticStatus, turnsLeft: 0 }]),
  );
}

// キャンペーンシナリオから戦略マップの初期状態を生成
function buildScenarioState(
  scenario: CampaignScenario,
  playerNationId: string,
  carryOver: CampaignProgress['carryOver'],
): Partial<GameState> {
  // キャラクターに引き継ぎボーナスを適用
  const newChars: Record<string, Character> = {};
  for (const [id, ch] of Object.entries(CHARACTERS)) {
    const co = carryOver[id];
    if (co) {
      const levelDiff = co.level - 1;
      newChars[id] = {
        ...ch,
        level: co.level,
        exp: co.exp,
        maxHp: ch.maxHp + levelDiff * 3,
        hp: ch.maxHp + levelDiff * 3,
        atk: ch.atk + levelDiff,
        def: ch.def + levelDiff,
        matk: ch.matk + levelDiff,
        mdef: ch.mdef + levelDiff,
      };
    } else {
      newChars[id] = { ...ch };
    }
  }

  // 領地の所有者を再配分：プレイヤー所有領地以外はデフォルト所有者（AIネイション）に戻す
  const newTerritories: GameState['territories'] = {};
  const playerTerSet = new Set(scenario.playerTerritoryIds);
  for (const [tid, t] of Object.entries(TERRITORIES)) {
    if (playerTerSet.has(tid)) {
      newTerritories[tid] = { ...t, ownerId: playerNationId, hasActed: false };
    } else {
      // デフォルト所有者（オリジナルのAI国家）に戻す（プレイヤー国家のデフォルト領地はAIの1つに渡す）
      const defaultOwner = TERRITORIES[tid].ownerId;
      const actualOwner = defaultOwner === playerNationId
        ? Object.keys(NATIONS).find((nid) => nid !== playerNationId) ?? defaultOwner
        : defaultOwner;
      newTerritories[tid] = { ...t, ownerId: actualOwner, hasActed: false };
    }
  }

  const newNations = Object.fromEntries(
    Object.entries(NATIONS).map(([k, n]) => [k, { ...n, isPlayer: k === playerNationId, defeated: false, gold: k === playerNationId ? scenario.playerGold : n.gold }])
  );

  const playerFaction = newNations[playerNationId].faction;

  return {
    phase: 'strategic' as const,
    month: 1,
    currentNationId: playerNationId,
    nations: newNations,
    territories: newTerritories,
    characters: newChars,
    battle: null,
    winnerId: null,
    isAIThinking: false,
    actedCharIds: [],
    relations: buildRelations(newNations as typeof NATIONS, playerNationId),
    objectives: [...INITIAL_OBJECTIVES],
    mercPool: pickMercPool(1, playerFaction),
    mercDurations: {},
    currentEvent: null,
    ui: { ...INITIAL_UI },
  };
}

const getInitialState = (): GameState => {
  // setup フェーズで開始; 国家未選択
  return {
    phase: 'setup',
    month: 1,
    currentNationId: '',
    nations: Object.fromEntries(
      Object.entries(NATIONS).map(([k, n]) => [k, { ...n, isPlayer: false }])
    ),
    territories: { ...TERRITORIES },
    characters: { ...CHARACTERS },
    battle: null,
    winnerId: null,
    isAIThinking: false,
    actedCharIds: [],
    relations: {},
    objectives: [...INITIAL_OBJECTIVES],
    mercPool: [],
    mercDurations: {},
    currentEvent: null,
    campaignProgress: null,
    campaignScenario: null,
    ui: { ...INITIAL_UI },
  };
};

interface GameActions {
  selectNation: (nationId: string) => void;
  openCampaignSelect: () => void;
  startCampaign: (campaignId: string, nationId: string) => void;
  loadScenario: (scenarioIndex: number) => void;
  completeCampaignScenario: (success: boolean) => void;
  openMapEditor: () => void;
  reset: () => void;
  saveGame: () => void;
  loadGame: () => void;
  selectTerritory: (id: string | null) => void;
  startInvasion: (fromId: string) => void;
  cancelInvasion: () => void;
  openInvasionPanel: (fromId: string, toId: string) => void;
  cancelInvasionPanel: () => void;
  executeInvasion: (fromId: string, toId: string, attackerIds: string[]) => void;
  startTransfer: (fromId: string) => void;
  cancelTransfer: () => void;
  openTransferPanel: (fromId: string, toId: string) => void;
  executeTransfer: (fromId: string, toId: string, charIds: string[]) => void;
  executeAIInvasion: (fromId: string, toId: string) => void;
  endPlayerTurn: () => void;
  endBattle: (winnerSide: Side) => void;
  selectUnit: (unitId: string | null) => void;
  moveUnit: (unitId: string, to: { x: number; y: number }) => void;
  attackUnit: (attackerId: string, targetId: string) => void;
  endUnitTurn: (unitId: string) => void;
  useSkill: (unitId: string) => void;
  executeSkill: (unitId: string, targetId: string) => void;
  cancelSkill: () => void;
  // 外交
  proposeAlliance: (nationId: string) => void;
  declareWar: (nationId: string) => void;
  // 傭兵
  hireMercenary: (mercId: string) => void;
  // イベント
  dismissEvent: () => void;
  // パネル
  togglePanel: (panel: GameState['ui']['activePanel']) => void;
  runTacticalAI: () => void;
  _runStrategicAI: (nationIds: string[], idx: number) => void;
}

function computeWinner(nations: GameState['nations'], currentWinnerId: string | null): string | null {
  if (currentWinnerId !== null) return currentWinnerId;
  const player = Object.values(nations).find((n) => n.isPlayer)!;
  if (player.defeated) return Object.values(nations).find((n) => !n.isPlayer && !n.defeated)?.id ?? null;
  if (Object.values(nations).every((n) => n.isPlayer || n.defeated)) return player.id;
  return null;
}

/** イニシアチブ順を MOV 降順で生成 */
function buildInitiativeOrder(
  attackerIds: string[],
  defenderIds: string[],
  chars: GameState['characters'],
): string[] {
  return [...attackerIds, ...defenderIds].sort((a, b) => chars[b].mov - chars[a].mov);
}

/** イニシアチブを1つ進める（ラウンド繰越・maxTurns判定込み） */
function doAdvanceInitiative(battle: BattleState): BattleState {
  const aliveIds = new Set(battle.units.map((u) => u.characterId));
  let idx = battle.initiativeIndex + 1;

  while (idx < battle.initiativeOrder.length && !aliveIds.has(battle.initiativeOrder[idx])) idx++;

  if (idx < battle.initiativeOrder.length) {
    return { ...battle, initiativeIndex: idx, selectedUnitId: null, reachableCells: [], attackTargets: [] };
  }

  // ラウンド終了
  const newTurnCount = battle.turnCount + 1;
  if (newTurnCount >= battle.maxTurns) {
    return { ...battle, initiativeIndex: 0, turnCount: newTurnCount, pendingEnd: 'defender' };
  }

  const resetUnits = battle.units.map((u) => ({ ...u, hasMoved: false, hasActed: false, usedSkill: false }));
  idx = 0;
  const newAliveIds = new Set(resetUnits.map((u) => u.characterId));
  while (idx < battle.initiativeOrder.length && !newAliveIds.has(battle.initiativeOrder[idx])) idx++;

  return {
    ...battle,
    initiativeIndex: idx,
    turnCount: newTurnCount,
    units: resetUnits,
    selectedUnitId: null,
    reachableCells: [],
    attackTargets: [],
  };
}

function resolveBattle(state: GameState, winnerSide: Side): Partial<GameState> {
  const battle = state.battle!;
  const { fromTerritoryId, territoryId, attackerNationId } = battle;

  const from = state.territories[fromTerritoryId];
  const to = state.territories[territoryId];
  const defenderNationId = to.ownerId;

  const survivingAttackerIds = battle.units.filter((u) => u.side === 'attacker').map((u) => u.characterId);
  const survivingDefenderIds = battle.units.filter((u) => u.side === 'defender').map((u) => u.characterId);

  // 戦闘に参加した元のID群から生存者を引いた = 戦死者（hp=0 が attackUnit で設定済み）
  const defeatedAttackerIds = battle.originalAttackerIds.filter((id) => !survivingAttackerIds.includes(id));
  const defeatedDefenderIds = battle.originalDefenderIds.filter((id) => !survivingDefenderIds.includes(id));
  // 戦闘に出なかった from 駐留キャラ
  const nonBattleIds = from.garrisonIds.filter((id) => !battle.originalAttackerIds.includes(id));

  // 敗北側の生存ユニット（降参含む）は HP を 0 にする
  const newCharacters = { ...state.characters };
  if (winnerSide === 'defender') {
    survivingAttackerIds.forEach((id) => {
      newCharacters[id] = { ...newCharacters[id], hp: 0 };
    });
  } else {
    survivingDefenderIds.forEach((id) => {
      newCharacters[id] = { ...newCharacters[id], hp: 0 };
    });
  }

  const newNations = { ...state.nations };
  let newTerritories: GameState['territories'] = { ...state.territories };

  if (winnerSide === 'attacker') {
    // 戦闘参加した生存者は全員が占領地に移動
    const movingIds = survivingAttackerIds;

    // from: 戦死攻撃者(hp=0) + 非参加駐留者のみ残留
    newTerritories[fromTerritoryId] = {
      ...from,
      garrisonIds: [...defeatedAttackerIds, ...nonBattleIds],
      hasActed: true,
    };
    // to: 新占領地（生存者全員移動）
    newTerritories[territoryId] = {
      ...to, ownerId: attackerNationId, garrisonIds: movingIds, hasActed: true,
    };

    // 防衛側キャラ（生存・戦死）は本拠地へ撤退
    const allDefenderIds = [...survivingDefenderIds, ...defeatedDefenderIds];
    if (allDefenderIds.length > 0) {
      const defCapId = state.nations[defenderNationId].capitalTerritoryId;
      const defCap = newTerritories[defCapId];
      if (defCap && defCap.ownerId === defenderNationId) {
        const merged = [...defCap.garrisonIds];
        allDefenderIds.forEach((id) => { if (!merged.includes(id)) merged.push(id); });
        newTerritories[defCapId] = { ...defCap, garrisonIds: merged };
      }
      // 本拠地も陥落済みなら浮遊状態 → endPlayerTurn で本拠地帰還
    }

    // 本拠地陥落 or 全領地消失 → 敗北
    const capitalCaptured = state.nations[defenderNationId].capitalTerritoryId === territoryId;
    const noTerr = Object.values(newTerritories).filter((t) => t.ownerId === defenderNationId).length === 0;
    if (capitalCaptured || noTerr) {
      newNations[defenderNationId] = { ...newNations[defenderNationId], defeated: true };
    }
  } else {
    // 防衛勝利: 戦闘参加した攻撃者は全員HP=0で本拠地へ帰還
    const atkCapId = state.nations[attackerNationId].capitalTerritoryId;
    const atkCap = newTerritories[atkCapId];
    const allBattleAttackerIds = [...survivingAttackerIds, ...defeatedAttackerIds];

    // from: 非参加の駐留兵のみ残留
    newTerritories[fromTerritoryId] = {
      ...from,
      garrisonIds: nonBattleIds,
      hasActed: true,
    };

    // 攻撃側の本拠地へ帰還（本拠地が自国保有のとき）
    if (atkCap && atkCap.ownerId === attackerNationId) {
      const merged = [...atkCap.garrisonIds];
      allBattleAttackerIds.forEach((id) => { if (!merged.includes(id)) merged.push(id); });
      newTerritories[atkCapId] = { ...atkCap, garrisonIds: merged };
    }

    // 防衛側は to に残る（戦死者hp=0含む）
    const toAlreadyDead = to.garrisonIds.filter((id) => !battle.originalDefenderIds.includes(id));
    newTerritories[territoryId] = {
      ...to,
      garrisonIds: [...survivingDefenderIds, ...defeatedDefenderIds, ...toAlreadyDead],
    };

    if (Object.values(newTerritories).filter((t) => t.ownerId === attackerNationId).length === 0) {
      newNations[attackerNationId] = { ...newNations[attackerNationId], defeated: true };
    }
  }

  const winnerId = computeWinner(newNations, state.winnerId);
  const toName = state.territories[territoryId].name;
  const attackerName = state.nations[attackerNationId].name;
  const entry = winnerSide === 'attacker'
    ? `★ ${attackerName}が「${toName}」を占領`
    : `✕ ${attackerName}の「${toName}」攻略失敗`;

  return {
    characters: newCharacters,
    nations: newNations,
    territories: newTerritories,
    phase: 'strategic',
    battle: null,
    isAIThinking: false,
    winnerId,
    ui: {
      ...state.ui,
      invasionMode: null,
      invasionPending: null,
      gameOverShown: winnerId !== null,
      log: [entry, ...state.ui.log].slice(0, 10),
    },
  };
}

function applyStrategicBattleResult(
  state: GameState,
  fromId: string,
  toId: string,
  winnerSide: 'attacker' | 'defender',
  survivingAttackerIds: string[],
): Partial<GameState> {
  const from = state.territories[fromId];
  const to = state.territories[toId];
  const attackerNationId = from.ownerId;
  const defenderNationId = to.ownerId;

  const newNations = { ...state.nations };
  let newTerritories: GameState['territories'] = { ...state.territories };

  // 非生存の from キャラは from に残す（自動戦闘では個別 hp=0 を付けない）
  const nonSurvivingFromIds = from.garrisonIds.filter((id) => !survivingAttackerIds.includes(id));

  if (winnerSide === 'attacker') {
    const moveCount = Math.ceil(survivingAttackerIds.length / 2);
    const movingIds = survivingAttackerIds.slice(0, moveCount);
    const stayingIds = survivingAttackerIds.slice(moveCount);

    newTerritories[fromId] = {
      ...from, garrisonIds: [...stayingIds, ...nonSurvivingFromIds], hasActed: true,
    };
    newTerritories[toId] = {
      ...to, ownerId: attackerNationId, garrisonIds: movingIds, hasActed: true,
    };

    // 防衛側キャラを本拠地へ撤退
    const defenderIds = to.garrisonIds;
    if (defenderIds.length > 0) {
      const defCapId = state.nations[defenderNationId].capitalTerritoryId;
      const defCap = newTerritories[defCapId];
      if (defCap && defCap.ownerId === defenderNationId) {
        const merged = [...defCap.garrisonIds];
        defenderIds.forEach((id) => { if (!merged.includes(id)) merged.push(id); });
        newTerritories[defCapId] = { ...defCap, garrisonIds: merged };
      }
    }

    // 本拠地陥落 or 全領地消失 → 敗北
    const capitalCaptured = state.nations[defenderNationId].capitalTerritoryId === toId;
    const noTerr = Object.values(newTerritories).filter((t) => t.ownerId === defenderNationId).length === 0;
    if (capitalCaptured || noTerr) {
      newNations[defenderNationId] = { ...newNations[defenderNationId], defeated: true };
    }
  } else {
    newTerritories[fromId] = {
      ...from, garrisonIds: from.garrisonIds, hasActed: true,
    };
    if (Object.values(newTerritories).filter((t) => t.ownerId === attackerNationId).length === 0) {
      newNations[attackerNationId] = { ...newNations[attackerNationId], defeated: true };
    }
  }

  const winnerId = computeWinner(newNations, state.winnerId);
  const attackerName = state.nations[attackerNationId].name;
  const entry = winnerSide === 'attacker'
    ? `★ ${attackerName}が「${to.name}」を占領`
    : `✕ ${attackerName}の「${to.name}」攻略失敗`;

  return {
    nations: newNations,
    territories: newTerritories,
    winnerId,
    ui: { ...state.ui, log: [entry, ...state.ui.log].slice(0, 10) },
  };
}

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  ...getInitialState(),

  selectNation: (nationId) =>
    set((state) => {
      const newNations = Object.fromEntries(
        Object.entries(state.nations).map(([k, n]) => [k, { ...n, isPlayer: k === nationId }])
      );
      const playerFaction = newNations[nationId].faction;
      return {
        phase: 'strategic' as const,
        currentNationId: nationId,
        nations: newNations,
        relations: buildRelations(newNations as typeof NATIONS, nationId),
        mercPool: pickMercPool(1, playerFaction),
      };
    }),

  openCampaignSelect: () => set({ phase: 'campaign_select' as const }),

  openMapEditor: () => set({ phase: 'map_editor' as const }),

  startCampaign: (campaignId, nationId) => {
    const campaign = CAMPAIGNS.find((c) => c.id === campaignId);
    if (!campaign || campaign.scenarios.length === 0) return;
    const scenario = campaign.scenarios[0];
    const progress: CampaignProgress = {
      campaignId,
      scenarioIndex: 0,
      playerNationId: nationId,
      carryOver: {},
    };
    set({
      campaignProgress: progress,
      campaignScenario: scenario,
      phase: 'campaign_briefing' as const,
    });
  },

  loadScenario: (scenarioIndex) =>
    set((state) => {
      if (!state.campaignProgress) return {};
      const campaign = CAMPAIGNS.find((c) => c.id === state.campaignProgress!.campaignId);
      if (!campaign || scenarioIndex >= campaign.scenarios.length) return {};
      const scenario = campaign.scenarios[scenarioIndex];
      const scenarioState = buildScenarioState(scenario, state.campaignProgress.playerNationId, state.campaignProgress.carryOver);
      const newProgress = { ...state.campaignProgress, scenarioIndex };
      return {
        ...scenarioState,
        campaignProgress: newProgress,
        campaignScenario: scenario,
      };
    }),

  completeCampaignScenario: (success) =>
    set((state) => {
      if (!state.campaignProgress) return {};

      if (!success) {
        // 失敗 → campaign_debrief で retry 可能
        return { phase: 'campaign_debrief' as const };
      }

      // 成功 → キャラクターのLv/EXPを引き継ぎ用に保存
      const newCarryOver: CampaignProgress['carryOver'] = { ...state.campaignProgress.carryOver };
      for (const [id, ch] of Object.entries(state.characters)) {
        if (ch.level > 1 || ch.exp > 0) {
          newCarryOver[id] = { level: ch.level, exp: ch.exp };
        }
      }

      const campaign = CAMPAIGNS.find((c) => c.id === state.campaignProgress!.campaignId);
      const nextIndex = state.campaignProgress.scenarioIndex + 1;
      const hasNext = campaign && nextIndex < campaign.scenarios.length;
      const nextScenario = hasNext ? campaign!.scenarios[nextIndex] : null;

      return {
        phase: 'campaign_debrief' as const,
        campaignProgress: {
          ...state.campaignProgress,
          carryOver: newCarryOver,
          scenarioIndex: nextIndex,
        },
        campaignScenario: nextScenario ?? state.campaignScenario,
      };
    }),

  reset: () => set(getInitialState()),

  saveGame: () => {
    const { phase, month, currentNationId, nations, territories, winnerId, ui } = get();
    const data = { phase, month, currentNationId, nations, territories, winnerId, ui: { ...ui, invasionMode: null, invasionPending: null, gameOverShown: false } };
    localStorage.setItem('srpg-conquest-save', JSON.stringify(data));
  },

  loadGame: () => {
    const raw = localStorage.getItem('srpg-conquest-save');
    if (!raw) return;
    try {
      const data = JSON.parse(raw) as Partial<GameState>;
      set({ ...data, characters: { ...CHARACTERS }, battle: null, isAIThinking: false });
    } catch { /* 壊れたセーブは無視 */ }
  },

  // ── 戦略マップ操作 ──────────────────────────────────

  selectTerritory: (id) =>
    set((state) => ({ ui: { ...state.ui, selectedTerritoryId: id, invasionMode: null } })),

  startInvasion: (fromId) =>
    set((state) => ({ ui: { ...state.ui, invasionMode: { fromTerritoryId: fromId } } })),

  cancelInvasion: () =>
    set((state) => ({ ui: { ...state.ui, invasionMode: null } })),

  openInvasionPanel: (fromId, toId) =>
    set((state) => ({
      ui: { ...state.ui, invasionMode: null, invasionPending: { fromTerritoryId: fromId, toTerritoryId: toId } },
    })),

  cancelInvasionPanel: () =>
    set((state) => ({ ui: { ...state.ui, invasionPending: null } })),

  startTransfer: (fromId) =>
    set((state) => ({ ui: { ...state.ui, invasionMode: null, transferMode: { fromTerritoryId: fromId } } })),

  cancelTransfer: () =>
    set((state) => ({ ui: { ...state.ui, transferMode: null, transferPending: null } })),

  openTransferPanel: (fromId, toId) =>
    set((state) => ({
      ui: { ...state.ui, transferMode: null, transferPending: { fromTerritoryId: fromId, toTerritoryId: toId } },
    })),

  executeTransfer: (fromId, toId, charIds) =>
    set((state) => {
      const from = state.territories[fromId];
      const to = state.territories[toId];
      const remaining = from.garrisonIds.filter((id) => !charIds.includes(id));
      const newTerritories = {
        ...state.territories,
        [fromId]: { ...from, garrisonIds: remaining, hasActed: true },
        [toId]: { ...to, garrisonIds: [...to.garrisonIds, ...charIds] },
      };
      return {
        territories: newTerritories,
        actedCharIds: [...state.actedCharIds, ...charIds],
        ui: { ...state.ui, transferMode: null, transferPending: null, selectedTerritoryId: null },
      };
    }),

  executeInvasion: (fromId, toId, attackerIds) =>
    set((state) => {
      const from = state.territories[fromId];
      const to = state.territories[toId];
      const attackerName = state.nations[from.ownerId].name;
      const defenderName = state.nations[to.ownerId].name;

      if (to.garrisonIds.length === 0) {
        const patch = applyStrategicBattleResult(state, fromId, toId, 'attacker', attackerIds);
        return {
          ...patch,
          ui: {
            ...(patch.ui ?? state.ui),
            invasionMode: null,
            invasionPending: null,
            selectedTerritoryId: null,
            gameOverShown: patch.winnerId != null,
          },
        };
      }

      const defenderIds = to.garrisonIds.filter((id) => state.characters[id]?.hp > 0);
      const units = placeUnits(attackerIds, defenderIds, state.characters);
      const initiativeOrder = buildInitiativeOrder(attackerIds, defenderIds, state.characters);
      const terrain = generateTerrain(8, 8);
      const battle: BattleState = {
        attackerNationId: from.ownerId,
        defenderNationId: to.ownerId,
        fromTerritoryId: fromId,
        territoryId: toId,
        map: { width: 8, height: 8, terrain },
        units,
        originalAttackerIds: attackerIds,
        originalDefenderIds: defenderIds,
        initiativeOrder,
        initiativeIndex: 0,
        turnCount: 0,
        selectedUnitId: null,
        reachableCells: [],
        attackTargets: [],
        recentLog: [],
        pendingEnd: null,
        playerSide: 'attacker',
        maxTurns: 30,
        skillMode: false,
        skillTargets: [] as string[],
        activeBuffs: {},
        powerAttackIds: [],
      };

      const entry = `⚔ ${attackerName}が${defenderName}の「${to.name}」に侵攻`;
      return {
        phase: 'tactical',
        battle,
        actedCharIds: [...state.actedCharIds, ...attackerIds],
        ui: {
          ...state.ui,
          invasionMode: null,
          invasionPending: null,
          selectedTerritoryId: null,
          log: [entry, ...state.ui.log].slice(0, 10),
        },
      };
    }),

  executeAIInvasion: (fromId, toId) =>
    set((state) => {
      const from = state.territories[fromId];
      const to = state.territories[toId];
      const attackerName = state.nations[from.ownerId].name;
      const defenderName = state.nations[to.ownerId].name;

      const aliveAttackers = from.garrisonIds.filter(
        (id) => state.characters[id]?.hp > 0 && !state.actedCharIds.includes(id),
      );
      const aliveDefenders = to.garrisonIds.filter((id) => state.characters[id]?.hp > 0);
      const units = placeUnits(aliveAttackers, aliveDefenders, state.characters);
      const initiativeOrder = buildInitiativeOrder(aliveAttackers, aliveDefenders, state.characters);
      const terrain = generateTerrain(8, 8);
      const battle: BattleState = {
        attackerNationId: from.ownerId,
        defenderNationId: to.ownerId,
        fromTerritoryId: fromId,
        territoryId: toId,
        map: { width: 8, height: 8, terrain },
        units,
        originalAttackerIds: aliveAttackers,
        originalDefenderIds: aliveDefenders,
        initiativeOrder,
        initiativeIndex: 0,
        turnCount: 0,
        selectedUnitId: null,
        reachableCells: [],
        attackTargets: [],
        recentLog: [],
        pendingEnd: null,
        playerSide: 'defender',
        maxTurns: 30,
        skillMode: false,
        skillTargets: [] as string[],
        activeBuffs: {},
        powerAttackIds: [],
      };

      const entry = `⚔ ${attackerName}が${defenderName}の「${to.name}」に侵攻！`;
      return {
        phase: 'tactical',
        battle,
        isAIThinking: false,
        ui: {
          ...state.ui,
          invasionMode: null,
          invasionPending: null,
          selectedTerritoryId: null,
          log: [entry, ...state.ui.log].slice(0, 10),
        },
      };
    }),

  endPlayerTurn: () => {
    const state = get();
    if (state.winnerId !== null) return;

    // ── 領地リセット ──
    const newTerritories: GameState['territories'] = Object.fromEntries(
      Object.entries(state.territories).map(([id, t]) => [id, { ...t, hasActed: false }]),
    );

    // ── 収入 ──
    const incomeByNation: Record<string, number> = {};
    Object.values(newTerritories).forEach((t) => {
      incomeByNation[t.ownerId] = (incomeByNation[t.ownerId] ?? 0) + t.income;
    });
    const newNations = Object.fromEntries(
      Object.entries(state.nations).map(([id, n]) => [id, { ...n, gold: n.gold + (incomeByNation[id] ?? 0) }]),
    );

    // ── 全キャラ HP 回復（毎月 maxHp の半分ずつ）+ 本拠地帰還 ──
    const newCharacters = { ...state.characters };
    const garrisonedSet = new Set<string>();
    Object.values(newTerritories).forEach((t) => t.garrisonIds.forEach((id) => garrisonedSet.add(id)));

    Object.values(newNations).forEach((nation) => {
      const capitalId = nation.capitalTerritoryId;
      nation.characterIds.forEach((cId) => {
        const ch = newCharacters[cId];
        if (ch.hp >= ch.maxHp) return;
        const wasZero = ch.hp === 0;
        const recovered = Math.min(ch.maxHp, ch.hp + Math.ceil(ch.maxHp * 0.5));
        newCharacters[cId] = { ...ch, hp: recovered };

        // hp=0 → 回復 → 本拠地ガリソンに帰還（本拠地が自国のとき）
        if (wasZero && recovered > 0 && !garrisonedSet.has(cId)) {
          const capital = newTerritories[capitalId];
          if (capital && capital.ownerId === nation.id && !capital.garrisonIds.includes(cId)) {
            newTerritories[capitalId] = {
              ...capital,
              garrisonIds: [...capital.garrisonIds, cId],
            };
            garrisonedSet.add(cId);
          }
        }
      });
    });

    const player = Object.values(newNations).find((n) => n.isPlayer)!;
    const winnerId = computeWinner(newNations, null);
    const income = incomeByNation[player.id] ?? 0;
    const nextMonth = state.month + 1;
    const monthEntry = `── 月${nextMonth}開始 / ${player.name}: +¥${income}収入 ──`;

    // ── 外交: 同盟期間短縮 ──
    const newRelations: GameState['relations'] = {};
    Object.entries(state.relations).forEach(([id, rel]) => {
      if (rel.status === 'alliance' && rel.turnsLeft > 0) {
        const left = rel.turnsLeft - 1;
        newRelations[id] = { status: left <= 0 ? 'neutral' : 'alliance', turnsLeft: Math.max(0, left) };
      } else {
        newRelations[id] = rel;
      }
    });

    // ── 傭兵: 雇用期間短縮・期限切れ除去 ──
    const newMercDurations: GameState['mercDurations'] = {};
    const expiredMercIds: string[] = [];
    Object.entries(state.mercDurations).forEach(([cId, turns]) => {
      const left = turns - 1;
      if (left <= 0) expiredMercIds.push(cId);
      else newMercDurations[cId] = left;
    });
    // 期限切れ傭兵をキャラと国から除去
    if (expiredMercIds.length > 0) {
      expiredMercIds.forEach((cId) => {
        delete newCharacters[cId];
        player.characterIds = player.characterIds.filter((id) => id !== cId);
        Object.values(newTerritories).forEach((t) => {
          if (t.garrisonIds.includes(cId)) {
            newTerritories[t.id] = { ...t, garrisonIds: t.garrisonIds.filter((id) => id !== cId) };
          }
        });
      });
      newNations[player.id] = { ...player };
    }

    // ── 目標チェック ──
    const newObjectives = checkObjectives(state.objectives, { nations: newNations, territories: newTerritories, characters: newCharacters }, player.id);
    const newlyCompleted = newObjectives.filter((o, i) => o.completed && !state.objectives[i].completed);
    const objEntries = newlyCompleted.map((o) => `🏆 目標達成: ${o.title}`);

    // ── ランダムイベント生成 ──
    const { event: newEvent, patch: eventPatch } = generateRandomEvent({ ...state, nations: newNations, characters: newCharacters, territories: newTerritories });
    const eventNations = { ...newNations, ...(eventPatch.nations ?? {}) };
    const eventChars = { ...newCharacters, ...(eventPatch.characters ?? {}) };

    // ── キャンペーン勝利条件チェック ──
    let campaignVictory: boolean | null = null; // null = 未終了, true = 勝利, false = 敗北
    if (state.campaignScenario) {
      const sc = state.campaignScenario;
      const playerTerCount = Object.values(newTerritories).filter((t) => t.ownerId === player.id).length;
      const allAIDefeated = Object.values(eventNations).every((n) => n.isPlayer || n.defeated);
      if (player.defeated) {
        campaignVictory = false;
      } else if (sc.victory.type === 'defeat_all' && allAIDefeated) {
        campaignVictory = true;
      } else if (sc.victory.type === 'survive_turns' && nextMonth >= (sc.victory.turns ?? 999) && playerTerCount >= (sc.victory.count ?? 0)) {
        campaignVictory = true;
      } else if (sc.victory.type === 'control_n' && playerTerCount >= (sc.victory.count ?? 0)) {
        campaignVictory = true;
      } else if (sc.victory.type === 'capture_capital' && winnerId === player.id) {
        campaignVictory = true;
      }
    }

    set({
      territories: newTerritories,
      nations: eventNations,
      characters: eventChars,
      month: nextMonth,
      currentNationId: player.id,
      winnerId,
      actedCharIds: [],
      relations: newRelations,
      objectives: newObjectives,
      mercPool: pickMercPool(nextMonth, player.faction),
      mercDurations: newMercDurations,
      currentEvent: newEvent,
      isAIThinking: campaignVictory === null && !winnerId,
      ui: {
        ...state.ui,
        invasionMode: null,
        invasionPending: null,
        transferMode: null,
        transferPending: null,
        gameOverShown: winnerId !== null && !state.campaignScenario,
        activePanel: 'none',
        log: [...objEntries, monthEntry, ...state.ui.log].slice(0, 10),
      },
    });

    if (campaignVictory !== null) {
      setTimeout(() => get().completeCampaignScenario(campaignVictory!), 300);
      return;
    }

    if (!winnerId) {
      const aiNationIds = Object.values(newNations)
        .filter((n) => !n.isPlayer && !n.defeated)
        .map((n) => n.id);
      setTimeout(() => get()._runStrategicAI(aiNationIds, 0), 500);
    }
  },

  // ── 戦闘フェーズ ────────────────────────────────────

  endBattle: (winnerSide) =>
    set((state) => {
      if (!state.battle) return state;
      return resolveBattle(state, winnerSide);
    }),

  selectUnit: (unitId) =>
    set((state) => {
      if (!state.battle) return state;
      if (unitId === null) {
        return { battle: { ...state.battle, selectedUnitId: null, reachableCells: [], attackTargets: [] } };
      }

      const currentActiveId = state.battle.initiativeOrder[state.battle.initiativeIndex];
      if (unitId !== currentActiveId) return state;

      const unit = state.battle.units.find((u) => u.characterId === unitId);
      if (!unit || unit.side !== state.battle.playerSide || unit.hasActed) return state;

      const ch = state.characters[unitId];
      const reachable = unit.hasMoved
        ? []
        : calcReachable(unit, ch.mov, state.battle.units, state.battle.map.width, state.battle.map.height, state.battle.map.terrain);
      const attackTargets = getAttackTargets(unit, ch, state.battle.units);

      return { battle: { ...state.battle, selectedUnitId: unitId, reachableCells: reachable, attackTargets } };
    }),

  moveUnit: (unitId, to) => {
    set((state) => {
      if (!state.battle) return state;
      const isReachable = state.battle.reachableCells.some((c) => c.x === to.x && c.y === to.y);
      if (!isReachable) return state;

      const movedUnit = {
        ...state.battle.units.find((u) => u.characterId === unitId)!,
        position: to,
        hasMoved: true,
      };
      const newUnits = state.battle.units.map((u) => u.characterId === unitId ? movedUnit : u);
      const ch = state.characters[unitId];
      const attackTargets = getAttackTargets(movedUnit, ch, newUnits);

      if (attackTargets.length === 0) {
        // 攻撃対象なし → 即時待機してイニシアチブ進行
        const acteUnits = newUnits.map((u) => u.characterId === unitId ? { ...u, hasActed: true } : u);
        return { battle: doAdvanceInitiative({ ...state.battle, units: acteUnits }) };
      }

      return {
        battle: {
          ...state.battle,
          units: newUnits,
          selectedUnitId: unitId,
          reachableCells: [],
          attackTargets,
        },
      };
    });

    // 自動待機後に AI 側になっていた場合は起動
    setTimeout(() => {
      const { battle, isAIThinking } = get();
      if (!battle || battle.pendingEnd !== null || isAIThinking) return;
      const currentId = battle.initiativeOrder[battle.initiativeIndex];
      const currentUnit = battle.units.find((u) => u.characterId === currentId);
      if (currentUnit && currentUnit.side !== battle.playerSide) {
        set({ isAIThinking: true });
        setTimeout(() => get().runTacticalAI(), 300);
      }
    }, 0);
  },

  attackUnit: (attackerId, targetId) => {
    set((state) => {
      if (!state.battle) return state;
      const attacker = state.battle.units.find((u) => u.characterId === attackerId);
      const target = state.battle.units.find((u) => u.characterId === targetId);
      if (!attacker || !target) return state;

      const attackerChar = state.characters[attackerId];
      const defenderChar = state.characters[targetId];
      if (!canAttack(attacker, target, attackerChar)) return state;

      // 地形・バフ・渾身撃 を適用
      const terrain = state.battle.map.terrain[target.position.y]?.[target.position.x] ?? 'plain';
      const defBuff = state.battle.activeBuffs[targetId];
      const buffedDefender: Character = {
        ...defenderChar,
        def:  defenderChar.def  + (defBuff?.def  ?? 0),
        mdef: defenderChar.mdef + (defBuff?.mdef ?? 0),
      };
      const isPowerAttack = state.battle.powerAttackIds.includes(attackerId);
      const damage = calculateDamage(attackerChar, buffedDefender, terrain, isPowerAttack);
      const newPowerAttackIds = isPowerAttack
        ? state.battle.powerAttackIds.filter((id) => id !== attackerId)
        : state.battle.powerAttackIds;

      const newHp = target.currentHp - damage;
      const defeated = newHp <= 0;

      let newUnits = state.battle.units
        .map((u) =>
          u.characterId === targetId
            ? { ...u, currentHp: newHp }
            : u.characterId === attackerId
            ? { ...u, hasActed: true }
            : u,
        )
        .filter((u) => u.characterId !== targetId || !defeated);

      // EXP 付与 + レベルアップ
      const expGain = damage + (defeated ? 30 : 0);
      let atkCh = { ...attackerChar, exp: attackerChar.exp + expGain };
      const lvlThreshold = atkCh.level * 100;
      if (atkCh.exp >= lvlThreshold) {
        atkCh = {
          ...atkCh,
          exp: atkCh.exp - lvlThreshold,
          level: atkCh.level + 1,
          maxHp: atkCh.maxHp + 3,
          atk:   atkCh.atk  + 1,
          def:   atkCh.def  + 1,
          matk:  atkCh.matk + 1,
          mdef:  atkCh.mdef + 1,
        };
      }

      const newCharacters: GameState['characters'] = {
        ...state.characters,
        [attackerId]: atkCh,
        ...(defeated ? { [targetId]: { ...state.characters[targetId], hp: 0 } } : {}),
      };

      const logEntry: BattleLogEntry = {
        attackerName: attackerChar.name,
        defenderName: defenderChar.name,
        damage,
        defeated,
        defenderPos: { ...target.position },
      };

      const attackerUnits = newUnits.filter((u) => u.side === 'attacker');
      const defenderUnits = newUnits.filter((u) => u.side === 'defender');
      const pendingEnd: Side | null =
        defenderUnits.length === 0 ? 'attacker' :
        attackerUnits.length === 0 ? 'defender' : null;

      let newBattle = {
        ...state.battle,
        units: newUnits,
        recentLog: [logEntry, ...state.battle.recentLog].slice(0, 10),
        pendingEnd,
        powerAttackIds: newPowerAttackIds,
        skillMode: false,
        skillTargets: [] as string[],
      };
      if (!pendingEnd) {
        newBattle = doAdvanceInitiative(newBattle);
      } else {
        newBattle = { ...newBattle, selectedUnitId: null, reachableCells: [], attackTargets: [] };
      }

      return { characters: newCharacters, battle: newBattle };
    });

    // イニシアチブが AI 側に進んだら AI を起動
    setTimeout(() => {
      const { battle, isAIThinking } = get();
      if (!battle || battle.pendingEnd !== null || isAIThinking) return;
      const currentId = battle.initiativeOrder[battle.initiativeIndex];
      const currentUnit = battle.units.find((u) => u.characterId === currentId);
      if (currentUnit && currentUnit.side !== battle.playerSide) {
        set({ isAIThinking: true });
        setTimeout(() => get().runTacticalAI(), 300);
      }
    }, 0);
  },

  endUnitTurn: (unitId) => {
    set((state) => {
      if (!state.battle) return state;
      const newUnits = state.battle.units.map((u) =>
        u.characterId === unitId ? { ...u, hasActed: true } : u,
      );
      const advanced = doAdvanceInitiative({ ...state.battle, units: newUnits, skillMode: false, skillTargets: [] as string[] });
      return { battle: advanced };
    });

    setTimeout(() => {
      const { battle, isAIThinking } = get();
      if (!battle || battle.pendingEnd !== null || isAIThinking) return;
      const currentId = battle.initiativeOrder[battle.initiativeIndex];
      const currentUnit = battle.units.find((u) => u.characterId === currentId);
      if (currentUnit && currentUnit.side !== battle.playerSide) {
        set({ isAIThinking: true });
        setTimeout(() => get().runTacticalAI(), 300);
      }
    }, 0);
  },

  // ── スキル ────────────────────────────────────────

  useSkill: (unitId) => {
    set((state) => {
      if (!state.battle) return state;
      const unit = state.battle.units.find((u) => u.characterId === unitId);
      if (!unit || unit.usedSkill || unit.side !== state.battle.playerSide) return state;

      const ch = state.characters[unitId];
      const jobId = ch.jobId;

      if (jobId === 'shielder') {
        // 庇護の構え: DEF+8 バフ、ターン消費
        const prevDef = state.battle.activeBuffs[unitId]?.def ?? 0;
        const newBuffs = { ...state.battle.activeBuffs, [unitId]: { ...state.battle.activeBuffs[unitId], def: prevDef + 8 } };
        const newUnits = state.battle.units.map((u) =>
          u.characterId === unitId ? { ...u, usedSkill: true, hasActed: true } : u,
        );
        const advanced = doAdvanceInitiative({ ...state.battle, units: newUnits, activeBuffs: newBuffs, skillMode: false, skillTargets: [] as string[] });
        return { battle: advanced };
      }

      if (jobId === 'warrior') {
        // 渾身撃: 次の攻撃が2倍ダメージ（行動権は消費しない）
        const newPowerIds = [...state.battle.powerAttackIds, unitId];
        const newUnits = state.battle.units.map((u) =>
          u.characterId === unitId ? { ...u, usedSkill: true } : u,
        );
        return { battle: { ...state.battle, units: newUnits, powerAttackIds: newPowerIds, skillMode: false, skillTargets: [] as string[] } };
      }

      if (jobId === 'mage') {
        // 全体魔法: 射程内の全敵にMATKダメージ
        const enemies = state.battle.units.filter((u) => u.side !== unit.side);
        let newUnits = [...state.battle.units];
        const newCharacters = { ...state.characters };
        const logEntries: BattleLogEntry[] = [];

        enemies.forEach((enemy) => {
          const dist = Math.abs(unit.position.x - enemy.position.x) + Math.abs(unit.position.y - enemy.position.y);
          if (dist > ch.range) return;
          const terrain = state.battle!.map.terrain[enemy.position.y]?.[enemy.position.x] ?? 'plain';
          const eBuff = state.battle!.activeBuffs[enemy.characterId];
          const eCh = { ...state.characters[enemy.characterId], mdef: state.characters[enemy.characterId].mdef + (eBuff?.mdef ?? 0) };
          const dmg = calculateDamage(ch, eCh, terrain, false);
          const newHp = enemy.currentHp - dmg;
          const defeated = newHp <= 0;
          logEntries.push({ attackerName: ch.name, defenderName: state.characters[enemy.characterId].name, damage: dmg, defeated, defenderPos: { ...enemy.position } });
          if (defeated) {
            newCharacters[enemy.characterId] = { ...newCharacters[enemy.characterId], hp: 0 };
            newUnits = newUnits.filter((u) => u.characterId !== enemy.characterId);
          } else {
            newUnits = newUnits.map((u) => u.characterId === enemy.characterId ? { ...u, currentHp: newHp } : u);
          }
        });

        // EXP: AoEダメージ合計
        const totalExp = logEntries.reduce((s, e) => s + e.damage + (e.defeated ? 30 : 0), 0);
        let atkCh = { ...ch, exp: ch.exp + totalExp };
        const lvlTh = atkCh.level * 100;
        if (atkCh.exp >= lvlTh) {
          atkCh = { ...atkCh, exp: atkCh.exp - lvlTh, level: atkCh.level + 1, maxHp: atkCh.maxHp + 3, atk: atkCh.atk + 1, def: atkCh.def + 1, matk: atkCh.matk + 1, mdef: atkCh.mdef + 1 };
        }
        newCharacters[unitId] = atkCh;

        newUnits = newUnits.map((u) => u.characterId === unitId ? { ...u, usedSkill: true, hasActed: true } : u);

        const atkU = newUnits.filter((u) => u.side === 'attacker');
        const defU = newUnits.filter((u) => u.side === 'defender');
        const pendingEnd: Side | null = defU.length === 0 ? 'attacker' : atkU.length === 0 ? 'defender' : null;
        let newBattle = { ...state.battle, units: newUnits, recentLog: [...logEntries, ...state.battle.recentLog].slice(0, 10), pendingEnd, skillMode: false, skillTargets: [] as string[] };
        if (!pendingEnd) newBattle = doAdvanceInitiative(newBattle);
        else newBattle = { ...newBattle, selectedUnitId: null, reachableCells: [], attackTargets: [] };
        return { characters: newCharacters, battle: newBattle };
      }

      // 要ターゲット選択: 槍士（突撃）・弓師（連射）
      let skillTargets: string[] = [];
      if (jobId === 'spearman') {
        skillTargets = state.battle.units
          .filter((u) => u.side !== unit.side)
          .filter((u) => {
            const dist = Math.abs(unit.position.x - u.position.x) + Math.abs(unit.position.y - u.position.y);
            return dist >= 1 && dist <= ch.range + 1;
          })
          .map((u) => u.characterId);
      } else if (jobId === 'archer') {
        skillTargets = getAttackTargets(unit, ch, state.battle.units);
      }
      return { battle: { ...state.battle, skillMode: true, skillTargets } };
    });
  },

  executeSkill: (unitId, targetId) => {
    set((state) => {
      if (!state.battle || !state.battle.skillMode) return state;
      const unit = state.battle.units.find((u) => u.characterId === unitId);
      const target = state.battle.units.find((u) => u.characterId === targetId);
      if (!unit || !target) return state;

      const ch = state.characters[unitId];
      const defenderChar = state.characters[targetId];
      const terrain = state.battle.map.terrain[target.position.y]?.[target.position.x] ?? 'plain';
      const eBuff = state.battle.activeBuffs[targetId];
      const buffedDef: Character = { ...defenderChar, def: defenderChar.def + (eBuff?.def ?? 0), mdef: defenderChar.mdef + (eBuff?.mdef ?? 0) };

      function applyHit(currentUnits: BattleState['units'], chars: GameState['characters'], entries: BattleLogEntry[]) {
        const t = currentUnits.find((u) => u.characterId === targetId);
        if (!t) return { units: currentUnits, chars, terminated: true };
        const dmg = calculateDamage(ch, buffedDef, terrain, false);
        const newHp = t.currentHp - dmg;
        const defeated = newHp <= 0;
        entries.push({ attackerName: ch.name, defenderName: defenderChar.name, damage: dmg, defeated, defenderPos: { ...t.position } });
        let units = currentUnits.map((u) => u.characterId === targetId ? { ...u, currentHp: newHp } : u);
        const newChars = { ...chars };
        if (defeated) { newChars[targetId] = { ...chars[targetId], hp: 0 }; units = units.filter((u) => u.characterId !== targetId); }
        return { units, chars: newChars, terminated: defeated };
      }

      let newUnits = [...state.battle.units];
      let newChars = { ...state.characters };
      const logEntries: BattleLogEntry[] = [];
      let terminated = false;

      if (ch.jobId === 'spearman') {
        // 突撃: 1回攻撃（延長射程）
        ({ units: newUnits, chars: newChars, terminated } = applyHit(newUnits, newChars, logEntries));
      } else if (ch.jobId === 'archer') {
        // 連射: 2回攻撃
        for (let i = 0; i < 2 && !terminated; i++) {
          ({ units: newUnits, chars: newChars, terminated } = applyHit(newUnits, newChars, logEntries));
        }
      }

      // EXP
      const totalExp = logEntries.reduce((s, e) => s + e.damage + (e.defeated ? 30 : 0), 0);
      let atkCh = { ...ch, exp: ch.exp + totalExp };
      const lvlTh = atkCh.level * 100;
      if (atkCh.exp >= lvlTh) {
        atkCh = { ...atkCh, exp: atkCh.exp - lvlTh, level: atkCh.level + 1, maxHp: atkCh.maxHp + 3, atk: atkCh.atk + 1, def: atkCh.def + 1, matk: atkCh.matk + 1, mdef: atkCh.mdef + 1 };
      }
      newChars[unitId] = atkCh;

      newUnits = newUnits.map((u) => u.characterId === unitId ? { ...u, usedSkill: true, hasActed: true } : u);

      const atkU = newUnits.filter((u) => u.side === 'attacker');
      const defU = newUnits.filter((u) => u.side === 'defender');
      const pendingEnd: Side | null = defU.length === 0 ? 'attacker' : atkU.length === 0 ? 'defender' : null;
      let newBattle = { ...state.battle, units: newUnits, recentLog: [...logEntries, ...state.battle.recentLog].slice(0, 10), pendingEnd, skillMode: false, skillTargets: [] as string[] };
      if (!pendingEnd) newBattle = doAdvanceInitiative(newBattle);
      else newBattle = { ...newBattle, selectedUnitId: null, reachableCells: [], attackTargets: [] };
      return { characters: newChars, battle: newBattle };
    });

    setTimeout(() => {
      const { battle, isAIThinking } = get();
      if (!battle || battle.pendingEnd !== null || isAIThinking) return;
      const currentId = battle.initiativeOrder[battle.initiativeIndex];
      const currentUnit = battle.units.find((u) => u.characterId === currentId);
      if (currentUnit && currentUnit.side !== battle.playerSide) {
        set({ isAIThinking: true });
        setTimeout(() => get().runTacticalAI(), 300);
      }
    }, 0);
  },

  cancelSkill: () =>
    set((state) => {
      if (!state.battle) return state;
      return { battle: { ...state.battle, skillMode: false, skillTargets: [] as string[] } };
    }),

  // ── 外交 ─────────────────────────────────────────

  proposeAlliance: (nationId) =>
    set((state) => {
      const player = Object.values(state.nations).find((n) => n.isPlayer)!;
      const cost = 200;
      if (player.gold < cost) return state;
      const rel = state.relations[nationId];
      if (!rel || rel.status === 'alliance') return state;
      const newNations = { ...state.nations, [player.id]: { ...player, gold: player.gold - cost } };
      const newRelations = { ...state.relations, [nationId]: { status: 'alliance' as const, turnsLeft: 5 } };
      const nationName = state.nations[nationId].name;
      return {
        nations: newNations,
        relations: newRelations,
        ui: { ...state.ui, log: [`🤝 ${nationName}と同盟締結（5ヶ月間）`, ...state.ui.log].slice(0, 10) },
      };
    }),

  declareWar: (nationId) =>
    set((state) => {
      const rel = state.relations[nationId];
      if (!rel || rel.status === 'war') return state;
      const newRelations = { ...state.relations, [nationId]: { status: 'war' as const, turnsLeft: 0 } };
      const nationName = state.nations[nationId].name;
      return {
        relations: newRelations,
        ui: { ...state.ui, log: [`⚔ ${nationName}に宣戦布告`, ...state.ui.log].slice(0, 10) },
      };
    }),

  // ── 傭兵 ─────────────────────────────────────────

  hireMercenary: (mercId) =>
    set((state) => {
      const merc = state.mercPool.find((m) => m.id === mercId);
      if (!merc) return state;
      const player = Object.values(state.nations).find((n) => n.isPlayer)!;
      if (player.gold < merc.cost) return state;

      const job = JOBS[merc.jobId];
      const lvBonus = merc.level - 1;
      const charId = `merc_${merc.id}_m${state.month}`;
      const newChar = {
        id: charId, name: merc.name, jobId: merc.jobId, level: merc.level, exp: 0,
        hp: job.baseHp + lvBonus * 3, maxHp: job.baseHp + lvBonus * 3,
        atk: job.baseAtk + lvBonus, def: job.baseDef + lvBonus,
        matk: job.baseMatk + lvBonus, mdef: job.baseMdef + lvBonus,
        mov: job.baseMov, range: job.baseRange,
        spritePath: `/sprites/${merc.id}.png`,
      };

      const capId = player.capitalTerritoryId;
      const capital = state.territories[capId];
      const newTerritories = capital
        ? { ...state.territories, [capId]: { ...capital, garrisonIds: [...capital.garrisonIds, charId] } }
        : state.territories;

      return {
        characters: { ...state.characters, [charId]: newChar },
        nations: {
          ...state.nations,
          [player.id]: {
            ...player,
            gold: player.gold - merc.cost,
            characterIds: [...player.characterIds, charId],
          },
        },
        territories: newTerritories,
        mercDurations: { ...state.mercDurations, [charId]: 4 },
        ui: { ...state.ui, log: [`💰 傭兵 ${merc.name} を雇用（残4ヶ月）`, ...state.ui.log].slice(0, 10) },
      };
    }),

  // ── イベント・パネル ─────────────────────────────

  dismissEvent: () => set({ currentEvent: null }),

  togglePanel: (panel) =>
    set((state) => ({
      ui: { ...state.ui, activePanel: state.ui.activePanel === panel ? 'none' : panel },
    })),

  // ── AI ────────────────────────────────────────────

  runTacticalAI: () => {
    const executeAIUnit = () => {
      const state = get();
      if (!state.battle || state.battle.pendingEnd !== null) {
        set({ isAIThinking: false });
        return;
      }

      const battle = state.battle;
      const currentId = battle.initiativeOrder[battle.initiativeIndex];
      const currentUnit = battle.units.find((u) => u.characterId === currentId);

      // 現在のユニットがプレイヤー側 or 死亡 → AI終了
      if (!currentUnit || currentUnit.side === battle.playerSide) {
        set({ isAIThinking: false });
        return;
      }

      const action = decideAIUnitAction(currentUnit, state.characters, battle);

      if (action.type === 'move') {
        get().moveUnit(action.unitId, action.to);
        setTimeout(() => {
          const s = get();
          if (!s.battle || s.battle.pendingEnd !== null) {
            set({ isAIThinking: false });
            return;
          }
          const freshUnit = s.battle.units.find((u) => u.characterId === currentId);
          if (freshUnit && !freshUnit.hasActed) {
            const freshCh = s.characters[freshUnit.characterId];
            const targets = getAttackTargets(freshUnit, freshCh, s.battle.units);
            if (targets.length > 0) {
              get().attackUnit(freshUnit.characterId, targets[0]);
              // attackUnit が advance を呼ぶので、次の AI チェックはそちらに任せる
              setTimeout(() => {
                const s2 = get();
                if (!s2.battle || s2.battle.pendingEnd !== null) { set({ isAIThinking: false }); return; }
                const nextId = s2.battle.initiativeOrder[s2.battle.initiativeIndex];
                const nextUnit = s2.battle.units.find(u => u.characterId === nextId);
                if (nextUnit && nextUnit.side !== s2.battle.playerSide) {
                  setTimeout(executeAIUnit, 400);
                } else {
                  set({ isAIThinking: false });
                }
              }, 700);
            } else {
              get().endUnitTurn(freshUnit.characterId);
              setTimeout(() => {
                const s2 = get();
                if (!s2.battle || s2.battle.pendingEnd !== null) { set({ isAIThinking: false }); return; }
                const nextId = s2.battle.initiativeOrder[s2.battle.initiativeIndex];
                const nextUnit = s2.battle.units.find(u => u.characterId === nextId);
                if (nextUnit && nextUnit.side !== s2.battle.playerSide) {
                  setTimeout(executeAIUnit, 300);
                } else {
                  set({ isAIThinking: false });
                }
              }, 100);
            }
          } else {
            set({ isAIThinking: false });
          }
        }, 400);
      } else if (action.type === 'attack') {
        get().attackUnit(action.attackerId, action.targetId);
        setTimeout(() => {
          const s2 = get();
          if (!s2.battle || s2.battle.pendingEnd !== null) { set({ isAIThinking: false }); return; }
          const nextId = s2.battle.initiativeOrder[s2.battle.initiativeIndex];
          const nextUnit = s2.battle.units.find(u => u.characterId === nextId);
          if (nextUnit && nextUnit.side !== s2.battle.playerSide) {
            setTimeout(executeAIUnit, 500);
          } else {
            set({ isAIThinking: false });
          }
        }, 700);
      } else {
        get().endUnitTurn(currentUnit.characterId);
        setTimeout(() => {
          const s2 = get();
          if (!s2.battle || s2.battle.pendingEnd !== null) { set({ isAIThinking: false }); return; }
          const nextId = s2.battle.initiativeOrder[s2.battle.initiativeIndex];
          const nextUnit = s2.battle.units.find(u => u.characterId === nextId);
          if (nextUnit && nextUnit.side !== s2.battle.playerSide) {
            setTimeout(executeAIUnit, 300);
          } else {
            set({ isAIThinking: false });
          }
        }, 100);
      }
    };

    setTimeout(executeAIUnit, 500);
  },

  _runStrategicAI: (nationIds, idx) => {
    if (idx >= nationIds.length) {
      set({ isAIThinking: false });
      return;
    }

    const state = get();
    if (state.winnerId !== null) {
      set({ isAIThinking: false });
      return;
    }

    const nationId = nationIds[idx];
    const nation = state.nations[nationId];
    if (!nation || nation.defeated) {
      get()._runStrategicAI(nationIds, idx + 1);
      return;
    }

    // AI 兵力移動（内陸 → 国境強化）
    const transfers = decideAITransfers(nationId, state);
    if (transfers.length > 0) {
      const updatedTerritories = { ...state.territories };
      for (const tr of transfers) {
        const from = updatedTerritories[tr.fromId];
        const to = updatedTerritories[tr.toId];
        updatedTerritories[tr.fromId] = {
          ...from,
          garrisonIds: from.garrisonIds.filter((id) => !tr.charIds.includes(id)),
          hasActed: true,
        };
        updatedTerritories[tr.toId] = {
          ...to,
          garrisonIds: [...to.garrisonIds, ...tr.charIds],
        };
      }
      set({ territories: updatedTerritories });
    }

    const action = decideAINationAction(nationId, get());

    if (action.type === 'invade') {
      const { fromId, toId } = action;
      const playerNationId = Object.values(state.nations).find((n) => n.isPlayer)!.id;

      if (state.territories[toId].ownerId === playerNationId) {
        if (state.territories[toId].garrisonIds.length === 0) {
          const patch = applyStrategicBattleResult(state, fromId, toId, 'attacker', state.territories[fromId].garrisonIds);
          set(patch as Partial<GameState & GameActions>);
          setTimeout(() => get()._runStrategicAI(nationIds, idx + 1), 600);
          return;
        }
        get().executeAIInvasion(fromId, toId);
        setTimeout(() => {
          set({ isAIThinking: true });
          get().runTacticalAI();
        }, 600);
        return;
      }

      const result = resolveAutoBattle(state, fromId, toId);
      const patch = applyStrategicBattleResult(state, fromId, toId, result.winnerSide, result.survivingAttackerIds);
      set(patch as Partial<GameState & GameActions>);
      setTimeout(() => get()._runStrategicAI(nationIds, idx + 1), 600);
    } else {
      setTimeout(() => get()._runStrategicAI(nationIds, idx + 1), 200);
    }
  },
}));

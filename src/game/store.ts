import { create } from 'zustand';
import type { BattleLogEntry, BattleState, CampaignProgress, CampaignScenario, Character, DiplomaticStatus, GameState, Side, UISelection } from './types';
import { NATIONS } from '../data/nations';
import { TERRITORIES } from '../data/territories';
import { CHARACTERS } from '../data/characters';
import { JOBS } from '../data/jobs';
import { CAMPAIGNS } from '../data/campaigns';
import { placeUnits, selectBattleParticipants } from './tactical/placement';
import { calcReachable } from './tactical/movement';
import { calculateDamage, canAttack, getAttackTargets } from './tactical/attack';
import { decideAIUnitAction } from './tactical/ai';
import { decideAINationAction, decideAITransfers } from './strategic/ai';
import { resolveAutoBattle } from './strategic/autoBattle';
import { findMarchPath } from './strategic/pathfinding';
import { generateTerrain } from './terrain';
import { generateRandomEvent } from '../data/events';
import { seAttack, seDefeat, seLevelUp, seVictory, seDefeat2, seSkill, seInvade } from './sound';
import { INITIAL_OBJECTIVES, checkObjectives } from '../data/objectives';
import { pickMercPool } from '../data/mercenaries';
import { checkNewAchievements, loadAchievements, saveAchievements, defaultStats } from '../data/achievements';

const INITIAL_UI: UISelection = {
  selectedTerritoryId: null,
  invasionMode: null,
  invasionPending: null,
  transferMode: null,
  transferPending: null,
  marchPlanMode: null,
  marchPlanPreview: null,
  gameOverShown: false,
  log: [],
  activePanel: 'none',
};

function filterMercPool<T extends { name: string }>(pool: T[], characters: Record<string, { name: string }>): T[] {
  const existingNames = new Set(Object.values(characters).map((c) => c.name));
  return pool.filter((m) => !existingNames.has(m.name));
}

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
    autoPlay: false,
    fastForward: false,
    actedCharIds: [],
    relations: buildRelations(newNations as typeof NATIONS, playerNationId),
    objectives: [...INITIAL_OBJECTIVES],
    mercPool: filterMercPool(pickMercPool(1, playerFaction), newChars),
    mercDurations: {},
    currentEvent: null,
    recruitOffer: null,
    marchPlans: [],
    ui: { ...INITIAL_UI },
    // 実績はロード時に localStorage から引き継ぐ（後で上書き）
    playerStats: defaultStats(),
    unlockedAchievementIds: [],
    pendingAchievementToasts: [],
    currentGameLosses: 0,
  };
}

const getInitialState = (): GameState => {
  // setup フェーズで開始; 国家未選択
  const savedAch = loadAchievements();
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
    autoPlay: false,
    fastForward: false,
    actedCharIds: [],
    relations: {},
    objectives: [...INITIAL_OBJECTIVES],
    mercPool: [],
    mercDurations: {},
    currentEvent: null,
    recruitOffer: null,
    marchPlans: [],
    campaignProgress: null,
    campaignScenario: null,
    ui: { ...INITIAL_UI },
    playerStats: savedAch.stats,
    unlockedAchievementIds: savedAch.unlockedIds,
    pendingAchievementToasts: [],
    currentGameLosses: 0,
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
  moveAndAttack: (unitId: string, targetId: string) => void;
  endUnitTurn: (unitId: string) => void;
  useSkill: (unitId: string) => void;
  executeSkill: (unitId: string, targetId: string) => void;
  cancelSkill: () => void;
  toggleAutoTactical: () => void;
  // 外交
  proposeAlliance: (nationId: string) => void;
  declareWar: (nationId: string) => void;
  // 傭兵
  hireMercenary: (mercId: string) => void;
  // 勧誘（敗北国兵士を仲間に）
  acceptRecruit: (charId: string) => void;
  dismissRecruit: () => void;
  // イベント
  dismissEvent: () => void;
  // パネル
  togglePanel: (panel: GameState['ui']['activePanel']) => void;
  toggleAutoPlay: () => void;
  toggleFastForward: () => void;
  runTacticalAI: () => void;
  _runStrategicAI: (nationIds: string[], idx: number) => void;
  // 行軍計画
  startMarchPlan: (fromId: string) => void;
  cancelMarchPlanMode: () => void;
  previewMarchPlan: (fromId: string, toId: string) => void;
  createMarchPlan: (fromId: string, toId: string) => void;
  cancelMarchPlan: (planId: string) => void;
  _executeMarchPlans: () => void;
  // 実績
  dismissAchievementToast: () => void;
  _updateStats: (patch: Partial<GameState['playerStats']>) => void;
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

  // 敗北国が出たらプレイヤーに勧誘オファーを出す
  const justDefeated = winnerSide === 'attacker'
    && !state.nations[defenderNationId].defeated
    && newNations[defenderNationId].defeated
    && state.nations[attackerNationId].isPlayer
    && !state.autoPlay
    && winnerId === null; // ゲームクリアと同時は除く
  const recruitOffer = justDefeated ? {
    nationId: defenderNationId,
    nationName: state.nations[defenderNationId].name,
    charIds: state.nations[defenderNationId].characterIds.slice(0, 5),
    recruitedCount: 0,
  } : state.recruitOffer;

  // ── 実績統計の更新 ─────────────────────────────────────
  const playerIsAttacker = state.battle!.playerSide === 'attacker';
  const playerWon = winnerSide === state.battle!.playerSide;
  const playerLost = !playerWon;

  // 速攻勝利 & 全員生存勝利の判定
  const fastWin = playerWon && (state.battle!.turnCount <= 3);
  const perfectWin = playerWon && (() => {
    const playerOrigIds = playerIsAttacker ? battle.originalAttackerIds : battle.originalDefenderIds;
    const survivingPlayerIds = playerIsAttacker ? survivingAttackerIds : survivingDefenderIds;
    return playerOrigIds.every((id) => survivingPlayerIds.includes(id));
  })();

  const newStats: GameState['playerStats'] = {
    ...state.playerStats,
    battlesWon: state.playerStats.battlesWon + (playerWon ? 1 : 0),
    battlesLost: state.playerStats.battlesLost + (playerLost ? 1 : 0),
    territoriesCaptured: state.playerStats.territoriesCaptured + (playerWon && playerIsAttacker ? 1 : 0),
    fastBattleWins: state.playerStats.fastBattleWins + (fastWin ? 1 : 0),
    perfectBattleWins: state.playerStats.perfectBattleWins + (perfectWin ? 1 : 0),
    maxMonthSurvived: Math.max(state.playerStats.maxMonthSurvived, state.month),
  };

  const newGameLosses = state.currentGameLosses + (playerLost ? 1 : 0);

  const newUnlocked = [...state.unlockedAchievementIds];
  const newToasts = [...state.pendingAchievementToasts];
  const toCheck = checkNewAchievements(newStats, new Set(newUnlocked));
  toCheck.forEach((id) => { newUnlocked.push(id); newToasts.push(id); });
  if (toCheck.length > 0) saveAchievements({ unlockedIds: newUnlocked, stats: newStats });

  return {
    characters: newCharacters,
    nations: newNations,
    territories: newTerritories,
    phase: 'strategic',
    battle: null,
    isAIThinking: false,
    winnerId,
    recruitOffer,
    playerStats: newStats,
    unlockedAchievementIds: newUnlocked,
    pendingAchievementToasts: newToasts,
    currentGameLosses: newGameLosses,
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

  const justDefeated = winnerSide === 'attacker'
    && !state.nations[defenderNationId].defeated
    && newNations[defenderNationId].defeated
    && state.nations[attackerNationId].isPlayer
    && !state.autoPlay
    && winnerId === null;
  const recruitOffer = justDefeated ? {
    nationId: defenderNationId,
    nationName: state.nations[defenderNationId].name,
    charIds: state.nations[defenderNationId].characterIds.slice(0, 5),
    recruitedCount: 0,
  } : state.recruitOffer;

  return {
    nations: newNations,
    territories: newTerritories,
    winnerId,
    recruitOffer,
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
        mercPool: filterMercPool(pickMercPool(1, playerFaction), state.characters),
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
    const {
      phase, month, currentNationId, nations, territories, characters,
      relations, objectives, mercPool, mercDurations, marchPlans,
      winnerId, campaignProgress, campaignScenario, ui,
    } = get();
    const data = {
      phase, month, currentNationId, nations, territories, characters,
      relations, objectives, mercPool, mercDurations, marchPlans,
      winnerId, campaignProgress, campaignScenario,
      ui: { ...ui, invasionMode: null, invasionPending: null, transferMode: null, transferPending: null, marchPlanMode: null, marchPlanPreview: null, gameOverShown: false },
    };
    localStorage.setItem('srpg-conquest-save', JSON.stringify(data));
    localStorage.setItem('srpg-conquest-save-ts', Date.now().toString());
  },

  loadGame: () => {
    const raw = localStorage.getItem('srpg-conquest-save');
    if (!raw) return;
    try {
      const data = JSON.parse(raw) as Partial<GameState>;
      set({ ...data, marchPlans: data.marchPlans ?? [], battle: null, isAIThinking: false, currentEvent: null });
    } catch { /* 壊れたセーブは無視 */ }
  },

  // ── 戦略マップ操作 ──────────────────────────────────

  selectTerritory: (id) =>
    set((state) => ({ ui: { ...state.ui, selectedTerritoryId: id, invasionMode: null, marchPlanMode: null, marchPlanPreview: null } })),

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
        [fromId]: { ...from, garrisonIds: remaining },
        [toId]: { ...to, garrisonIds: [...to.garrisonIds, ...charIds] },
      };
      return {
        territories: newTerritories,
        actedCharIds: [...state.actedCharIds, ...charIds],
        ui: { ...state.ui, transferMode: null, transferPending: null, selectedTerritoryId: null },
      };
    }),

  executeInvasion: (fromId, toId, attackerIds) => {
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

      // 防衛側が全員回復中（hp=0）なら無血占領
      if (defenderIds.length === 0) {
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

      const selectedAttackers = selectBattleParticipants(attackerIds, state.characters);
      const selectedDefenders = selectBattleParticipants(defenderIds, state.characters);
      const units = placeUnits(attackerIds, defenderIds, state.characters);
      const initiativeOrder = buildInitiativeOrder(selectedAttackers, selectedDefenders, state.characters);
      const terrain = generateTerrain(8, 6);
      const battle: BattleState = {
        attackerNationId: from.ownerId,
        defenderNationId: to.ownerId,
        fromTerritoryId: fromId,
        territoryId: toId,
        map: { width: 8, height: 6, terrain },
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
        autoTactical: false,
        quickAttackTargets: [] as string[],
      };

      seInvade();
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
    });
    // バトル開始時に1番手が敵（防衛側）の場合AIを起動
    const s = get();
    if (s.phase === 'tactical' && s.battle) {
      const firstId = s.battle.initiativeOrder[0];
      const firstUnit = s.battle.units.find((u) => u.characterId === firstId);
      if (firstUnit && firstUnit.side !== s.battle.playerSide) {
        set({ isAIThinking: true });
        setTimeout(() => get().runTacticalAI(), 500);
      }
    }
  },

  executeAIInvasion: (fromId, toId) => {
    set((state) => {
      const from = state.territories[fromId];
      const to = state.territories[toId];
      const attackerName = state.nations[from.ownerId].name;
      const defenderName = state.nations[to.ownerId].name;

      const aliveAttackers = from.garrisonIds.filter(
        (id) => state.characters[id]?.hp > 0 && !state.actedCharIds.includes(id),
      );
      const aliveDefenders = to.garrisonIds.filter((id) => state.characters[id]?.hp > 0);

      // プレイヤー防衛側が全員回復中（hp=0）なら戦術バトルなしで自動陥落
      if (aliveDefenders.length === 0) {
        return applyStrategicBattleResult(state, fromId, toId, 'attacker', aliveAttackers) as typeof state;
      }

      const selAtk = selectBattleParticipants(aliveAttackers, state.characters);
      const selDef = selectBattleParticipants(aliveDefenders, state.characters);
      const units = placeUnits(aliveAttackers, aliveDefenders, state.characters);
      const initiativeOrder = buildInitiativeOrder(selAtk, selDef, state.characters);
      const terrain = generateTerrain(8, 6);
      const battle: BattleState = {
        attackerNationId: from.ownerId,
        defenderNationId: to.ownerId,
        fromTerritoryId: fromId,
        territoryId: toId,
        map: { width: 8, height: 6, terrain },
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
        autoTactical: false,
        quickAttackTargets: [] as string[],
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
    });
    // バトル開始時に1番手が敵（攻撃側AI）の場合AIを起動
    const s = get();
    if (s.phase === 'tactical' && s.battle) {
      const firstId = s.battle.initiativeOrder[0];
      const firstUnit = s.battle.units.find((u) => u.characterId === firstId);
      if (firstUnit && firstUnit.side !== s.battle.playerSide) {
        set({ isAIThinking: true });
        setTimeout(() => get().runTacticalAI(), 500);
      }
    }
  },

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
        const recovered = Math.min(ch.maxHp, ch.hp + Math.ceil(ch.maxHp * 0.25));
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

    // 実績統計: 月・gold・ゲーム勝利
    const playerGoldNow = eventNations[player.id]?.gold ?? player.gold;
    const playerWonGame = winnerId === player.id;
    const newStatsTurn: GameState['playerStats'] = {
      ...state.playerStats,
      maxMonthSurvived: Math.max(state.playerStats.maxMonthSurvived, nextMonth),
      maxGoldHeld: Math.max(state.playerStats.maxGoldHeld, playerGoldNow),
      gamesWon: state.playerStats.gamesWon + (playerWonGame ? 1 : 0),
      noLossWins: state.playerStats.noLossWins + (playerWonGame && state.currentGameLosses === 0 ? 1 : 0),
    };
    const newUnlockedTurn = [...state.unlockedAchievementIds];
    const newToastsTurn = [...state.pendingAchievementToasts];
    checkNewAchievements(newStatsTurn, new Set(newUnlockedTurn)).forEach((id) => { newUnlockedTurn.push(id); newToastsTurn.push(id); });
    if (newUnlockedTurn.length > state.unlockedAchievementIds.length) saveAchievements({ unlockedIds: newUnlockedTurn, stats: newStatsTurn });

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
      mercPool: filterMercPool(pickMercPool(nextMonth, player.faction), eventChars),
      mercDurations: newMercDurations,
      currentEvent: newEvent,
      isAIThinking: campaignVictory === null && !winnerId,
      playerStats: newStatsTurn,
      unlockedAchievementIds: newUnlockedTurn,
      pendingAchievementToasts: newToastsTurn,
      currentGameLosses: playerWonGame ? 0 : state.currentGameLosses,
      ui: {
        ...state.ui,
        invasionMode: null,
        invasionPending: null,
        transferMode: null,
        transferPending: null,
        marchPlanMode: null,
        marchPlanPreview: null,
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
      // 行軍計画を1ステップ実行してからAIターンへ
      setTimeout(() => {
        get()._executeMarchPlans();
        const s2 = get();
        if (!s2.winnerId) {
          setTimeout(() => get()._runStrategicAI(aiNationIds, 0), 300);
        }
      }, 200);
    }
  },

  // ── 戦闘フェーズ ────────────────────────────────────

  endBattle: (winnerSide) =>
    set((state) => {
      if (!state.battle) return state;
      const isPlayer = state.battle.playerSide === winnerSide;
      setTimeout(() => isPlayer ? seVictory() : seDefeat2(), 100);
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
      // reachableCells が空の場合（AI実行時）はその場で計算する
      let reachable = state.battle.reachableCells;
      if (reachable.length === 0) {
        const u = state.battle.units.find((u) => u.characterId === unitId);
        const ch = state.characters[unitId];
        if (u && ch && !u.hasMoved) {
          reachable = calcReachable(u, ch.mov, state.battle.units, state.battle.map.width, state.battle.map.height, state.battle.map.terrain);
        }
      }
      const isReachable = reachable.some((c) => c.x === to.x && c.y === to.y);
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

      // EXP 付与 + レベルアップ（プレイヤー側は1.5倍）
      const isPlayerAtk = state.battle.units.find((u) => u.characterId === attackerId)?.side === state.battle.playerSide;
      const expGain = Math.ceil((damage + (defeated ? 30 : 0)) * (isPlayerAtk ? 1.5 : 1));
      let atkCh = { ...attackerChar, exp: attackerChar.exp + expGain };
      const lvlThreshold = atkCh.level * 70;
      let didLevelUp = false;
      if (atkCh.exp >= lvlThreshold) {
        didLevelUp = true;
        atkCh = {
          ...atkCh,
          exp: atkCh.exp - lvlThreshold,
          level: atkCh.level + 1,
          maxHp: atkCh.maxHp + 3,
          hp:    Math.min(atkCh.hp + 3, atkCh.maxHp + 3), // LvUP時にHP+3
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

      // SE
      if (defeated) seDefeat(); else seAttack();
      if (didLevelUp) setTimeout(seLevelUp, 150);

      const logEntry: BattleLogEntry = {
        attackerName: attackerChar.name,
        defenderName: defenderChar.name,
        damage,
        defeated,
        defenderPos: { ...target.position },
        levelUp: didLevelUp || undefined,
        newLevel: didLevelUp ? atkCh.level : undefined,
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

      // ── 実績統計: 撃破・レベルアップ・渾身撃 ──────────────
      const playerIsAtk2 = state.battle.playerSide === attacker.side;
      if (defeated && playerIsAtk2) {
        const newStats2 = {
          ...state.playerStats,
          unitsDefeated: state.playerStats.unitsDefeated + 1,
          powerAttackKills: state.playerStats.powerAttackKills + (isPowerAttack ? 1 : 0),
          maxLevelReached: Math.max(state.playerStats.maxLevelReached, atkCh.level),
        };
        const newUnlocked2 = [...state.unlockedAchievementIds];
        const newToasts2 = [...state.pendingAchievementToasts];
        const toCheck2 = checkNewAchievements(newStats2, new Set(newUnlocked2));
        toCheck2.forEach((id) => { newUnlocked2.push(id); newToasts2.push(id); });
        if (toCheck2.length > 0) saveAchievements({ unlockedIds: newUnlocked2, stats: newStats2 });
        return { characters: newCharacters, battle: newBattle, playerStats: newStats2, unlockedAchievementIds: newUnlocked2, pendingAchievementToasts: newToasts2 };
      } else if (didLevelUp) {
        const newStats2 = { ...state.playerStats, maxLevelReached: Math.max(state.playerStats.maxLevelReached, atkCh.level) };
        const newUnlocked2 = [...state.unlockedAchievementIds];
        const newToasts2 = [...state.pendingAchievementToasts];
        const toCheck2 = checkNewAchievements(newStats2, new Set(newUnlocked2));
        toCheck2.forEach((id) => { newUnlocked2.push(id); newToasts2.push(id); });
        if (toCheck2.length > 0) saveAchievements({ unlockedIds: newUnlocked2, stats: newStats2 });
        return { characters: newCharacters, battle: newBattle, playerStats: newStats2, unlockedAchievementIds: newUnlocked2, pendingAchievementToasts: newToasts2 };
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
      const isEnemyTurn = currentUnit && currentUnit.side !== battle.playerSide;
      const isAutoTactical = battle.autoTactical;
      if (isEnemyTurn || isAutoTactical) {
        set({ isAIThinking: true });
        setTimeout(() => get().runTacticalAI(), isAutoTactical ? 150 : 300);
      }
    }, 0);
  },

  // ── ワンクリック移動+攻撃 ─────────────────────────
  moveAndAttack: (unitId, targetId) => {
    set((state) => {
      if (!state.battle) return state;
      const unit = state.battle.units.find((u) => u.characterId === unitId);
      const target = state.battle.units.find((u) => u.characterId === targetId);
      const ch = state.characters[unitId];
      if (!unit || !target || !ch || unit.hasActed) return state;

      const manhattan = (a: {x:number;y:number}, b: {x:number;y:number}) =>
        Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

      // 既に射程内なら移動不要
      const dist = manhattan(unit.position, target.position);
      if (!unit.hasMoved && dist > ch.range) {
        // 射程内に入れる最適セルを探す
        const reachable = calcReachable(unit, ch.mov, state.battle.units,
          state.battle.map.width, state.battle.map.height, state.battle.map.terrain);
        const attackable = reachable.filter((c) => {
          const d = manhattan(c, target.position);
          return d >= 1 && d <= ch.range;
        });
        if (attackable.length > 0) {
          // 距離最小→なるべく隣接
          const best = [...attackable].sort(
            (a, b) => manhattan(a, target.position) - manhattan(b, target.position)
          )[0];
          const movedUnit = { ...unit, position: best, hasMoved: true };
          const newUnits = state.battle.units.map((u) =>
            u.characterId === unitId ? movedUnit : u
          );
          return {
            battle: {
              ...state.battle,
              units: newUnits,
              selectedUnitId: unitId,
              reachableCells: [],
              attackTargets: [targetId],
              quickAttackTargets: [],
            },
          };
        }
      }
      // 移動不要 or 移動済み: attackTargetsをセットするだけ
      return {
        battle: {
          ...state.battle,
          selectedUnitId: unitId,
          reachableCells: [],
          attackTargets: [targetId],
          quickAttackTargets: [],
        },
      };
    });
    // 状態更新後に攻撃実行
    setTimeout(() => get().attackUnit(unitId, targetId), 0);
  },

  toggleAutoTactical: () => {
    set((state) => {
      if (!state.battle) return state;
      const newVal = !state.battle.autoTactical;
      return { battle: { ...state.battle, autoTactical: newVal } };
    });
    // ON にした直後、現在プレイヤーターンなら即AIを起動
    setTimeout(() => {
      const { battle, isAIThinking } = get();
      if (!battle || !battle.autoTactical || battle.pendingEnd !== null || isAIThinking) return;
      const currentId = battle.initiativeOrder[battle.initiativeIndex];
      const currentUnit = battle.units.find((u) => u.characterId === currentId);
      if (currentUnit && currentUnit.side === battle.playerSide && !currentUnit.hasActed) {
        set({ isAIThinking: true });
        setTimeout(() => get().runTacticalAI(), 150);
      }
    }, 0);
  },

  // ── スキル ────────────────────────────────────────

  useSkill: (unitId) => {
    set((state) => {
      if (!state.battle) return state;
      const unit = state.battle.units.find((u) => u.characterId === unitId);
      if (!unit || unit.usedSkill) return state;

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

        // EXP: AoEダメージ合計（プレイヤー側1.5倍）
        const isPlayerUnit2 = unit.side === state.battle!.playerSide;
        const rawExp2 = logEntries.reduce((s, e) => s + e.damage + (e.defeated ? 30 : 0), 0);
        const totalExp = Math.ceil(rawExp2 * (isPlayerUnit2 ? 1.5 : 1));
        let atkCh = { ...ch, exp: ch.exp + totalExp };
        const lvlTh = atkCh.level * 70;
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

        // 実績統計: AoE撃破 / レベルアップ
        if (isPlayerUnit2) {
          const killCount = logEntries.filter((e) => e.defeated).length;
          const newStats3 = {
            ...state.playerStats,
            unitsDefeated: state.playerStats.unitsDefeated + killCount,
            aoeTripleKills: state.playerStats.aoeTripleKills + (killCount >= 3 ? 1 : 0),
            maxLevelReached: Math.max(state.playerStats.maxLevelReached, atkCh.level),
          };
          const newUnlocked3 = [...state.unlockedAchievementIds];
          const newToasts3 = [...state.pendingAchievementToasts];
          const toCheck3 = checkNewAchievements(newStats3, new Set(newUnlocked3));
          toCheck3.forEach((id) => { newUnlocked3.push(id); newToasts3.push(id); });
          if (toCheck3.length > 0) saveAchievements({ unlockedIds: newUnlocked3, stats: newStats3 });
          return { characters: newCharacters, battle: newBattle, playerStats: newStats3, unlockedAchievementIds: newUnlocked3, pendingAchievementToasts: newToasts3 };
        }
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
      seSkill();
      return { battle: { ...state.battle, skillMode: true, skillTargets } };
    });

    // スキル使用後に次のユニットがAIなら起動（盾士・魔術師はターンが自動進行）
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

      // EXP（プレイヤー側1.5倍）
      const isPlayerUnit3 = unit.side === state.battle!.playerSide;
      const rawExp3 = logEntries.reduce((s, e) => s + e.damage + (e.defeated ? 30 : 0), 0);
      const totalExpSkill = Math.ceil(rawExp3 * (isPlayerUnit3 ? 1.5 : 1));
      let atkCh = { ...ch, exp: ch.exp + totalExpSkill };
      const lvlTh = atkCh.level * 70;
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
      // 実績統計
      const newStatsAl = { ...state.playerStats, alliancesFormed: state.playerStats.alliancesFormed + 1 };
      const newUnlockedAl = [...state.unlockedAchievementIds];
      const newToastsAl = [...state.pendingAchievementToasts];
      checkNewAchievements(newStatsAl, new Set(newUnlockedAl)).forEach((id) => { newUnlockedAl.push(id); newToastsAl.push(id); });
      saveAchievements({ unlockedIds: newUnlockedAl, stats: newStatsAl });
      return {
        nations: newNations,
        relations: newRelations,
        playerStats: newStatsAl,
        unlockedAchievementIds: newUnlockedAl,
        pendingAchievementToasts: newToastsAl,
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

      // 実績統計
      const newStatsMerc = { ...state.playerStats, mercenariesHired: state.playerStats.mercenariesHired + 1 };
      const newUnlockedMerc = [...state.unlockedAchievementIds];
      const newToastsMerc = [...state.pendingAchievementToasts];
      checkNewAchievements(newStatsMerc, new Set(newUnlockedMerc)).forEach((id) => { newUnlockedMerc.push(id); newToastsMerc.push(id); });
      if (newUnlockedMerc.length > state.unlockedAchievementIds.length) saveAchievements({ unlockedIds: newUnlockedMerc, stats: newStatsMerc });
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
        playerStats: newStatsMerc,
        unlockedAchievementIds: newUnlockedMerc,
        pendingAchievementToasts: newToastsMerc,
        ui: { ...state.ui, log: [`💰 傭兵 ${merc.name} を雇用（残4ヶ月）`, ...state.ui.log].slice(0, 10) },
      };
    }),

  // ── 勧誘（敗北国兵士） ────────────────────────────

  acceptRecruit: (charId) =>
    set((state) => {
      if (!state.recruitOffer) return state;
      const RECRUIT_COST = 150;
      const player = Object.values(state.nations).find((n) => n.isPlayer)!;
      if (player.gold < RECRUIT_COST) return state;
      const ch = state.characters[charId];
      if (!ch) return state;

      // キャラをHP半回復で復帰させプレイヤー国に編入
      const healedHp = Math.max(1, Math.ceil(ch.maxHp * 0.5));
      const capId = player.capitalTerritoryId;
      const capital = state.territories[capId];
      const newTerritories = capital
        ? { ...state.territories, [capId]: { ...capital, garrisonIds: [...capital.garrisonIds, charId] } }
        : state.territories;

      const remainingIds = state.recruitOffer.charIds.filter((id) => id !== charId);
      const newOffer = remainingIds.length === 0 ? null : {
        ...state.recruitOffer,
        charIds: remainingIds,
        recruitedCount: state.recruitOffer.recruitedCount + 1,
      };

      return {
        characters: { ...state.characters, [charId]: { ...ch, hp: healedHp } },
        nations: {
          ...state.nations,
          [player.id]: { ...player, gold: player.gold - RECRUIT_COST, characterIds: [...player.characterIds, charId] },
        },
        territories: newTerritories,
        recruitOffer: newOffer,
        ui: { ...state.ui, log: [`🤝 ${ch.name} を仲間にした`, ...state.ui.log].slice(0, 10) },
      };
    }),

  dismissRecruit: () => set({ recruitOffer: null }),

  // ── イベント・パネル ─────────────────────────────

  dismissEvent: () => set({ currentEvent: null }),

  dismissAchievementToast: () =>
    set((state) => ({ pendingAchievementToasts: state.pendingAchievementToasts.slice(1) })),

  _updateStats: (patch) =>
    set((state) => {
      const newStats = { ...state.playerStats, ...patch };
      const newUnlocked = [...state.unlockedAchievementIds];
      const newToasts = [...state.pendingAchievementToasts];
      checkNewAchievements(newStats, new Set(newUnlocked)).forEach((id) => { newUnlocked.push(id); newToasts.push(id); });
      saveAchievements({ unlockedIds: newUnlocked, stats: newStats });
      return { playerStats: newStats, unlockedAchievementIds: newUnlocked, pendingAchievementToasts: newToasts };
    }),

  togglePanel: (panel) =>
    set((state) => ({
      ui: { ...state.ui, activePanel: state.ui.activePanel === panel ? 'none' : panel },
    })),

  toggleAutoPlay: () => {
    const newVal = !get().autoPlay;
    set({ autoPlay: newVal });
    // 戦略フェーズでプレイヤーのターン中なら即座にAIを起動
    if (newVal) {
      const s = get();
      if (s.phase === 'strategic' && !s.isAIThinking && !s.winnerId) {
        setTimeout(() => get().endPlayerTurn(), 100);
      }
    }
  },

  toggleFastForward: () => set((state) => ({ fastForward: !state.fastForward })),

  // ── 行軍計画 ──────────────────────────────────────

  startMarchPlan: (fromId) =>
    set((state) => ({
      ui: {
        ...state.ui,
        marchPlanMode: { fromTerritoryId: fromId },
        marchPlanPreview: null,
        invasionMode: null,
        transferMode: null,
      },
    })),

  cancelMarchPlanMode: () =>
    set((state) => ({
      ui: { ...state.ui, marchPlanMode: null, marchPlanPreview: null },
    })),

  previewMarchPlan: (fromId, toId) => {
    const state = get();
    const player = Object.values(state.nations).find((n) => n.isPlayer)!;
    const path = findMarchPath(fromId, toId, state.territories, player.id);
    if (!path) return;
    set((s) => ({
      ui: { ...s.ui, marchPlanPreview: { fromId, toId, path } },
    }));
  },

  createMarchPlan: (fromId, toId) => {
    const state = get();
    const player = Object.values(state.nations).find((n) => n.isPlayer)!;
    const path = findMarchPath(fromId, toId, state.territories, player.id);
    if (!path || path.length < 2) return;
    const from = state.territories[fromId];
    const to = state.territories[toId];
    const steps = path.length - 1;
    const plan = {
      id: `plan-${Date.now()}`,
      path,
      currentIndex: 0,
      targetOwnerId: to.ownerId,
      label: `${from.name} → ${to.name}`,
      createdMonth: state.month,
      status: 'active' as const,
    };
    const logEntry = `📋 行軍計画「${plan.label}」設定（${steps}ヶ月予定）`;
    set((s) => ({
      marchPlans: [...s.marchPlans, plan],
      ui: {
        ...s.ui,
        marchPlanMode: null,
        marchPlanPreview: null,
        log: [logEntry, ...s.ui.log].slice(0, 10),
      },
    }));
  },

  cancelMarchPlan: (planId) =>
    set((state) => ({
      marchPlans: state.marchPlans.map((p) =>
        p.id === planId ? { ...p, status: 'cancelled' as const, cancelReason: 'プレイヤーによるキャンセル' } : p,
      ),
    })),

  _executeMarchPlans: () => {
    const state = get();
    if (state.winnerId !== null) return;
    const activePlans = state.marchPlans.filter((p) => p.status === 'active');
    if (activePlans.length === 0) return;

    const player = Object.values(state.nations).find((n) => n.isPlayer)!;
    let workTerr = { ...state.territories };
    let workNations = { ...state.nations };
    let workChars = { ...state.characters };
    let workWinnerId: string | null = state.winnerId;
    const updatedPlans = state.marchPlans.map((p) => ({ ...p }));
    const logs: string[] = [];

    for (let i = 0; i < updatedPlans.length; i++) {
      const plan = updatedPlans[i];
      if (plan.status !== 'active') continue;

      const curId = plan.path[plan.currentIndex];
      const nextId = plan.path[plan.currentIndex + 1];
      const targetId = plan.path[plan.path.length - 1];

      const curTerr = workTerr[curId];
      const nextTerr = workTerr[nextId];
      const targetTerr = workTerr[targetId];

      // キャンセル判定
      if (!curTerr || curTerr.ownerId !== player.id) {
        updatedPlans[i] = { ...plan, status: 'cancelled', cancelReason: '出発地が制圧されました' };
        logs.push(`❌ 行軍計画「${plan.label}」キャンセル: ${curTerr?.name ?? curId}が制圧されました`);
        continue;
      }
      if (!targetTerr || targetTerr.ownerId === player.id) {
        updatedPlans[i] = { ...plan, status: 'done', cancelReason: '目標は既に自国領' };
        logs.push(`✅ 行軍計画「${plan.label}」: 目標${targetTerr?.name ?? ''}は既に自国領です`);
        continue;
      }
      // 中継地が敵に制圧されてルート封鎖
      const isNextEnemy = nextTerr.ownerId !== player.id;
      if (isNextEnemy && plan.currentIndex + 1 < plan.path.length - 1) {
        updatedPlans[i] = { ...plan, status: 'cancelled', cancelReason: 'ルートが塞がれました' };
        logs.push(`❌ 行軍計画「${plan.label}」キャンセル: ${nextTerr.name}がルートを塞ぎました`);
        continue;
      }
      const aliveTroops = curTerr.garrisonIds.filter((id) => (workChars[id]?.hp ?? 0) > 0);
      if (aliveTroops.length === 0) {
        updatedPlans[i] = { ...plan, status: 'cancelled', cancelReason: '兵力がいません' };
        logs.push(`❌ 行軍計画「${plan.label}」キャンセル: ${curTerr.name}に兵力がいません`);
        continue;
      }

      if (!isNextEnemy) {
        // 友軍領地への兵力移動
        const deadTroops = curTerr.garrisonIds.filter((id) => (workChars[id]?.hp ?? 0) <= 0);
        workTerr = {
          ...workTerr,
          [curId]: { ...curTerr, garrisonIds: deadTroops, hasActed: true },
          [nextId]: { ...nextTerr, garrisonIds: [...nextTerr.garrisonIds, ...aliveTroops] },
        };
        updatedPlans[i] = { ...plan, currentIndex: plan.currentIndex + 1 };
        logs.push(`🚶 行軍計画「${plan.label}」: ${curTerr.name} → ${nextTerr.name} へ移動`);
      } else {
        // 侵攻（自動解決）
        const workState: GameState = {
          ...state,
          territories: workTerr,
          nations: workNations,
          characters: workChars,
          winnerId: workWinnerId,
        };
        const result = resolveAutoBattle(workState, curId, nextId);
        const patch = applyStrategicBattleResult(workState, curId, nextId, result.winnerSide, result.survivingAttackerIds);
        // patch の最初のログエントリを転用
        if (patch.ui?.log?.[0]) logs.push(patch.ui.log[0]);
        workTerr = { ...workTerr, ...(patch.territories ?? {}) };
        workNations = { ...workNations, ...(patch.nations ?? {}) };
        if (patch.winnerId !== undefined && patch.winnerId !== null) workWinnerId = patch.winnerId;

        if (result.winnerSide === 'attacker') {
          const newIdx = plan.currentIndex + 1;
          if (newIdx >= plan.path.length - 1) {
            updatedPlans[i] = { ...plan, currentIndex: newIdx, status: 'done' };
            logs.push(`✅ 行軍計画「${plan.label}」完了！`);
          } else {
            updatedPlans[i] = { ...plan, currentIndex: newIdx };
          }
        } else {
          updatedPlans[i] = { ...plan, status: 'cancelled', cancelReason: `${nextTerr.name}攻略失敗` };
          logs.push(`❌ 行軍計画「${plan.label}」: ${nextTerr.name}の攻略に失敗`);
        }
      }
    }

    const curUiLog = get().ui.log;
    // 実績統計: 完了した行軍計画数
    const completedCount = updatedPlans.filter((p, i) => p.status === 'done' && get().marchPlans[i]?.status !== 'done').length;
    const curState = get();
    let extraStats: Partial<GameState> = {};
    if (completedCount > 0) {
      const newStatsMarch = { ...curState.playerStats, marchPlansCompleted: curState.playerStats.marchPlansCompleted + completedCount };
      const newUnlockedMarch = [...curState.unlockedAchievementIds];
      const newToastsMarch = [...curState.pendingAchievementToasts];
      checkNewAchievements(newStatsMarch, new Set(newUnlockedMarch)).forEach((id) => { newUnlockedMarch.push(id); newToastsMarch.push(id); });
      if (newUnlockedMarch.length > curState.unlockedAchievementIds.length) saveAchievements({ unlockedIds: newUnlockedMarch, stats: newStatsMarch });
      extraStats = { playerStats: newStatsMarch, unlockedAchievementIds: newUnlockedMarch, pendingAchievementToasts: newToastsMarch };
    }
    set({
      territories: workTerr,
      nations: workNations,
      characters: workChars,
      winnerId: workWinnerId,
      marchPlans: updatedPlans,
      ...extraStats,
      ui: {
        ...get().ui,
        log: [...logs, ...curUiLog].slice(0, 10),
      },
    });
  },

  // ── AI ────────────────────────────────────────────

  runTacticalAI: () => {
    const d = (ms: number) => get().fastForward ? Math.min(30, ms) : ms;
    const executeAIUnit = () => {
      const state = get();
      if (!state.battle || state.battle.pendingEnd !== null) {
        set({ isAIThinking: false });
        return;
      }

      const battle = state.battle;
      const currentId = battle.initiativeOrder[battle.initiativeIndex];
      const currentUnit = battle.units.find((u) => u.characterId === currentId);

      // 現在のユニットがプレイヤー側 or 存在しない → AI終了（autoTactical時はプレイヤー側も続行）
      if (!currentUnit || (currentUnit.side === battle.playerSide && !battle.autoTactical)) {
        set({ isAIThinking: false });
        return;
      }

      // 既に行動済みのユニット（エッジケース）はスキップして次へ
      if (currentUnit.hasActed) {
        get().endUnitTurn(currentUnit.characterId);
        setTimeout(() => {
          const s2 = get();
          if (!s2.battle || s2.battle.pendingEnd !== null) { set({ isAIThinking: false }); return; }
          const nextId = s2.battle.initiativeOrder[s2.battle.initiativeIndex];
          const nextUnit = s2.battle.units.find(u => u.characterId === nextId);
          if (nextUnit && (nextUnit.side !== s2.battle.playerSide || s2.battle.autoTactical)) {
            setTimeout(executeAIUnit, d(300));
          } else {
            set({ isAIThinking: false });
          }
        }, d(100));
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
              setTimeout(() => {
                const s2 = get();
                if (!s2.battle || s2.battle.pendingEnd !== null) { set({ isAIThinking: false }); return; }
                const nextId = s2.battle.initiativeOrder[s2.battle.initiativeIndex];
                const nextUnit = s2.battle.units.find(u => u.characterId === nextId);
                if (nextUnit && (nextUnit.side !== s2.battle.playerSide || s2.battle.autoTactical)) {
                  setTimeout(executeAIUnit, d(400));
                } else {
                  set({ isAIThinking: false });
                }
              }, d(700));
            } else {
              get().endUnitTurn(freshUnit.characterId);
              setTimeout(() => {
                const s2 = get();
                if (!s2.battle || s2.battle.pendingEnd !== null) { set({ isAIThinking: false }); return; }
                const nextId = s2.battle.initiativeOrder[s2.battle.initiativeIndex];
                const nextUnit = s2.battle.units.find(u => u.characterId === nextId);
                if (nextUnit && (nextUnit.side !== s2.battle.playerSide || s2.battle.autoTactical)) {
                  setTimeout(executeAIUnit, d(300));
                } else {
                  set({ isAIThinking: false });
                }
              }, d(100));
            }
          } else {
            const s2 = get();
            if (!s2.battle || s2.battle.pendingEnd !== null) { set({ isAIThinking: false }); return; }
            const nextId = s2.battle.initiativeOrder[s2.battle.initiativeIndex];
            const nextUnit = s2.battle.units.find((u) => u.characterId === nextId);
            if (nextUnit && (nextUnit.side !== s2.battle.playerSide || s2.battle.autoTactical)) {
              setTimeout(executeAIUnit, d(300));
            } else {
              set({ isAIThinking: false });
            }
          }
        }, d(400));
      } else if (action.type === 'attack') {
        get().attackUnit(action.attackerId, action.targetId);
        setTimeout(() => {
          const s2 = get();
          if (!s2.battle || s2.battle.pendingEnd !== null) { set({ isAIThinking: false }); return; }
          const nextId = s2.battle.initiativeOrder[s2.battle.initiativeIndex];
          const nextUnit = s2.battle.units.find(u => u.characterId === nextId);
          if (nextUnit && (nextUnit.side !== s2.battle.playerSide || s2.battle.autoTactical)) {
            setTimeout(executeAIUnit, d(500));
          } else {
            set({ isAIThinking: false });
          }
        }, d(700));
      } else if (action.type === 'skill') {
        // スキル使用 → ジョブ別に処理分岐
        get().useSkill(currentUnit.characterId);
        setTimeout(() => {
          const s = get();
          if (!s.battle || s.battle.pendingEnd !== null) { set({ isAIThinking: false }); return; }
          const jobId = s.characters[currentUnit.characterId]?.jobId;

          if (jobId === 'warrior') {
            // 渾身撃: ターン未消費 → 続けて攻撃
            const freshUnit = s.battle.units.find((u) => u.characterId === currentUnit.characterId);
            if (!freshUnit || freshUnit.hasActed) {
              const nextId = s.battle.initiativeOrder[s.battle.initiativeIndex];
              const nextUnit = s.battle.units.find((u) => u.characterId === nextId);
              if (nextUnit && (nextUnit.side !== s.battle.playerSide || s.battle.autoTactical)) setTimeout(executeAIUnit, d(300));
              else set({ isAIThinking: false });
              return;
            }
            const freshCh = s.characters[freshUnit.characterId];
            const targets = getAttackTargets(freshUnit, freshCh, s.battle.units);
            if (targets.length > 0) {
              get().attackUnit(freshUnit.characterId, targets.sort((a, b) => {
                const ua = s.battle!.units.find((u) => u.characterId === a)!;
                const ub = s.battle!.units.find((u) => u.characterId === b)!;
                return ua.currentHp - ub.currentHp;
              })[0]);
              setTimeout(() => {
                const s2 = get();
                if (!s2.battle || s2.battle.pendingEnd !== null) { set({ isAIThinking: false }); return; }
                const nextId = s2.battle.initiativeOrder[s2.battle.initiativeIndex];
                const nextUnit = s2.battle.units.find((u) => u.characterId === nextId);
                if (nextUnit && (nextUnit.side !== s2.battle.playerSide || s2.battle.autoTactical)) setTimeout(executeAIUnit, d(400));
                else set({ isAIThinking: false });
              }, d(700));
            } else {
              get().endUnitTurn(freshUnit.characterId);
              setTimeout(() => {
                const s2 = get();
                if (!s2.battle || s2.battle.pendingEnd !== null) { set({ isAIThinking: false }); return; }
                const nextId = s2.battle.initiativeOrder[s2.battle.initiativeIndex];
                const nextUnit = s2.battle.units.find((u) => u.characterId === nextId);
                if (nextUnit && (nextUnit.side !== s2.battle.playerSide || s2.battle.autoTactical)) setTimeout(executeAIUnit, d(300));
                else set({ isAIThinking: false });
              }, d(100));
            }
          } else if (s.battle.skillMode && action.targetId) {
            // 槍士・弓師: skillMode に入ったので executeSkill でターゲットを攻撃
            get().executeSkill(currentUnit.characterId, action.targetId);
            setTimeout(() => {
              const s2 = get();
              if (!s2.battle || s2.battle.pendingEnd !== null) { set({ isAIThinking: false }); return; }
              const nextId = s2.battle.initiativeOrder[s2.battle.initiativeIndex];
              const nextUnit = s2.battle.units.find((u) => u.characterId === nextId);
              if (nextUnit && (nextUnit.side !== s2.battle.playerSide || s2.battle.autoTactical)) setTimeout(executeAIUnit, d(400));
              else set({ isAIThinking: false });
            }, d(700));
          } else {
            // 盾士・魔術師: ターン自動進行済み
            const nextId = s.battle.initiativeOrder[s.battle.initiativeIndex];
            const nextUnit = s.battle.units.find((u) => u.characterId === nextId);
            if (nextUnit && (nextUnit.side !== s.battle.playerSide || s.battle.autoTactical)) setTimeout(executeAIUnit, d(300));
            else set({ isAIThinking: false });
          }
        }, d(400));
      } else {
        get().endUnitTurn(currentUnit.characterId);
        setTimeout(() => {
          const s2 = get();
          if (!s2.battle || s2.battle.pendingEnd !== null) { set({ isAIThinking: false }); return; }
          const nextId = s2.battle.initiativeOrder[s2.battle.initiativeIndex];
          const nextUnit = s2.battle.units.find(u => u.characterId === nextId);
          if (nextUnit && (nextUnit.side !== s2.battle.playerSide || s2.battle.autoTactical)) {
            setTimeout(executeAIUnit, d(300));
          } else {
            set({ isAIThinking: false });
          }
        }, d(100));
      }
    };

    setTimeout(executeAIUnit, d(500));
  },

  _runStrategicAI: (nationIds, idx) => {
    const d = (ms: number) => get().fastForward ? Math.min(30, ms) : ms;

    if (idx >= nationIds.length) {
      const s = get();
      if (s.autoPlay && !s.winnerId) {
        // プレイヤー国もAIとして動かして自動月送り
        const player = Object.values(s.nations).find((n) => n.isPlayer)!;
        if (!player.defeated) {
          // 資金が許す限り傭兵を積極的に雇用
          const autoHireMercs = () => {
            const cur = get();
            const curPlayer = Object.values(cur.nations).find((n) => n.isPlayer)!;
            const affordable = cur.mercPool
              .filter((m) => curPlayer.gold >= m.cost)
              .sort((a, b) => b.cost - a.cost);
            for (const merc of affordable) {
              const cp = Object.values(get().nations).find((n) => n.isPlayer)!;
              if (cp.gold < merc.cost) break;
              get().hireMercenary(merc.id);
            }
          };
          autoHireMercs();

          const transfers = decideAITransfers(player.id, get());
          if (transfers.length > 0) {
            const updTerr = { ...get().territories };
            for (const tr of transfers) {
              const from = updTerr[tr.fromId];
              const to = updTerr[tr.toId];
              updTerr[tr.fromId] = { ...from, garrisonIds: from.garrisonIds.filter((id) => !tr.charIds.includes(id)), hasActed: true };
              updTerr[tr.toId] = { ...to, garrisonIds: [...to.garrisonIds, ...tr.charIds] };
            }
            set({ territories: updTerr });
          }
          const action = decideAINationAction(player.id, get());
          if (action.type === 'invade') {
            const freshS = get();
            const result = resolveAutoBattle(freshS, action.fromId, action.toId);
            const patch = applyStrategicBattleResult(freshS, action.fromId, action.toId, result.winnerSide, result.survivingAttackerIds);
            set(patch as Partial<GameState & GameActions>);
          }
        }
        setTimeout(() => get().endPlayerTurn(), d(500));
        return;
      }
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
        // 防衛側が無人 or 全員回復中（hp=0）なら無血占領
        const alivePlayerDefs = state.territories[toId].garrisonIds.filter(
          (id) => state.characters[id]?.hp > 0,
        );
        if (alivePlayerDefs.length === 0) {
          const aliveAtkIds = state.territories[fromId].garrisonIds.filter(
            (id) => state.characters[id]?.hp > 0,
          );
          const patch = applyStrategicBattleResult(state, fromId, toId, 'attacker', aliveAtkIds);
          set(patch as Partial<GameState & GameActions>);
          setTimeout(() => get()._runStrategicAI(nationIds, idx + 1), d(600));
          return;
        }
        // autoPlay 中は戦術マップを経由せず自動解決
        if (get().autoPlay) {
          const result = resolveAutoBattle(state, fromId, toId);
          const patch = applyStrategicBattleResult(state, fromId, toId, result.winnerSide, result.survivingAttackerIds);
          set(patch as Partial<GameState & GameActions>);
          setTimeout(() => get()._runStrategicAI(nationIds, idx + 1), d(600));
          return;
        }
        get().executeAIInvasion(fromId, toId);
        setTimeout(() => {
          set({ isAIThinking: true });
          get().runTacticalAI();
        }, d(600));
        return;
      }

      const result = resolveAutoBattle(state, fromId, toId);
      const patch = applyStrategicBattleResult(state, fromId, toId, result.winnerSide, result.survivingAttackerIds);
      set(patch as Partial<GameState & GameActions>);
      setTimeout(() => get()._runStrategicAI(nationIds, idx + 1), d(600));
    } else {
      setTimeout(() => get()._runStrategicAI(nationIds, idx + 1), d(200));
    }
  },
}));

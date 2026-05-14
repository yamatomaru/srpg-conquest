import type { PlayerStats } from '../game/types';

// ============================================================
// 実績定義
// ============================================================

export interface AchievementDef {
  id: string;
  icon: string;
  title: string;
  description: string;
  points: number;
  hidden?: boolean;
  check: (stats: PlayerStats) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_blood',
    icon: '⚔',
    title: '初陣',
    description: '初めて戦闘に勝利する',
    points: 10,
    check: (s) => s.battlesWon >= 1,
  },
  {
    id: 'ten_kills',
    icon: '💀',
    title: '歴戦の勇者',
    description: '累計10体撃破',
    points: 15,
    check: (s) => s.unitsDefeated >= 10,
  },
  {
    id: 'fifty_kills',
    icon: '☠',
    title: '百戦錬磨',
    description: '累計50体撃破',
    points: 30,
    check: (s) => s.unitsDefeated >= 50,
  },
  {
    id: 'conqueror',
    icon: '👑',
    title: '天下統一',
    description: '全土を統一してゲームに勝利する',
    points: 50,
    check: (s) => s.gamesWon >= 1,
  },
  {
    id: 'three_wins',
    icon: '🏆',
    title: '常勝将軍',
    description: 'ゲームを3回クリアする',
    points: 50,
    check: (s) => s.gamesWon >= 3,
  },
  {
    id: 'speed_victory',
    icon: '⚡',
    title: '電光石火',
    description: '3ターン以内に戦闘勝利する',
    points: 20,
    check: (s) => s.fastBattleWins >= 1,
  },
  {
    id: 'perfect_victory',
    icon: '🛡',
    title: '鉄壁',
    description: '戦闘開始時の全ユニットが生存したまま勝利する',
    points: 20,
    check: (s) => s.perfectBattleWins >= 1,
  },
  {
    id: 'no_loss_win',
    icon: '💎',
    title: '無敵将軍',
    description: '一度も戦闘に敗北せずにゲームをクリアする',
    points: 60,
    check: (s) => s.noLossWins >= 1,
  },
  {
    id: 'level5',
    icon: '⭐',
    title: '武将',
    description: 'キャラクターをLv5に育てる',
    points: 15,
    check: (s) => s.maxLevelReached >= 5,
  },
  {
    id: 'level10',
    icon: '🌟',
    title: '名将',
    description: 'キャラクターをLv10に育てる',
    points: 30,
    check: (s) => s.maxLevelReached >= 10,
  },
  {
    id: 'gold1000',
    icon: '💰',
    title: '富豪',
    description: '一度に1000ゴールド以上所持する',
    points: 20,
    check: (s) => s.maxGoldHeld >= 1000,
  },
  {
    id: 'ten_territories',
    icon: '🗺',
    title: '大国',
    description: '累計10領地を占領する',
    points: 25,
    check: (s) => s.territoriesCaptured >= 10,
  },
  {
    id: 'merc5',
    icon: '🎪',
    title: '傭兵王',
    description: '累計5人の傭兵を雇用する',
    points: 15,
    check: (s) => s.mercenariesHired >= 5,
  },
  {
    id: 'march5',
    icon: '🚶',
    title: '行軍家',
    description: '行軍計画を5回完了する',
    points: 20,
    check: (s) => s.marchPlansCompleted >= 5,
  },
  {
    id: 'power_kill',
    icon: '💥',
    title: '渾身の一撃',
    description: '渾身撃で敵ユニットを撃破する',
    points: 15,
    check: (s) => s.powerAttackKills >= 1,
  },
  {
    id: 'aoe_triple',
    icon: '🔮',
    title: '魔法嵐',
    description: '全体魔法で3体以上同時撃破する',
    points: 25,
    check: (s) => s.aoeTripleKills >= 1,
  },
  {
    id: 'survive30',
    icon: '📅',
    title: '乱世の生き証人',
    description: '30ヶ月生き残る',
    points: 20,
    check: (s) => s.maxMonthSurvived >= 30,
  },
  {
    id: 'ten_wins',
    icon: '🎖',
    title: '百戦百勝',
    description: '戦闘に累計10回勝利する',
    points: 25,
    check: (s) => s.battlesWon >= 10,
  },
  {
    id: 'alliance',
    icon: '🤝',
    title: '外交官',
    description: '他国と同盟を締結する',
    points: 10,
    check: (s) => s.alliancesFormed >= 1,
  },
  {
    id: 'first_loss',
    icon: '😢',
    title: '不覚',
    description: '初めて戦闘に敗北する',
    points: 5,
    hidden: true,
    check: (s) => s.battlesLost >= 1,
  },
];

/** IDで実績定義を引くマップ */
export const ACHIEVEMENT_MAP: Record<string, AchievementDef> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a]),
);

/** 新たに解除された実績IDリストを返す */
export function checkNewAchievements(
  stats: PlayerStats,
  alreadyUnlocked: Set<string>,
): string[] {
  return ACHIEVEMENTS
    .filter((a) => !alreadyUnlocked.has(a.id) && a.check(stats))
    .map((a) => a.id);
}

/** 合計実績ポイントを計算 */
export function calcTotalPoints(unlockedIds: string[]): number {
  return unlockedIds.reduce((sum, id) => sum + (ACHIEVEMENT_MAP[id]?.points ?? 0), 0);
}

// ============================================================
// localStorage 永続化
// ============================================================

const STORAGE_KEY = 'srpg-conquest-achievements-v1';

export interface PersistedAchievements {
  unlockedIds: string[];
  stats: PlayerStats;
}

export function loadAchievements(): PersistedAchievements {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as PersistedAchievements;
  } catch { /* ignore */ }
  return { unlockedIds: [], stats: defaultStats() };
}

export function saveAchievements(data: PersistedAchievements): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

export function defaultStats(): PlayerStats {
  return {
    battlesWon: 0,
    battlesLost: 0,
    unitsDefeated: 0,
    gamesWon: 0,
    fastBattleWins: 0,
    perfectBattleWins: 0,
    noLossWins: 0,
    maxLevelReached: 1,
    maxGoldHeld: 0,
    territoriesCaptured: 0,
    mercenariesHired: 0,
    marchPlansCompleted: 0,
    powerAttackKills: 0,
    aoeTripleKills: 0,
    maxMonthSurvived: 0,
    alliancesFormed: 0,
  };
}

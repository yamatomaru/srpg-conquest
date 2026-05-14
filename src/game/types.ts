// ============================================================
// ゲーム設定
// ============================================================

export type Difficulty = 'easy' | 'normal' | 'hard';

// ============================================================
// ジョブ・キャラクター
// ============================================================

export type JobId = 'shielder' | 'warrior' | 'spearman' | 'archer' | 'mage' | 'knight' | 'priest';

export type TerrainType = 'plain' | 'forest' | 'mountain' | 'fortress';

export interface Job {
  id: JobId;
  name: string;
  description: string;
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  baseMatk: number;  // 魔法攻撃力
  baseMdef: number;  // 魔法防御力
  baseMov: number;   // 移動力（マス数）兼行動速度
  baseRange: number; // 攻撃射程（マンハッタン距離）
  spritePath: string;
  skillId: string;   // 特殊スキルID
  skillName: string; // 特殊スキル表示名
}

export interface Character {
  id: string;
  name: string;
  jobId: JobId;
  level: number;
  exp: number;       // 経験値
  hp: number;        // 現在HP
  maxHp: number;
  atk: number;
  def: number;
  matk: number;      // 魔法攻撃力
  mdef: number;      // 魔法防御力
  mov: number;
  range: number;
  spritePath?: string;
  // 装備スロット
  equippedWeaponId?: string;
  equippedArmorId?: string;
  equippedAccessoryId?: string;
}

// ============================================================
// 国家・領地（戦略マップ）
// ============================================================

export interface Nation {
  id: string;
  name: string;
  color: string;
  faction: string;        // 朱雀/青龍/玄武/黄竜/白虎
  rulerId: string;
  capitalTerritoryId: string; // 本拠地（戦闘不能キャラの帰還先）
  characterIds: string[];
  gold: number;
  isPlayer: boolean;
  defeated: boolean;
}

export interface Territory {
  id: string;
  name: string;
  ownerId: string;
  garrisonIds: string[];
  adjacentTo: string[];
  position: { x: number; y: number }; // グリッド座標 (col, row)
  income: number;
  hasActed: boolean;
  building?: BuildingType; // 建設済み建築物
}

// ============================================================
// UI状態
// ============================================================

export interface InvasionPending {
  fromTerritoryId: string;
  toTerritoryId: string;
}

export type ActivePanel = 'none' | 'troops' | 'diplomacy' | 'mercenary' | 'objectives' | 'simulation' | 'shop' | 'achievements' | 'domestic';

// ============================================================
// 内政・建築
// ============================================================

export type BuildingType = 'market' | 'barracks' | 'fortress';

export interface BuildingDef {
  id: BuildingType;
  name: string;
  icon: string;
  cost: number;
  description: string;
  /** 収入ボーナス（毎月加算） */
  incomeBonus: number;
  /** 自動戦闘の防御側パワー倍率 */
  defenderMult: number;
}

export interface UISelection {
  selectedTerritoryId: string | null;
  invasionMode: { fromTerritoryId: string } | null;
  invasionPending: InvasionPending | null;
  transferMode: { fromTerritoryId: string } | null;
  transferPending: { fromTerritoryId: string; toTerritoryId: string } | null;
  marchPlanMode: { fromTerritoryId: string } | null;
  marchPlanPreview: { fromId: string; toId: string; path: string[] } | null;
  gameOverShown: boolean;
  log: string[];
  activePanel: ActivePanel;
}

// ============================================================
// 行軍計画
// ============================================================

export interface MarchPlan {
  id: string;
  path: string[];          // [fromId, ...中継地, targetId]
  currentIndex: number;    // 現在兵力がいる path のインデックス
  targetOwnerId: string;   // 計画作成時点のターゲット所有国ID（変化検知用）
  label: string;           // 表示名 "A → B"
  createdMonth: number;
  status: 'active' | 'done' | 'cancelled';
  cancelReason?: string;
}

// ============================================================
// 外交・傭兵・イベント・目標
// ============================================================

export type DiplomaticStatus = 'neutral' | 'alliance' | 'war';

export interface DiplomacyRelation {
  status: DiplomaticStatus;
  turnsLeft: number; // 同盟残り月数（0=永続以外）
}

export interface GameEvent {
  title: string;
  description: string;
  effectDesc: string;
}

export interface Objective {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

export interface MercTemplate {
  id: string;
  name: string;
  jobId: JobId;
  level: number;
  cost: number; // 雇用コスト（gold）
  faction: string; // 所属勢力（朱雀/青龍/玄武/黄竜/白虎）
  isMCH?: boolean; // MyCryptoHeroesヒーロー
  iconEmoji?: string; // MCHヒーロー用の絵文字アイコン（フォールバック）
  imageUrl?: string; // MCHヒーロー肖像画URL
}

// ============================================================
// 戦闘（戦術マップ）
// ============================================================

export type Side = 'attacker' | 'defender';

export interface BattleUnit {
  characterId: string;
  side: Side;
  position: { x: number; y: number };
  currentHp: number;
  hasMoved: boolean;
  hasActed: boolean;
  usedSkill: boolean; // スキル使用済み
}

export interface TacticalMap {
  width: number;
  height: number;
  terrain: TerrainType[][]; // [y][x]
}

export interface BattleLogEntry {
  attackerName: string;
  defenderName: string;
  damage: number;
  defeated: boolean;
  defenderPos: { x: number; y: number };
  levelUp?: boolean;    // 攻撃者がレベルアップした
  newLevel?: number;    // レベルアップ後のレベル
  terrainType?: TerrainType;  // 防御側の地形
  terrainBonus?: number;      // 地形による防御補正値（>0 なら軽減あり）
}

export interface BattleState {
  attackerNationId: string;
  defenderNationId: string;
  fromTerritoryId: string;
  territoryId: string;
  map: TacticalMap;
  units: BattleUnit[];
  originalAttackerIds: string[];  // 戦闘開始時の攻撃側ID（生死問わず）
  originalDefenderIds: string[];  // 戦闘開始時の防衛側ID（生死問わず）
  // イニシアチブ順ターン制
  initiativeOrder: string[];   // characterId の速度順リスト（高MOV→先攻）
  initiativeIndex: number;     // 現在の行動ユニットインデックス
  turnCount: number;           // 経過ラウンド数
  selectedUnitId: string | null;
  reachableCells: { x: number; y: number }[];
  attackTargets: string[];
  recentLog: BattleLogEntry[];
  pendingEnd: Side | null;
  playerSide: Side;
  maxTurns: number;
  // スキルシステム
  skillMode: boolean;          // スキルターゲット選択中
  skillTargets: string[];      // スキルで狙えるユニットID
  activeBuffs: Record<string, { def?: number; mdef?: number }>; // 一時バフ（unitId→加算値）
  powerAttackIds: string[];    // 渾身撃 発動済みユニット（次攻撃2倍）
  // オートバトル
  autoTactical: boolean;       // 戦術マップをAIに全委任
  // ワンクリック攻撃用: 移動後に攻撃可能な敵IDセット（プレイヤーターン時に計算）
  quickAttackTargets: string[];
}

// ============================================================
// ゲーム全体状態
// ============================================================

export type GamePhase =
  | 'setup'
  | 'campaign_select'
  | 'campaign_briefing'
  | 'campaign_debrief'
  | 'map_editor'
  | 'strategic'
  | 'tactical'
  | 'gameOver';

// ============================================================
// キャンペーン
// ============================================================

export type ScenarioVictoryType = 'defeat_all' | 'capture_capital' | 'control_n' | 'survive_turns';

export interface ScenarioVictory {
  type: ScenarioVictoryType;
  targetNationId?: string; // capture_capital
  count?: number;          // control_n
  turns?: number;          // survive_turns
  description: string;
}

export interface CampaignScenario {
  id: string;
  chapter: number;
  title: string;
  description: string;
  briefing: string;        // ストーリーテキスト
  // 初期状態の上書き（nationId→ownerId, territoryId→ownerId）
  playerTerritoryIds: string[]; // プレイヤーが最初に持つ領地
  playerGold: number;
  victory: ScenarioVictory;
  rewards: { goldBonus: number; expBonus: number };
}

export interface Campaign {
  id: string;
  title: string;
  description: string;
  scenarios: CampaignScenario[];
}

export interface CampaignProgress {
  campaignId: string;
  scenarioIndex: number;
  playerNationId: string;
  // charId → {level, exp} 引き継ぎデータ
  carryOver: Record<string, { level: number; exp: number }>;
}

// ============================================================
// マップエディタ
// ============================================================

export interface EditorCell {
  id: string;         // "col_row"
  name: string;
  ownerId: string;
  income: number;
  isCapital: boolean;
}

export interface EditorNation {
  id: string;
  name: string;
  color: string;
  faction: string;
  gold: number;
}

export interface EditorMap {
  id: string;
  mapName: string;
  cols: number;
  rows: number;
  cells: Record<string, EditorCell>;   // "col,row" → cell
  adjacency: string[];                 // "id1|id2" sorted
  nations: Record<string, EditorNation>;
}

// ============================================================
// 実績・プレイ統計
// ============================================================

/** ゲームをまたいで累積するプレイ統計 */
export interface PlayerStats {
  battlesWon: number;
  battlesLost: number;
  unitsDefeated: number;
  gamesWon: number;
  fastBattleWins: number;       // 3ターン以内勝利
  perfectBattleWins: number;    // 全員生存勝利
  noLossWins: number;           // 1度も負けずにゲームクリア
  maxLevelReached: number;
  maxGoldHeld: number;
  territoriesCaptured: number;
  mercenariesHired: number;
  marchPlansCompleted: number;
  powerAttackKills: number;
  aoeTripleKills: number;
  maxMonthSurvived: number;
  alliancesFormed: number;
}

// ============================================================
// ゲーム全体状態
// ============================================================

export interface RecruitOffer {
  nationId: string;
  nationName: string;
  charIds: string[];        // 招集候補キャラID（最大5名）
  recruitedCount: number;   // 今回すでに仲間にした数
}

export interface GameState {
  phase: GamePhase;
  month: number;
  currentNationId: string;
  nations: Record<string, Nation>;
  territories: Record<string, Territory>;
  characters: Record<string, Character>;
  battle: BattleState | null;
  winnerId: string | null;
  isAIThinking: boolean;
  autoPlay: boolean;       // AI が player 側も操作
  fastForward: boolean;    // 全AIディレイを短縮
  actedCharIds: string[];   // 今月移動済み（兵力移動済み）のキャラ
  // 外交・傭兵・イベント・目標
  relations: Record<string, DiplomacyRelation>; // nationId → 外交関係
  objectives: Objective[];
  mercPool: MercTemplate[];        // 今月採用可能な傭兵
  mercDurations: Record<string, number>; // charId → 残り月数（0=雇用期間終了）
  currentEvent: GameEvent | null;  // 今月のランダムイベント（表示後null）
  recruitOffer: RecruitOffer | null; // 敗北国から兵士を勧誘するオファー
  marchPlans: MarchPlan[];           // 行軍計画リスト
  // アイテム・装備
  playerInventory: Record<string, number>;  // itemId → 所持数
  // キャンペーン
  campaignProgress: CampaignProgress | null;
  campaignScenario: CampaignScenario | null;
  ui: UISelection;
  // 実績・統計（localStorage に永続保存）
  playerStats: PlayerStats;
  unlockedAchievementIds: string[];
  pendingAchievementToasts: string[];  // 解除されたが未表示のID
  currentGameLosses: number;           // 今回のゲームでの敗北回数（no_loss判定用）
}

// ============================================================
// ジョブ・キャラクター
// ============================================================

export type JobId = 'warrior' | 'archer' | 'mage';

export interface Job {
  id: JobId;
  name: string;
  description: string;
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  baseMov: number;   // 移動力（マス数）
  baseRange: number; // 攻撃射程（マンハッタン距離）
  spritePath: string;
}

export interface Character {
  id: string;
  name: string;
  jobId: JobId;
  level: number;
  hp: number;        // 現在HP
  maxHp: number;
  atk: number;
  def: number;
  mov: number;
  range: number;
}

// ============================================================
// 国家・領地（戦略マップ）
// ============================================================

export interface Nation {
  id: string;
  name: string;
  color: string;          // SVGマップ表示色
  rulerId: string;        // 君主のキャラクターID
  characterIds: string[]; // 所属キャラクター
  gold: number;
  isPlayer: boolean;
  defeated: boolean;
}

export interface Territory {
  id: string;
  name: string;
  ownerId: string;          // 所有国ID
  garrisonIds: string[];    // 駐留キャラクターID
  adjacentTo: string[];     // 隣接領地ID
  position: { x: number; y: number }; // SVGマップ座標
  income: number;           // 月収入
  hasActed: boolean;        // 月内に侵攻アクションを実行済みか
}

// ============================================================
// UI状態
// ============================================================

export interface UISelection {
  selectedTerritoryId: string | null;
  invasionMode: { fromTerritoryId: string } | null;
  gameOverShown: boolean;
  log: string[]; // 直近の行動ログ（最大5件）
}

// ============================================================
// 戦闘（戦術マップ）
// ============================================================

export type Side = 'attacker' | 'defender';

export interface BattleUnit {
  characterId: string;
  side: Side;
  position: { x: number; y: number }; // グリッド座標
  currentHp: number;
  hasMoved: boolean;
  hasActed: boolean;
}

export interface TacticalMap {
  width: number;
  height: number;
  // MVP では地形なし（全マス平地）
}

export interface BattleState {
  attackerNationId: string;
  defenderNationId: string;
  fromTerritoryId: string;    // 攻撃元領地
  territoryId: string;        // 争奪対象領地
  map: TacticalMap;
  units: BattleUnit[];
  currentSide: Side;
  turnCount: number;
  selectedUnitId: string | null;
  reachableCells: { x: number; y: number }[];
  maxTurns: number;
}

// ============================================================
// ゲーム全体状態
// ============================================================

export type GamePhase = 'strategic' | 'tactical' | 'gameOver';

export interface GameState {
  phase: GamePhase;
  month: number;
  currentNationId: string;
  nations: Record<string, Nation>;
  territories: Record<string, Territory>;
  characters: Record<string, Character>;
  battle: BattleState | null;
  winnerId: string | null;
  ui: UISelection;
}

import type { MercTemplate } from '../game/types';

const CDN = 'https://d2fvodbijouf8s.cloudfront.net/images/heroes/64';

// 通常傭兵（勢力問わず雇用可能、月ごとローテーション）
const BASE_MERCS: MercTemplate[] = [
  { id: 'merc_1', name: '流れ者ガルデン',   jobId: 'warrior',  level: 3, cost: 150, faction: '朱雀' },
  { id: 'merc_2', name: '弓の達人イシャ',   jobId: 'archer',   level: 3, cost: 140, faction: '朱雀' },
  { id: 'merc_3', name: '老魔道士バルモア', jobId: 'mage',     level: 4, cost: 200, faction: '青龍' },
  { id: 'merc_4', name: '傭兵槍士クロン',   jobId: 'spearman', level: 2, cost: 100, faction: '青龍' },
  { id: 'merc_5', name: '鉄壁の盾士ドガン', jobId: 'shielder', level: 4, cost: 180, faction: '玄武' },
  { id: 'merc_6', name: '女剣士サラシア',   jobId: 'warrior',  level: 5, cost: 250, faction: '玄武' },
  { id: 'merc_7', name: '暗弓師テレス',     jobId: 'archer',   level: 5, cost: 240, faction: '黄竜' },
  { id: 'merc_8', name: '魔術師ゼノン',     jobId: 'mage',     level: 3, cost: 160, faction: '黄竜' },
  { id: 'merc_9', name: '槍姫アデラ',       jobId: 'spearman', level: 5, cost: 230, faction: '白虎' },
  { id: 'merc_a', name: '古豪シールダス',   jobId: 'shielder', level: 3, cost: 130, faction: '白虎' },
];

// MyCryptoHeroes ヒーロー傭兵
// 雇用できるのは【プレイヤーと同一勢力】のヒーローのみ
export const MCH_MERCS: MercTemplate[] = [
  // ── 朱雀 ──────────────────────────────────────
  {
    id: 'mch_01', name: 'アレクサンドロス大王', jobId: 'warrior',  level: 7, cost: 450, faction: '朱雀',
    isMCH: true, iconEmoji: '🏛', imageUrl: `${CDN}/4050.png`,
  },
  {
    id: 'mch_02', name: 'ユリウス・カエサル', jobId: 'shielder', level: 5, cost: 280, faction: '朱雀',
    isMCH: true, iconEmoji: '🦅', imageUrl: `${CDN}/3031.png`,
  },
  {
    id: 'mch_03', name: 'ハンニバル',         jobId: 'warrior',  level: 6, cost: 350, faction: '朱雀',
    isMCH: true, iconEmoji: '🐘', imageUrl: `${CDN}/4034.png`,
  },
  {
    id: 'mch_04', name: 'ブーディカ',         jobId: 'spearman', level: 6, cost: 340, faction: '朱雀',
    isMCH: true, iconEmoji: '🔥', imageUrl: `${CDN}/4042.png`,
  },
  // ── 青龍 ──────────────────────────────────────
  {
    id: 'mch_05', name: 'クレオパトラ',       jobId: 'mage',     level: 6, cost: 360, faction: '青龍',
    isMCH: true, iconEmoji: '🐍', imageUrl: `${CDN}/4049.png`,
  },
  {
    id: 'mch_06', name: 'ニコラ・テスラ',     jobId: 'mage',     level: 5, cost: 290, faction: '青龍',
    isMCH: true, iconEmoji: '⚡', imageUrl: `${CDN}/4017.png`,
  },
  {
    id: 'mch_07', name: '卑弥呼',             jobId: 'mage',     level: 7, cost: 480, faction: '青龍',
    isMCH: true, iconEmoji: '🌙', imageUrl: `${CDN}/4043.png`,
  },
  {
    id: 'mch_08', name: 'フランシス・ドレーク', jobId: 'archer',  level: 5, cost: 270, faction: '青龍',
    isMCH: true, iconEmoji: '⛵', imageUrl: `${CDN}/4037.png`,
  },
  // ── 玄武 ──────────────────────────────────────
  {
    id: 'mch_09', name: '源義経',             jobId: 'archer',   level: 6, cost: 330, faction: '玄武',
    isMCH: true, iconEmoji: '🏹', imageUrl: `${CDN}/4056.png`,
  },
  {
    id: 'mch_10', name: '武田信玄',           jobId: 'warrior',  level: 7, cost: 460, faction: '玄武',
    isMCH: true, iconEmoji: '🐯', imageUrl: `${CDN}/3030.png`,
  },
  {
    id: 'mch_11', name: '上杉謙信',           jobId: 'spearman', level: 6, cost: 350, faction: '玄武',
    isMCH: true, iconEmoji: '⛩', imageUrl: `${CDN}/4003.png`,
  },
  {
    id: 'mch_12', name: '宮本武蔵',           jobId: 'warrior',  level: 7, cost: 460, faction: '玄武',
    isMCH: true, iconEmoji: '⚔', imageUrl: `${CDN}/11008.png`,
  },
  // ── 黄竜 ──────────────────────────────────────
  {
    id: 'mch_13', name: 'チンギス・ハン',     jobId: 'spearman', level: 7, cost: 470, faction: '黄竜',
    isMCH: true, iconEmoji: '🐎', imageUrl: `${CDN}/4045.png`,
  },
  {
    id: 'mch_14', name: '諸葛亮',             jobId: 'mage',     level: 6, cost: 360, faction: '黄竜',
    isMCH: true, iconEmoji: '📜', imageUrl: `${CDN}/4048.png`,
  },
  {
    id: 'mch_15', name: '関羽',               jobId: 'warrior',  level: 6, cost: 340, faction: '黄竜',
    isMCH: true, iconEmoji: '🌙', imageUrl: `${CDN}/4009.png`,
  },
  {
    id: 'mch_16', name: '趙雲',               jobId: 'spearman', level: 5, cost: 290, faction: '黄竜',
    isMCH: true, iconEmoji: '🐉', imageUrl: `${CDN}/3011.png`,
  },
  // ── 白虎 ──────────────────────────────────────
  {
    id: 'mch_17', name: 'ランスロット',       jobId: 'shielder', level: 7, cost: 480, faction: '白虎',
    isMCH: true, iconEmoji: '⚜', imageUrl: `${CDN}/4030.png`,
  },
  {
    id: 'mch_18', name: 'スキピオ・アフリカヌス', jobId: 'warrior', level: 6, cost: 350, faction: '白虎',
    isMCH: true, iconEmoji: '🏰', imageUrl: `${CDN}/11006.png`,
  },
  {
    id: 'mch_19', name: '巴御前',             jobId: 'spearman', level: 6, cost: 360, faction: '白虎',
    isMCH: true, iconEmoji: '🛡', imageUrl: `${CDN}/3006.png`,
  },
  {
    id: 'mch_20', name: '那須与一',           jobId: 'archer',   level: 5, cost: 280, faction: '白虎',
    isMCH: true, iconEmoji: '🎯', imageUrl: `${CDN}/11001.png`,
  },
];

export const MERC_POOL: MercTemplate[] = [...BASE_MERCS, ...MCH_MERCS];

/**
 * 今月の傭兵プールを返す
 * - 同一勢力のMCHヒーロー全員を表示
 * - 勢力未定の場合は全勢力のMCHヒーローをローテーション表示
 */
export function pickMercPool(_month: number, playerFaction?: string): MercTemplate[] {
  if (playerFaction) {
    return MCH_MERCS.filter((m) => m.faction === playerFaction);
  }
  // 勢力未定の場合は通常傭兵をフォールバック表示
  return BASE_MERCS.slice(0, 4);
}

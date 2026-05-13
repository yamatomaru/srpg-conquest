import type { MercTemplate } from '../game/types';

const CDN = 'https://d2fvodbijouf8s.cloudfront.net/images/heroes/64';

// 通常傭兵（勢力問わず雇用可能）
const BASE_MERCS: MercTemplate[] = [
  // Lv2 ～ 低コスト入門
  { id: 'merc_b1', name: '新米盾士ゴルド',     jobId: 'shielder', level: 2, cost:  80, faction: '玄武' },
  { id: 'merc_b2', name: '流浪の剣士ライン',   jobId: 'warrior',  level: 2, cost:  80, faction: '朱雀' },
  { id: 'merc_b3', name: '旅する槍士ノア',     jobId: 'spearman', level: 2, cost:  70, faction: '黄竜' },
  { id: 'merc_b4', name: '狩人アーウィン',     jobId: 'archer',   level: 2, cost:  70, faction: '白虎' },
  { id: 'merc_b5', name: '見習い魔術師ルシア', jobId: 'mage',     level: 2, cost:  80, faction: '青龍' },
  // Lv3 ～ 中堅
  { id: 'merc_1',  name: '流れ者ガルデン',     jobId: 'warrior',  level: 3, cost: 150, faction: '朱雀' },
  { id: 'merc_2',  name: '弓の達人イシャ',     jobId: 'archer',   level: 3, cost: 140, faction: '朱雀' },
  { id: 'merc_4',  name: '傭兵槍士クロン',     jobId: 'spearman', level: 3, cost: 130, faction: '青龍' },
  { id: 'merc_8',  name: '魔術師ゼノン',       jobId: 'mage',     level: 3, cost: 160, faction: '黄竜' },
  { id: 'merc_a',  name: '古豪シールダス',     jobId: 'shielder', level: 3, cost: 130, faction: '白虎' },
  // Lv4～5 ～ 高コスト精鋭
  { id: 'merc_3',  name: '老魔道士バルモア',   jobId: 'mage',     level: 4, cost: 200, faction: '青龍' },
  { id: 'merc_5',  name: '鉄壁の盾士ドガン',   jobId: 'shielder', level: 4, cost: 180, faction: '玄武' },
  { id: 'merc_c1', name: '歴戦の槍騎士フォン', jobId: 'spearman', level: 4, cost: 190, faction: '黄竜' },
  { id: 'merc_6',  name: '女剣士サラシア',     jobId: 'warrior',  level: 5, cost: 250, faction: '玄武' },
  { id: 'merc_7',  name: '暗弓師テレス',       jobId: 'archer',   level: 5, cost: 240, faction: '黄竜' },
  { id: 'merc_9',  name: '槍姫アデラ',         jobId: 'spearman', level: 5, cost: 230, faction: '白虎' },
  { id: 'merc_c2', name: '魔剣士クロウ',       jobId: 'warrior',  level: 5, cost: 260, faction: '朱雀' },
  { id: 'merc_c3', name: '賢者エルミナ',       jobId: 'mage',     level: 5, cost: 250, faction: '青龍' },
];

// MyCryptoHeroes ヒーロー傭兵
// 雇用できるのは【プレイヤーと同一勢力】のヒーローのみ
export const MCH_MERCS: MercTemplate[] = [
  // ── 朱雀 ──────────────────────────────────────
  {
    id: 'mch_01', name: 'アレキサンダー',     jobId: 'warrior',  level: 7, cost: 450, faction: '朱雀',
    isMCH: true, iconEmoji: '🏛', imageUrl: `${CDN}/5017.png`,
  },
  {
    id: 'mch_02', name: 'カエサル',           jobId: 'shielder', level: 5, cost: 280, faction: '朱雀',
    isMCH: true, iconEmoji: '🦅', imageUrl: `${CDN}/4026.png`,
  },
  {
    id: 'mch_03', name: 'ハンニバル',         jobId: 'warrior',  level: 6, cost: 350, faction: '朱雀',
    isMCH: true, iconEmoji: '🐘', imageUrl: `${CDN}/4047.png`,
  },
  {
    id: 'mch_04', name: 'ブーディカ',         jobId: 'spearman', level: 6, cost: 340, faction: '朱雀',
    isMCH: true, iconEmoji: '🔥', imageUrl: `${CDN}/4057.png`,
  },
  // ── 青龍 ──────────────────────────────────────
  {
    id: 'mch_05', name: 'クレオパトラ',       jobId: 'mage',     level: 6, cost: 360, faction: '青龍',
    isMCH: true, iconEmoji: '🐍', imageUrl: `${CDN}/5016.png`,
  },
  {
    id: 'mch_06', name: 'ニコラ・テスラ',     jobId: 'mage',     level: 5, cost: 290, faction: '青龍',
    isMCH: true, iconEmoji: '⚡', imageUrl: `${CDN}/4041.png`,
  },
  {
    id: 'mch_07', name: '卑弥呼',             jobId: 'mage',     level: 7, cost: 480, faction: '青龍',
    isMCH: true, iconEmoji: '🌙', imageUrl: `${CDN}/5011.png`,
  },
  {
    id: 'mch_08', name: 'フランシス・ドレーク', jobId: 'archer',  level: 5, cost: 270, faction: '青龍',
    isMCH: true, iconEmoji: '⛵', imageUrl: `${CDN}/4052.png`,
  },
  // ── 玄武 ──────────────────────────────────────
  {
    id: 'mch_09', name: '源義経',             jobId: 'archer',   level: 6, cost: 330, faction: '玄武',
    isMCH: true, iconEmoji: '🏹', imageUrl: `${CDN}/5019.png`,
  },
  {
    id: 'mch_10', name: '武田信玄',           jobId: 'warrior',  level: 7, cost: 460, faction: '玄武',
    isMCH: true, iconEmoji: '🐯', imageUrl: `${CDN}/4025.png`,
  },
  {
    id: 'mch_11', name: '上杉謙信',           jobId: 'spearman', level: 6, cost: 350, faction: '玄武',
    isMCH: true, iconEmoji: '⛩', imageUrl: `${CDN}/4032.png`,
  },
  {
    id: 'mch_12', name: '織田信長',           jobId: 'warrior',  level: 7, cost: 460, faction: '玄武',
    isMCH: true, iconEmoji: '⚔', imageUrl: `${CDN}/5001.png`,
  },
  // ── 黄竜 ──────────────────────────────────────
  {
    id: 'mch_13', name: 'チンギス・ハン',     jobId: 'spearman', level: 7, cost: 470, faction: '黄竜',
    isMCH: true, iconEmoji: '🐎', imageUrl: `${CDN}/5013.png`,
  },
  {
    id: 'mch_14', name: '諸葛亮',             jobId: 'mage',     level: 6, cost: 360, faction: '黄竜',
    isMCH: true, iconEmoji: '📜', imageUrl: `${CDN}/5015.png`,
  },
  {
    id: 'mch_15', name: '関羽',               jobId: 'warrior',  level: 6, cost: 340, faction: '黄竜',
    isMCH: true, iconEmoji: '🌙', imageUrl: `${CDN}/4037.png`,
  },
  {
    id: 'mch_16', name: '趙雲',               jobId: 'spearman', level: 5, cost: 290, faction: '黄竜',
    isMCH: true, iconEmoji: '🐉', imageUrl: `${CDN}/4023.png`,
  },
  // ── 白虎 ──────────────────────────────────────
  {
    id: 'mch_17', name: 'ランスロット',       jobId: 'shielder', level: 7, cost: 480, faction: '白虎',
    isMCH: true, iconEmoji: '⚜', imageUrl: `${CDN}/4045.png`,
  },
  {
    id: 'mch_18', name: 'アーサー王',         jobId: 'warrior',  level: 6, cost: 350, faction: '白虎',
    isMCH: true, iconEmoji: '🏰', imageUrl: `${CDN}/5006.png`,
  },
  {
    id: 'mch_19', name: '巴御前',             jobId: 'spearman', level: 6, cost: 360, faction: '白虎',
    isMCH: true, iconEmoji: '🛡', imageUrl: `${CDN}/4022.png`,
  },
  {
    id: 'mch_20', name: 'リチャード1世',      jobId: 'archer',   level: 5, cost: 280, faction: '白虎',
    isMCH: true, iconEmoji: '🎯', imageUrl: `${CDN}/5023.png`,
  },
];

export const MERC_POOL: MercTemplate[] = [...BASE_MERCS, ...MCH_MERCS];

/**
 * 今月の傭兵プールを返す
 * - 同一勢力のMCHヒーロー全員を表示
 * - 勢力未定の場合は全勢力のMCHヒーローをローテーション表示
 */
export function pickMercPool(_month: number, _playerFaction?: string): MercTemplate[] {
  return MCH_MERCS;
}

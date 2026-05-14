import type { JobId } from '../game/types';

// ============================================================
// アイテム定義
// ============================================================

export type ItemSlot = 'weapon' | 'armor' | 'accessory';

export interface ItemBonus {
  atk?: number;
  def?: number;
  matk?: number;
  mdef?: number;
  mov?: number;
  maxHp?: number;
  range?: number;
}

export interface Item {
  id: string;
  name: string;
  slot: ItemSlot;
  icon: string;
  description: string;
  cost: number;        // 購入価格（gold）
  sellPrice: number;   // 売却価格（cost の半額）
  bonus: ItemBonus;
  preferredJobs?: JobId[];  // 推奨ジョブ（なければ全員装備可）
}

export const ITEMS: Record<string, Item> = {
  // ──────────── 武器 ────────────
  iron_sword: {
    id: 'iron_sword',
    name: '鉄の剣',
    slot: 'weapon',
    icon: '🗡',
    description: '丈夫な鉄製の剣。ATK +2',
    cost: 80,
    sellPrice: 40,
    bonus: { atk: 2 },
    preferredJobs: ['warrior', 'shielder'],
  },
  steel_sword: {
    id: 'steel_sword',
    name: '鋼の剣',
    slot: 'weapon',
    icon: '⚔',
    description: '鋼鉄製の剣。ATK +4',
    cost: 200,
    sellPrice: 100,
    bonus: { atk: 4 },
    preferredJobs: ['warrior', 'shielder'],
  },
  iron_lance: {
    id: 'iron_lance',
    name: '鉄の槍',
    slot: 'weapon',
    icon: '🏹',
    description: '長い鉄の槍。ATK +2',
    cost: 80,
    sellPrice: 40,
    bonus: { atk: 2 },
    preferredJobs: ['spearman'],
  },
  steel_lance: {
    id: 'steel_lance',
    name: '鋼の槍',
    slot: 'weapon',
    icon: '🔱',
    description: '重厚な鋼の槍。ATK +4 / MDEF +1',
    cost: 220,
    sellPrice: 110,
    bonus: { atk: 4, mdef: 1 },
    preferredJobs: ['spearman'],
  },
  longbow: {
    id: 'longbow',
    name: '長弓',
    slot: 'weapon',
    icon: '🪃',
    description: '射程が伸びる長弓。ATK +3 / RNG +1',
    cost: 280,
    sellPrice: 140,
    bonus: { atk: 3, range: 1 },
    preferredJobs: ['archer'],
  },
  magic_staff: {
    id: 'magic_staff',
    name: '魔法の杖',
    slot: 'weapon',
    icon: '🪄',
    description: '魔力を増幅する杖。MATK +3',
    cost: 160,
    sellPrice: 80,
    bonus: { matk: 3 },
    preferredJobs: ['mage'],
  },
  arcane_staff: {
    id: 'arcane_staff',
    name: '古代の杖',
    slot: 'weapon',
    icon: '🔮',
    description: '古代の魔術を宿す杖。MATK +5 / MDEF +1',
    cost: 400,
    sellPrice: 200,
    bonus: { matk: 5, mdef: 1 },
    preferredJobs: ['mage'],
  },

  // ──────────── 防具 ────────────
  leather_armor: {
    id: 'leather_armor',
    name: '革鎧',
    slot: 'armor',
    icon: '🥋',
    description: '軽くて動きやすい革の鎧。DEF +2',
    cost: 70,
    sellPrice: 35,
    bonus: { def: 2 },
  },
  chain_mail: {
    id: 'chain_mail',
    name: '鎖鎧',
    slot: 'armor',
    icon: '🛡',
    description: '金属の輪を繋いだ鎧。DEF +4',
    cost: 180,
    sellPrice: 90,
    bonus: { def: 4 },
  },
  plate_armor: {
    id: 'plate_armor',
    name: '板金鎧',
    slot: 'armor',
    icon: '⛨',
    description: '重厚な全身鎧。DEF +6',
    cost: 360,
    sellPrice: 180,
    bonus: { def: 6 },
    preferredJobs: ['shielder', 'warrior'],
  },
  magic_cloak: {
    id: 'magic_cloak',
    name: '魔法のマント',
    slot: 'armor',
    icon: '🧥',
    description: '魔力を弾くマント。MDEF +4',
    cost: 160,
    sellPrice: 80,
    bonus: { mdef: 4 },
    preferredJobs: ['mage', 'archer'],
  },
  rune_shield: {
    id: 'rune_shield',
    name: 'ルーン盾',
    slot: 'armor',
    icon: '🔵',
    description: 'ルーンの刻まれた盾。DEF +2 / MDEF +3',
    cost: 300,
    sellPrice: 150,
    bonus: { def: 2, mdef: 3 },
    preferredJobs: ['shielder', 'warrior'],
  },

  // ──────────── アクセサリ ────────────
  swift_boots: {
    id: 'swift_boots',
    name: '疾風の靴',
    slot: 'accessory',
    icon: '👟',
    description: '素早く動ける靴。MOV +1',
    cost: 150,
    sellPrice: 75,
    bonus: { mov: 1 },
  },
  vitality_gem: {
    id: 'vitality_gem',
    name: '生命の宝珠',
    slot: 'accessory',
    icon: '💎',
    description: '生命力を高める宝珠。MaxHP +10',
    cost: 180,
    sellPrice: 90,
    bonus: { maxHp: 10 },
  },
  eagle_eye: {
    id: 'eagle_eye',
    name: '鷹の眼',
    slot: 'accessory',
    icon: '👁',
    description: '遠くを見通す眼。RNG +1',
    cost: 200,
    sellPrice: 100,
    bonus: { range: 1 },
    preferredJobs: ['archer', 'spearman', 'mage'],
  },
};

/** アイテムIDのソート済みリスト（カテゴリ別） */
export const ITEM_ID_ORDER: string[] = [
  // weapon
  'iron_sword', 'steel_sword', 'iron_lance', 'steel_lance',
  'longbow', 'magic_staff', 'arcane_staff',
  // armor
  'leather_armor', 'chain_mail', 'plate_armor', 'magic_cloak', 'rune_shield',
  // accessory
  'swift_boots', 'vitality_gem', 'eagle_eye',
];

/** ボーナスを文字列化（例: ATK+2 / MDEF+3） */
export function bonusText(bonus: ItemBonus): string {
  const parts: string[] = [];
  if (bonus.atk)   parts.push(`ATK+${bonus.atk}`);
  if (bonus.def)   parts.push(`DEF+${bonus.def}`);
  if (bonus.matk)  parts.push(`MATK+${bonus.matk}`);
  if (bonus.mdef)  parts.push(`MDEF+${bonus.mdef}`);
  if (bonus.mov)   parts.push(`MOV+${bonus.mov}`);
  if (bonus.maxHp) parts.push(`HP+${bonus.maxHp}`);
  if (bonus.range) parts.push(`RNG+${bonus.range}`);
  return parts.join(' / ');
}

export const SLOT_LABEL: Record<ItemSlot, string> = {
  weapon: '武器',
  armor: '防具',
  accessory: 'アクセサリ',
};

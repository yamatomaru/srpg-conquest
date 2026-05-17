/**
 * MCH Verse ウォレット連携ライブラリ
 *
 * Chain: MCH Verse (Oasys L2)  Chain ID: 29548
 * Hero NFT Contract: 0x598BE1c5ff240157C2c552D112C9f9403068829d (ERC-721)
 */

import { BrowserProvider } from 'ethers';
import type { Character, JobId } from '../game/types';
import { MCH_HERO_NAMES_JA } from '../data/mchHeroNames';

// ─── 定数 ───────────────────────────────────────────────────────────────────

export const MCH_CHAIN_ID = 29548;
export const MCH_CHAIN_ID_HEX = '0x736c';

export const MCH_NETWORK = {
  chainId: MCH_CHAIN_ID_HEX,
  chainName: 'MCH Verse',
  nativeCurrency: { name: 'OAS', symbol: 'OAS', decimals: 18 },
  rpcUrls: ['https://rpc.oasys.mycryptoheroes.net/'],
  blockExplorerUrls: ['https://explorer.oasys.mycryptoheroes.net/'],
};

const HERO_CONTRACT = '0x598BE1c5ff240157C2c552D112C9f9403068829d';
const BLOCKSCOUT_API = 'https://explorer.oasys.mycryptoheroes.net/api/v2';

// ─── 型定義 ──────────────────────────────────────────────────────────────────

export interface MchHeroAttribute {
  trait_type: string;
  value: string | number;
}

export interface MchHeroMetadata {
  name: string;
  description: string;
  image: string;
  external_url: string;
  attributes: MchHeroAttribute[];
  extra_data?: {
    active_skill_id?: number;
    passive_skill_id?: number;
    hero_type_id?: number;
    current_stamina?: number;
    max_stamina?: number;
    ce?: number;
  };
}

export interface MchHero {
  tokenId: string;
  name: string;
  heroTypeName: string;   // e.g. "YATAGARASU"
  heroTypeId: number;
  level: number;
  rarity: string;         // "Legendary" | "Epic" | "Rare" | "Common"
  hp: number;
  physical: number;
  intelligence: number;
  agility: number;
  activeSkillId: number;
  passiveSkillId: number;
  imageUrl: string;
  externalUrl: string;
  stamina: { current: number; max: number };
  ce: number;
}

export interface WalletState {
  connected: boolean;
  address: string | null;
  chainId: number | null;
  onCorrectChain: boolean;
}

// ─── ウォレット接続 ───────────────────────────────────────────────────────────

/** MetaMask が利用可能かチェック */
export function isMetaMaskAvailable(): boolean {
  return typeof window !== 'undefined' && Boolean((window as any).ethereum);
}

/** ウォレットに接続してアドレスを返す */
export async function connectWallet(): Promise<string> {
  if (!isMetaMaskAvailable()) {
    throw new Error('MetaMask がインストールされていません。\nhttps://metamask.io からインストールしてください。');
  }
  const provider = new BrowserProvider((window as any).ethereum);
  const accounts = await provider.send('eth_requestAccounts', []);
  if (!accounts || accounts.length === 0) {
    throw new Error('ウォレットの接続が拒否されました。');
  }
  return accounts[0] as string;
}

/** 現在接続中のチェーンIDを返す */
export async function getChainId(): Promise<number> {
  if (!isMetaMaskAvailable()) return 0;
  const provider = new BrowserProvider((window as any).ethereum);
  const network = await provider.getNetwork();
  return Number(network.chainId);
}

/** MCH Verse ネットワークに切り替える（未登録なら追加） */
export async function switchToMchVerse(): Promise<void> {
  if (!isMetaMaskAvailable()) {
    throw new Error('MetaMask が見つかりません。');
  }
  const eth = (window as any).ethereum;
  try {
    await eth.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: MCH_CHAIN_ID_HEX }],
    });
  } catch (err: any) {
    // エラーコード 4902 = 未登録ネットワーク → 追加してから切替
    if (err?.code === 4902 || err?.data?.originalError?.code === 4902) {
      await eth.request({
        method: 'wallet_addEthereumChain',
        params: [MCH_NETWORK],
      });
    } else {
      throw err;
    }
  }
}

// ─── ヒーロー取得 (Blockscout API) ──────────────────────────────────────────

/** Blockscout API レスポンス内の1インスタンス */
interface BlockscoutInstance {
  id: string;
  image_url: string | null;
  external_app_url: string | null;
  metadata: MchHeroMetadata | null;
}

/** 指定アドレスの保有ヒーロー一覧を Blockscout API から取得 */
export async function fetchHeroesByAddress(address: string): Promise<MchHero[]> {
  const heroes: MchHero[] = [];
  let url: string | null =
    `${BLOCKSCOUT_API}/tokens/${HERO_CONTRACT}/instances?holder_address_hash=${address}`;

  while (url) {
    const res: Response = await fetch(url);
    if (!res.ok) throw new Error(`Blockscout API エラー: ${res.status}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();

    const items: BlockscoutInstance[] = Array.isArray(data.items) ? data.items : [];
    for (const item of items) {
      const hero = parseBlockscoutInstance(item);
      if (hero) heroes.push(hero);
    }

    // ページネーション
    if (data.next_page_params && typeof data.next_page_params === 'object') {
      const params: URLSearchParams = new URLSearchParams(
        Object.fromEntries(
          Object.entries(data.next_page_params as Record<string, unknown>).map(([k, v]) => [k, String(v)])
        )
      );
      url = `${BLOCKSCOUT_API}/tokens/${HERO_CONTRACT}/instances?holder_address_hash=${address}&${params}`;
    } else {
      url = null;
    }
  }

  return heroes;
}

/**
 * attributes を統一的に扱うヘルパー。
 * 配列形式: [{trait_type:"HP", value:465}, ...]
 * オブジェクト形式: {"HP": 465, "Physical": 140, ...}
 * のどちらでも動作する。
 */
function normalizeAttributes(raw: unknown): MchHeroAttribute[] {
  if (Array.isArray(raw)) return raw as MchHeroAttribute[];
  if (raw && typeof raw === 'object') {
    return Object.entries(raw as Record<string, unknown>).map(([trait_type, value]) => ({
      trait_type,
      value: value as string | number,
    }));
  }
  return [];
}

/** Blockscout インスタンスを MchHero に変換 */
function parseBlockscoutInstance(item: BlockscoutInstance): MchHero | null {
  const meta = item.metadata;
  if (!meta) return null;

  const attributes = normalizeAttributes(meta.attributes);

  // 大文字小文字を問わず属性を検索
  const attr = (...traits: string[]): number => {
    for (const trait of traits) {
      const tl = trait.toLowerCase();
      const found = attributes.find((a) => a.trait_type.toLowerCase() === tl);
      if (found) return Number(found.value);
    }
    return 0;
  };
  const attrStr = (...traits: string[]): string => {
    for (const trait of traits) {
      const tl = trait.toLowerCase();
      const found = attributes.find((a) => a.trait_type.toLowerCase() === tl);
      if (found && found.value) return String(found.value);
    }
    return '';
  };

  // heroTypeId: extra_data優先 → tokenIdから算出
  const heroTypeId =
    meta.extra_data?.hero_type_id ?? Math.floor(parseInt(item.id, 10) / 10000);

  // ヒーロー名: type_name → Type → type → tokenIdフォールバック
  const typeName = attrStr('type_name', 'Type', 'type') || `Hero #${item.id}`;

  // 画像URL: instance直下 → heroTypeIdから生成
  const imageUrl =
    item.image_url ||
    `https://www.mycryptoheroes.net/images/heroes/2000/${heroTypeId}.png`;

  return {
    tokenId: item.id,
    name: meta.name,
    heroTypeName: typeName,
    heroTypeId,
    level:        attr('lv', 'Level'),
    rarity:       attrStr('rarity', 'Rarity'),
    hp:           attr('hp', 'HP'),
    physical:     attr('phy', 'Physical'),
    intelligence: attr('int', 'Intelligence'),
    agility:      attr('agi', 'Agility'),
    activeSkillId:  meta.extra_data?.active_skill_id ?? 0,
    passiveSkillId: meta.extra_data?.passive_skill_id ?? 0,
    imageUrl,
    externalUrl: item.external_app_url ?? `https://www.mycryptoheroes.net/heroes/${item.id}`,
    stamina: {
      current: meta.extra_data?.current_stamina ?? 0,
      max:     meta.extra_data?.max_stamina ?? 0,
    },
    ce: meta.extra_data?.ce ?? 0,
  };
}

// ─── スタット変換 ──────────────────────────────────────────────────────────

/**
 * ヒーロー名キーワード → ジョブ対応表
 * 名前に含まれるキーワードで優先判定、マッチしない場合はステータスでフォールバック
 */
const NAME_JOB_RULES: Array<{ keywords: string[]; base: JobId; legendary: JobId }> = [
  // 弓師・神射手
  { keywords: [
      'YATAGARASU', 'TELL', 'WILLIAM', 'ROBIN HOOD', 'ARTEMIS', 'ATALANTE',
      'ARASH', 'HOU YI', 'NASU', 'YOSHITSUNE', 'ARCHER', 'BOW',
    ], base: 'archer', legendary: 'ranger' },
  // 魔術師・賢者（科学者・錬金術師・魔法使い）
  { keywords: [
      'GALILEO', 'TESLA', 'EINSTEIN', 'NEWTON', 'DARWIN', 'COPERNICUS',
      'ARISTOTLE', 'ARCHIMEDES', 'PYTHAGORAS', 'EUCLID', 'EULER',
      'MERLIN', 'NOSTRADAMUS', 'PARACELSUS', 'FLAMEL', 'ALCHEMIST',
      'ZHUGE', 'KONGMING', 'DA VINCI', 'DAVINCI', 'MAGE', 'WIZARD', 'WITCH',
      'MOZART', 'BACH', 'ALCHEMY', 'SCHOLAR', 'HYPATIA', 'AVICENNA',
    ], base: 'mage', legendary: 'sage' },
  // 僧侶（聖職者・癒し手）
  { keywords: [
      'FLORENCE', 'NIGHTINGALE', 'JOAN', 'JEANNE', 'HILDEGARD',
      'PRIEST', 'MONK', 'BISHOP', 'BUDDHA', 'BUDDA', 'SAINT',
      'ANGEL', 'HEAL', 'CLARA', 'TERESA',
    ], base: 'priest', legendary: 'paladin' },
  // 槍士・槍騎兵
  { keywords: [
      'LONGINUS', 'SANADA', 'HONDA', 'YUKIMURA', 'TADAKATSU',
      'ACHILLES', 'DIOMEDES', 'SPEAR', 'LANCE', 'OTANI',
    ], base: 'spearman', legendary: 'lancer' },
  // 盾士・聖騎士（守護者・重装）
  { keywords: [
      'AJAX', 'LEONIDAS', 'SHIELD', 'GUARD', 'FORTRESS',
      'GENBU', 'SUSANOO',
    ], base: 'shielder', legendary: 'paladin' },
  // 騎士（将軍・武将・重騎兵）
  { keywords: [
      'SCIPIO', 'CAESAR', 'NAPOLEON', 'ALEXANDER', 'CHARLEMAGNE',
      'ARTHUR', 'CRUSADER', 'TEMPLAR', 'KNIGHT',
      'NOBUNAGA', 'ODA', 'AKECHI', 'MITSUHIDE', 'CAO CAO', 'CAOCAO',
      'KHALID', 'HANNIBAL', 'SALADIN', 'WELLINGTON', 'MONTGOMERY',
    ], base: 'knight', legendary: 'hero' },
  // 戦士・勇者（剣士・闘士）
  { keywords: [
      'MUSASHI', 'MIYAMOTO', 'KOJIRO', 'SAMURAI', 'GLADIATOR',
      'LU BU', 'LUBU', 'GUAN YU', 'GUANYU', 'BERSERKER', 'BEOWULF',
      'HERCULES', 'HERACLES', 'VLAD', 'SPARTACUS', 'WARRIOR',
      'UESUGI', 'KENSHIN', 'TAKEDA', 'SHINGEN',
    ], base: 'warrior', legendary: 'hero' },
];

/**
 * ヒーロー名とステータスからジョブを決定
 * 1. 名前キーワード照合（優先）
 * 2. ステータス比較（フォールバック）
 */
function heroToJobId(hero: MchHero): JobId {
  const nameUpper = hero.heroTypeName.toUpperCase();
  const isLegendary = hero.rarity === 'Legendary';

  // 名前キーワードで判定
  for (const rule of NAME_JOB_RULES) {
    if (rule.keywords.some((kw) => nameUpper.includes(kw))) {
      return isLegendary ? rule.legendary : rule.base;
    }
  }

  // キーワード不一致 → ステータスで判定
  const isPhysical = hero.physical >= hero.intelligence;
  const isMagical  = hero.intelligence > hero.physical;
  const isRanged   = hero.agility >= 80;

  if (isLegendary) {
    if (isMagical)              return 'sage';
    if (isRanged)               return 'ranger';
    if (hero.physical >= 130)   return 'hero';
    return 'paladin';
  }
  if (hero.rarity === 'Epic') {
    if (isMagical)   return 'mage';
    if (isRanged)    return 'archer';
    if (isPhysical)  return 'knight';
    return 'warrior';
  }
  // Rare / Common
  if (isMagical) return 'mage';
  if (isRanged)  return 'archer';
  return 'warrior';
}

/**
 * MCH ヒーロー → ゲームキャラクター変換
 * スタット比率: MCH値は最大~500前後、ゲームは10〜60前後にスケール
 */
export function mchHeroToCharacter(hero: MchHero): Character {
  const jobId = heroToJobId(hero);

  // HP: MCH最大~500 → ゲーム20〜60
  const maxHp = Math.max(15, Math.round(hero.hp / 10));
  // ATK: Physical最大~200 → ゲーム4〜17
  const atk = Math.max(4, Math.round(hero.physical / 12));
  // DEF: Agility高いほど機動力=防御力に一部変換
  const def = Math.max(2, Math.round(hero.agility / 30));
  // MATK: Intelligence最大~200 → ゲーム3〜21
  const matk = Math.max(3, Math.round(hero.intelligence / 10));
  // MDEF: Intelligence半分スケール
  const mdef = Math.max(4, Math.round(hero.intelligence / 20));
  // MOV: Agility最大~120 → ゲーム3〜6
  const mov = Math.min(6, Math.max(3, Math.round(hero.agility / 25)));
  // Range: 魔法・弓系は3、槍系2、それ以外1（jobIdから導出）
  const range = ['mage', 'sage', 'archer', 'ranger'].includes(jobId)
    ? 3
    : jobId === 'spearman' || jobId === 'lancer'
    ? 2
    : 1;
  // Level: MCH最大100 → ゲーム1〜10
  const level = Math.min(10, Math.max(1, Math.round(hero.level / 10)));

  const charId = `mch-${hero.tokenId}`;

  // 日本語名を優先、なければ英語名
  const displayName = MCH_HERO_NAMES_JA[hero.heroTypeId] ?? hero.heroTypeName;

  return {
    id: charId,
    name: displayName,
    jobId,
    level,
    exp: 0,
    hp: maxHp,
    maxHp,
    atk,
    def,
    matk,
    mdef,
    mov,
    range,
    imageUrl: hero.imageUrl || undefined,
  };
}

// ─── Character 型 (ローカル参照用) ──────────────────────────────────────────
// types.ts から import するため型だけ再 export
export type { Character };

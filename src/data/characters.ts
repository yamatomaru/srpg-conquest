import type { Character, CharacterTrait, JobId } from '../game/types';
import { JOBS } from './jobs';

// ── 特性定義 ────────────────────────────────────────────────
type StatDelta = Partial<{ hp: number; atk: number; def: number; matk: number; mdef: number; mov: number; range: number }>;

export const TRAIT_DELTA: Record<CharacterTrait, StatDelta> = {
  '攻撃特化':   { atk: 4, def: -2 },
  '防御特化':   { def: 4, hp: 8, atk: -2 },
  '俊足':       { mov: 1, hp: -4 },
  '魔法特化':   { matk: 5, atk: -2 },
  '重装備':     { hp: 10, def: 2, mov: -1 },
  '遠距離特化': { range: 1, atk: -2 },
  '万能型':     { atk: 1, def: 1, matk: 1 },
  '均衡型':     {},
};

export const TRAIT_COLOR: Record<CharacterTrait, string> = {
  '攻撃特化':   '#ef4444',
  '防御特化':   '#3b82f6',
  '俊足':       '#22c55e',
  '魔法特化':   '#a855f7',
  '重装備':     '#6b7280',
  '遠距離特化': '#f59e0b',
  '万能型':     '#06b6d4',
  '均衡型':     '#4b5563',
};

// ── キャラクター生成 ──────────────────────────────────────
function createCharacter(
  id: string,
  name: string,
  jobId: JobId,
  trait: CharacterTrait = '均衡型',
  level = 1,
): Character {
  const job = JOBS[jobId];
  const d = TRAIT_DELTA[trait];
  const maxHp = Math.max(1, job.baseHp + (d.hp ?? 0));
  return {
    id, name, jobId, trait, level, exp: 0,
    hp: maxHp, maxHp,
    atk:   Math.max(1, job.baseAtk   + (d.atk   ?? 0)),
    def:   Math.max(0, job.baseDef   + (d.def   ?? 0)),
    matk:  Math.max(1, job.baseMatk  + (d.matk  ?? 0)),
    mdef:  Math.max(0, job.baseMdef  + (d.mdef  ?? 0)),
    mov:   Math.max(1, job.baseMov   + (d.mov   ?? 0)),
    range: Math.max(1, job.baseRange + (d.range ?? 0)),
    spritePath: `/sprites/${id}.png`,
  };
}

export const CHARACTERS: Record<string, Character> = {
  // ── アルバニア王国（朱雀） ──────────────────────────────
  c_alba_1:  createCharacter('c_alba_1',  '項羽',                  'shielder', '攻撃特化'),  // 天下無双の武力
  c_alba_2:  createCharacter('c_alba_2',  'スキピオ',              'shielder', '万能型'),    // 戦略の天才
  c_alba_3:  createCharacter('c_alba_3',  'ブーディカ',            'warrior',  '攻撃特化'), // 激烈な女王
  c_alba_4:  createCharacter('c_alba_4',  'スパルタクス',          'warrior',  '重装備'),   // 剣闘士の鎧
  c_alba_5:  createCharacter('c_alba_5',  'チンギス・ハン',        'spearman', '俊足'),     // 騎馬の覇者
  c_alba_6:  createCharacter('c_alba_6',  'ブリュンヒルド',        'spearman', '防御特化'), // ヴァルキリーの盾
  c_alba_7:  createCharacter('c_alba_7',  '那須与一',              'archer',   '遠距離特化'), // 扇の的の名射
  c_alba_8:  createCharacter('c_alba_8',  'ダルタニャン',          'archer',   '俊足'),     // 疾風の銃士
  c_alba_9:  createCharacter('c_alba_9',  '周瑜',                  'mage',     '魔法特化'), // 火計の軍師
  c_alba_10: createCharacter('c_alba_10', 'DOURAN',                'mage',     '均衡型'),

  // ── マグナス魔導院（青龍）魔術師特化 ─────────────────────
  c_magn_1:  createCharacter('c_magn_1',  '劉邦',                  'shielder', '万能型'),    // 天下を統一した器
  c_magn_2:  createCharacter('c_magn_2',  'アッティラ',            'warrior',  '攻撃特化'), // 神の鞭
  c_magn_3:  createCharacter('c_magn_3',  'イワン雷帝',            'warrior',  '攻撃特化'), // 苛烈な皇帝
  c_magn_4:  createCharacter('c_magn_4',  '斎藤一',                'mage',     '俊足'),     // 新撰組の速剣
  c_magn_5:  createCharacter('c_magn_5',  'ラクシュミー・バーイ',  'mage',     '万能型'),   // インドの女傑
  c_magn_6:  createCharacter('c_magn_6',  '徳川家康',              'mage',     '防御特化'), // 忍耐の覇者
  c_magn_7:  createCharacter('c_magn_7',  '織田信長',              'archer',   '攻撃特化'), // 革命的攻勢
  c_magn_8:  createCharacter('c_magn_8',  '坂本龍馬',              'mage',     '俊足'),     // 志士の行動力
  c_magn_9:  createCharacter('c_magn_9',  'マリア・テレジア',      'mage',     '魔法特化'), // 啓蒙の女帝
  c_magn_10: createCharacter('c_magn_10', 'カール大帝',            'mage',     '重装備'),   // 西洋の盾

  // ── ノルダー氏族（玄武）盾士特化 ────────────────────────
  c_nord_1:  createCharacter('c_nord_1',  '虞美人',                'shielder', '均衡型'),
  c_nord_2:  createCharacter('c_nord_2',  '劉備',                  'shielder', '万能型'),    // 仁義の皇帝
  c_nord_3:  createCharacter('c_nord_3',  'クレオパトラ',          'shielder', '魔法特化'), // 知略と魅力
  c_nord_4:  createCharacter('c_nord_4',  '張飛',                  'warrior',  '攻撃特化'), // 猛将
  c_nord_5:  createCharacter('c_nord_5',  '出雲阿国',              'warrior',  '俊足'),     // 踊りの俊敏さ
  c_nord_6:  createCharacter('c_nord_6',  'サトシ・ナカモト',      'shielder', '防御特化'), // 謎の守護者
  c_nord_7:  createCharacter('c_nord_7',  '黄忠',                  'archer',   '遠距離特化'), // 老将の弓
  c_nord_8:  createCharacter('c_nord_8',  '葛飾北斎',              'shielder', '均衡型'),
  c_nord_9:  createCharacter('c_nord_9',  'マリー・アントワネット','spearman', '均衡型'),
  c_nord_10: createCharacter('c_nord_10', 'グリム兄弟',            'spearman', '魔法特化'), // 魔法の物語

  // ── シルヴァン同盟（黄竜）槍士寄り均衡 ──────────────────
  c_silv_1:  createCharacter('c_silv_1',  'ツタンカーメン',        'shielder', '均衡型'),
  c_silv_2:  createCharacter('c_silv_2',  'マルコ・ポーロ',        'spearman', '俊足'),     // 旅人の機動力
  c_silv_3:  createCharacter('c_silv_3',  '呂布',                  'warrior',  '攻撃特化'), // 三国最強の武将
  c_silv_4:  createCharacter('c_silv_4',  'YATAGARASU',            'spearman', '俊足'),     // 八咫烏の速さ
  c_silv_5:  createCharacter('c_silv_5',  'コロンブス',            'spearman', '俊足'),     // 大航海の果敢さ
  c_silv_6:  createCharacter('c_silv_6',  'ヴァスコ・ダ・ガマ',   'spearman', '遠距離特化'), // 遠征の王
  c_silv_7:  createCharacter('c_silv_7',  'ワイアット・アープ',    'archer',   '遠距離特化'), // 保安官の早撃ち
  c_silv_8:  createCharacter('c_silv_8',  'カラミティ・ジェーン',  'warrior',  '遠距離特化'), // 名うての射手
  c_silv_9:  createCharacter('c_silv_9',  '始皇帝',                'archer',   '重装備'),   // 帝国の重厚さ
  c_silv_10: createCharacter('c_silv_10', 'エジソン',              'mage',     '魔法特化'), // 発明の電撃

  // ── ヴィース小公国（白虎）弓師特化 ──────────────────────
  c_vies_1:  createCharacter('c_vies_1',  '曹操',                  'shielder', '万能型'),    // 乱世の奸雄
  c_vies_2:  createCharacter('c_vies_2',  'アーサー王',            'archer',   '防御特化'), // 円卓の盾
  c_vies_3:  createCharacter('c_vies_3',  'ジャンヌ・ダルク',      'warrior',  '万能型'),   // 神の使い
  c_vies_4:  createCharacter('c_vies_4',  '許褚',                  'spearman', '重装備'),   // 曹操の親衛隊
  c_vies_5:  createCharacter('c_vies_5',  'プラトン',              'archer',   '魔法特化'), // 哲学の叡智
  c_vies_6:  createCharacter('c_vies_6',  '霧隠才蔵',              'spearman', '俊足'),     // 忍者の迅速
  c_vies_7:  createCharacter('c_vies_7',  '黒髭',                  'archer',   '攻撃特化'), // 海賊の猛攻
  c_vies_8:  createCharacter('c_vies_8',  'ウィリアム・テル',      'archer',   '遠距離特化'), // りんご射ち
  c_vies_9:  createCharacter('c_vies_9',  '安倍晴明',              'archer',   '魔法特化'), // 陰陽師
  c_vies_10: createCharacter('c_vies_10', 'ラスプーチン',          'mage',     '防御特化'), // 不死の怪僧
};

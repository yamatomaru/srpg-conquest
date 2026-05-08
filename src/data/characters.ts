import type { Character, JobId } from '../game/types';
import { JOBS } from './jobs';

function createCharacter(id: string, name: string, jobId: JobId, level = 1): Character {
  const job = JOBS[jobId];
  return {
    id, name, jobId, level, exp: 0,
    hp: job.baseHp, maxHp: job.baseHp,
    atk: job.baseAtk, def: job.baseDef,
    matk: job.baseMatk, mdef: job.baseMdef,
    mov: job.baseMov, range: job.baseRange,
    spritePath: `/sprites/${id}.png`,
  };
}

export const CHARACTERS: Record<string, Character> = {
  // === アルバニア王国（朱雀） ===
  c_alba_1:  createCharacter('c_alba_1',  '項羽',               'shielder'),
  c_alba_2:  createCharacter('c_alba_2',  'スキピオ',           'shielder'),
  c_alba_3:  createCharacter('c_alba_3',  'ブーディカ',         'warrior'),
  c_alba_4:  createCharacter('c_alba_4',  'スパルタクス',       'warrior'),
  c_alba_5:  createCharacter('c_alba_5',  'チンギス・ハン',     'spearman'),
  c_alba_6:  createCharacter('c_alba_6',  'ブリュンヒルド',     'spearman'),
  c_alba_7:  createCharacter('c_alba_7',  '那須与一',           'archer'),
  c_alba_8:  createCharacter('c_alba_8',  'ダルタニャン',       'archer'),
  c_alba_9:  createCharacter('c_alba_9',  '周瑜',               'mage'),
  c_alba_10: createCharacter('c_alba_10', 'DOURAN',             'mage'),

  // === マグナス魔導院（青龍） ===
  c_magn_1:  createCharacter('c_magn_1',  '劉邦',               'shielder'),
  c_magn_2:  createCharacter('c_magn_2',  'アッティラ',         'warrior'),
  c_magn_3:  createCharacter('c_magn_3',  'イワン雷帝',         'spearman'),
  c_magn_4:  createCharacter('c_magn_4',  '斎藤一',             'spearman'),
  c_magn_5:  createCharacter('c_magn_5',  'ラクシュミー・バーイ', 'mage'),
  c_magn_6:  createCharacter('c_magn_6',  '徳川家康',           'mage'),
  c_magn_7:  createCharacter('c_magn_7',  '織田信長',           'archer'),
  c_magn_8:  createCharacter('c_magn_8',  '坂本龍馬',           'archer'),
  c_magn_9:  createCharacter('c_magn_9',  'マリア・テレジア',   'mage'),
  c_magn_10: createCharacter('c_magn_10', 'カール大帝',         'mage'),

  // === ノルダー氏族（玄武） ===
  c_nord_1:  createCharacter('c_nord_1',  '虞美人',             'shielder'),
  c_nord_2:  createCharacter('c_nord_2',  '劉備',               'shielder'),
  c_nord_3:  createCharacter('c_nord_3',  'クレオパトラ',       'shielder'),
  c_nord_4:  createCharacter('c_nord_4',  '張飛',               'warrior'),
  c_nord_5:  createCharacter('c_nord_5',  '出雲阿国',           'warrior'),
  c_nord_6:  createCharacter('c_nord_6',  'サトシ・ナカモト',   'warrior'),
  c_nord_7:  createCharacter('c_nord_7',  '黄忠',               'archer'),
  c_nord_8:  createCharacter('c_nord_8',  '葛飾北斎',           'spearman'),
  c_nord_9:  createCharacter('c_nord_9',  'マリー・アントワネット', 'spearman'),
  c_nord_10: createCharacter('c_nord_10', 'グリム兄弟',         'mage'),

  // === シルヴァン同盟（黄竜） ===
  c_silv_1:  createCharacter('c_silv_1',  'ツタンカーメン',     'shielder'),
  c_silv_2:  createCharacter('c_silv_2',  'マルコ・ポーロ',     'spearman'),
  c_silv_3:  createCharacter('c_silv_3',  '呂布',               'warrior'),
  c_silv_4:  createCharacter('c_silv_4',  'YATAGARASU',         'spearman'),
  c_silv_5:  createCharacter('c_silv_5',  'コロンブス',         'archer'),
  c_silv_6:  createCharacter('c_silv_6',  'ヴァスコ・ダ・ガマ', 'archer'),
  c_silv_7:  createCharacter('c_silv_7',  'ワイアット・アープ', 'archer'),
  c_silv_8:  createCharacter('c_silv_8',  'カラミティ・ジェーン', 'archer'),
  c_silv_9:  createCharacter('c_silv_9',  '始皇帝',             'mage'),
  c_silv_10: createCharacter('c_silv_10', 'エジソン',           'mage'),

  // === ヴィース小公国（白虎） ===
  c_vies_1:  createCharacter('c_vies_1',  '曹操',               'shielder'),
  c_vies_2:  createCharacter('c_vies_2',  'アーサー王',         'shielder'),
  c_vies_3:  createCharacter('c_vies_3',  'ジャンヌ・ダルク',   'warrior'),
  c_vies_4:  createCharacter('c_vies_4',  '許褚',               'spearman'),
  c_vies_5:  createCharacter('c_vies_5',  'プラトン',           'spearman'),
  c_vies_6:  createCharacter('c_vies_6',  '霧隠才蔵',           'spearman'),
  c_vies_7:  createCharacter('c_vies_7',  '黒髭',               'archer'),
  c_vies_8:  createCharacter('c_vies_8',  'ウィリアム・テル',   'archer'),
  c_vies_9:  createCharacter('c_vies_9',  '安倍晴明',           'mage'),
  c_vies_10: createCharacter('c_vies_10', 'ラスプーチン',       'mage'),
};

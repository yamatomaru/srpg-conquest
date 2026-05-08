import type { Character, JobId } from '../game/types';
import { JOBS } from './jobs';

/** ジョブ基本値からキャラクターを生成するヘルパー。 */
function createCharacter(
  id: string,
  name: string,
  jobId: JobId,
  level = 1,
): Character {
  const job = JOBS[jobId];
  return {
    id,
    name,
    jobId,
    level,
    hp: job.baseHp,
    maxHp: job.baseHp,
    atk: job.baseAtk,
    def: job.baseDef,
    mov: job.baseMov,
    range: job.baseRange,
  };
}

export const CHARACTERS: Record<string, Character> = {
  // === アルバニア王国（プレイヤー国・バランス型） ===
  c_lion:    createCharacter('c_lion',    'リオン王',     'warrior'),
  c_clare:   createCharacter('c_clare',   'クレア',       'mage'),
  c_galon:   createCharacter('c_galon',   'ガロン',       'warrior'),

  // === ノルダー氏族（北・戦士主体） ===
  c_torga:   createCharacter('c_torga',   'トルガ',       'warrior'),
  c_gustav:  createCharacter('c_gustav',  'グスタフ',     'warrior'),
  c_baldo:   createCharacter('c_baldo',   'バルド',       'archer'),

  // === マグナス魔導院（東・魔法主体・最強格） ===
  c_arcana:  createCharacter('c_arcana',  'アルカナ',     'mage'),
  c_isma:    createCharacter('c_isma',    'イズマ',       'mage'),
  c_vahl:    createCharacter('c_vahl',    'ヴァール',     'warrior'),

  // === シルヴァン同盟（南・弓兵主体・機動力） ===
  c_loren:   createCharacter('c_loren',   'ローレン',     'archer'),
  c_finn:    createCharacter('c_finn',    'フィン',       'archer'),
  c_erik:    createCharacter('c_erik',    'エリク',       'warrior'),

  // === ヴィース小公国（西・弱小・最初の標的） ===
  c_peter:   createCharacter('c_peter',   'ピーター',     'warrior'),
  c_marta:   createCharacter('c_marta',   'マルタ',       'archer'),
};

import type { Job, JobId } from '../game/types';

/**
 * ジョブ基本値テーブル。
 * 戦士は前衛タンク、弓兵は遠距離・機動、魔導師は紙装甲・高火力。
 * ダメージ計算式: damage = max(1, atk - def)
 */
export const JOBS: Record<JobId, Job> = {
  warrior: {
    id: 'warrior',
    name: '戦士',
    description: '近接攻撃で前線を支える。HP・防御に優れる。',
    baseHp: 32,
    baseAtk: 10,
    baseDef: 5,
    baseMov: 4,
    baseRange: 1,
    spritePath: '/sprites/warrior.png',
  },
  archer: {
    id: 'archer',
    name: '弓兵',
    description: '遠距離攻撃と高機動を持つアタッカー。',
    baseHp: 22,
    baseAtk: 9,
    baseDef: 3,
    baseMov: 5,
    baseRange: 3,
    spritePath: '/sprites/archer.png',
  },
  mage: {
    id: 'mage',
    name: '魔導師',
    description: '紙装甲だが最高火力。中距離からの攻撃が得意。',
    baseHp: 20,
    baseAtk: 12,
    baseDef: 2,
    baseMov: 4,
    baseRange: 2,
    spritePath: '/sprites/mage.png',
  },
};

import type { Nation } from '../game/types';

export const NATIONS: Record<string, Nation> = {
  albania: {
    id: 'albania',
    name: 'アルバニア王国',
    color: '#3b82f6', // 青
    rulerId: 'c_lion',
    characterIds: ['c_lion', 'c_clare', 'c_galon', 'c_sera', 'c_dion'],
    gold: 200,
    isPlayer: true,
    defeated: false,
  },
  nordal: {
    id: 'nordal',
    name: 'ノルダー氏族',
    color: '#6b7280', // 鋼鉄色
    rulerId: 'c_torga',
    characterIds: ['c_torga'], // Sprint 2 テスト用に君主1名
    gold: 150,
    isPlayer: false,
    defeated: false,
  },
  magnus: {
    id: 'magnus',
    name: 'マグナス魔導院',
    color: '#a855f7', // 紫
    rulerId: 'c_arcana',
    characterIds: ['c_arcana'], // Sprint 2 テスト用に君主1名
    gold: 250,
    isPlayer: false,
    defeated: false,
  },
  sylvan: {
    id: 'sylvan',
    name: 'シルヴァン同盟',
    color: '#22c55e', // 緑
    rulerId: 'c_loren',
    characterIds: ['c_loren'], // Sprint 2 テスト用に君主1名
    gold: 150,
    isPlayer: false,
    defeated: false,
  },
  wess: {
    id: 'wess',
    name: 'ヴィース小公国',
    color: '#eab308', // 黄
    rulerId: 'c_peter',
    characterIds: ['c_peter'], // Sprint 2 テスト用に君主1名
    gold: 80,
    isPlayer: false,
    defeated: false,
  },
};

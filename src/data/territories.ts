import type { Territory } from '../game/types';

/**
 * 領地配置（中央型マップ）:
 *
 *           [北: ノルダー高地]
 *                  |
 *  [西: ヴィース] - [中央: アルバニア] - [東: マグナス]
 *                  |
 *           [南: シルヴァン森林]
 *
 * 隣接ルール:
 * - 中央は四方すべてに接する。
 * - 辺境同士は隣の辺境と環状に接続（北↔東↔南↔西↔北）。
 */
export const TERRITORIES: Record<string, Territory> = {
  central: {
    id: 'central',
    name: 'アルバニア中央',
    ownerId: 'albania',
    garrisonIds: ['c_lion', 'c_clare', 'c_galon'],
    adjacentTo: ['north', 'east', 'south', 'west'],
    position: { x: 340, y: 220 },
    income: 80,
    hasActed: false,
  },
  north: {
    id: 'north',
    name: 'ノルダー高地',
    ownerId: 'nordal',
    garrisonIds: ['c_torga', 'c_gustav', 'c_baldo'],
    adjacentTo: ['central', 'east', 'west'],
    position: { x: 340, y: 80 },
    income: 60,
    hasActed: false,
  },
  east: {
    id: 'east',
    name: 'マグナス聖塔',
    ownerId: 'magnus',
    garrisonIds: ['c_arcana', 'c_isma', 'c_vahl'],
    adjacentTo: ['central', 'north', 'south'],
    position: { x: 520, y: 220 },
    income: 100,
    hasActed: false,
  },
  south: {
    id: 'south',
    name: 'シルヴァン森林',
    ownerId: 'sylvan',
    garrisonIds: ['c_loren', 'c_finn', 'c_erik'],
    adjacentTo: ['central', 'east', 'west'],
    position: { x: 340, y: 360 },
    income: 60,
    hasActed: false,
  },
  west: {
    id: 'west',
    name: 'ヴィース平原',
    ownerId: 'wess',
    garrisonIds: ['c_peter', 'c_marta'],
    adjacentTo: ['central', 'north', 'south'],
    position: { x: 160, y: 220 },
    income: 40,
    hasActed: false,
  },
};

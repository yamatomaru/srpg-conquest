import type { Territory } from '../game/types';

/**
 * 5×5 グリッドマップ（各国5領地）:
 *
 * col:  0      1      2      3      4
 * row0: nord1  nord2  nord3* nord4  nord5
 * row1: vies1  alba1  alba2  alba3  magn1
 * row2: vies2  alba4  alba5* magn2  magn3
 * row3: vies3* silv1  silv2* silv3  magn4*
 * row4: vies4  vies5  silv4  silv5  magn5
 *
 * * = 本拠地（★）
 *
 * 本拠地の接続ルール：本拠地は自国領地のみ2〜3箇所に接続
 * その他の領地は2〜4箇所に接続（自国・他国混在）
 */

const px = (col: number, row: number) => ({ x: col * 195 + 100, y: row * 135 + 75 });

export const TERRITORIES: Record<string, Territory> = {
  // ── ノルダー氏族（北・row0） ─────────────────────────
  // 本拠地: nord3（row0中央、自国のみ接続）
  nord1: {
    id: 'nord1', name: '北の辺境',
    ownerId: 'nordal', garrisonIds: ['c_nord_1', 'c_nord_2'],
    adjacentTo: ['nord2', 'vies1'],
    position: px(0, 0), income: 30, hasActed: false,
  },
  nord2: {
    id: 'nord2', name: '氷峰の砦',
    ownerId: 'nordal', garrisonIds: ['c_nord_3', 'c_nord_4'],
    adjacentTo: ['nord1', 'nord3', 'alba1'],
    position: px(1, 0), income: 35, hasActed: false,
  },
  nord3: {
    id: 'nord3', name: '北の本城',
    ownerId: 'nordal', garrisonIds: ['c_nord_6'],
    adjacentTo: ['nord2', 'nord4'],
    position: px(2, 0), income: 60, hasActed: false,
  },
  nord4: {
    id: 'nord4', name: '雪原の関門',
    ownerId: 'nordal', garrisonIds: ['c_nord_5', 'c_nord_7', 'c_nord_8'],
    adjacentTo: ['nord3', 'nord5', 'alba3'],
    position: px(3, 0), income: 35, hasActed: false,
  },
  nord5: {
    id: 'nord5', name: '吹雪の岬',
    ownerId: 'nordal', garrisonIds: ['c_nord_9', 'c_nord_10'],
    adjacentTo: ['nord4', 'magn1'],
    position: px(4, 0), income: 30, hasActed: false,
  },

  // ── ヴィース小公国（西・col0 rows1-4） ───────────────
  // 本拠地: vies3（col0中央、自国のみ接続）
  vies1: {
    id: 'vies1', name: '西の城砦',
    ownerId: 'wess', garrisonIds: ['c_vies_1', 'c_vies_2'],
    adjacentTo: ['nord1', 'alba1', 'vies2'],
    position: px(0, 1), income: 40, hasActed: false,
  },
  vies2: {
    id: 'vies2', name: '西の辺境',
    ownerId: 'wess', garrisonIds: ['c_vies_3', 'c_vies_4'],
    adjacentTo: ['vies1', 'vies3', 'alba4'],
    position: px(0, 2), income: 25, hasActed: false,
  },
  vies3: {
    id: 'vies3', name: '西の王城',
    ownerId: 'wess', garrisonIds: ['c_vies_5', 'c_vies_6'],
    adjacentTo: ['vies2', 'vies4'],
    position: px(0, 3), income: 55, hasActed: false,
  },
  vies4: {
    id: 'vies4', name: '砂礫の荒野',
    ownerId: 'wess', garrisonIds: ['c_vies_7', 'c_vies_8'],
    adjacentTo: ['vies3', 'vies5'],
    position: px(0, 4), income: 35, hasActed: false,
  },
  vies5: {
    id: 'vies5', name: '葦の渡し',
    ownerId: 'wess', garrisonIds: ['c_vies_9', 'c_vies_10'],
    adjacentTo: ['vies4', 'silv1', 'silv4'],
    position: px(1, 4), income: 35, hasActed: false,
  },

  // ── アルバニア王国（中央） ───────────────────────────
  // 本拠地: alba5（中央内陸、自国のみ接続）
  alba1: {
    id: 'alba1', name: '中の城門',
    ownerId: 'albania', garrisonIds: ['c_alba_1', 'c_alba_2', 'c_alba_3', 'c_alba_4'],
    adjacentTo: ['nord2', 'vies1', 'alba2', 'alba4'],
    position: px(1, 1), income: 40, hasActed: false,
  },
  alba2: {
    id: 'alba2', name: '中央平野',
    ownerId: 'albania', garrisonIds: [],
    adjacentTo: ['alba1', 'alba3', 'alba5'],
    position: px(2, 1), income: 35, hasActed: false,
  },
  alba3: {
    id: 'alba3', name: '東の砦台',
    ownerId: 'albania', garrisonIds: ['c_alba_5', 'c_alba_6', 'c_alba_7'],
    adjacentTo: ['nord4', 'alba2', 'magn1', 'magn2'],
    position: px(3, 1), income: 40, hasActed: false,
  },
  alba4: {
    id: 'alba4', name: '緑の丘陵',
    ownerId: 'albania', garrisonIds: ['c_alba_8', 'c_alba_9'],
    adjacentTo: ['alba1', 'vies2', 'alba5', 'silv1'],
    position: px(1, 2), income: 35, hasActed: false,
  },
  alba5: {
    id: 'alba5', name: '中の王城',
    ownerId: 'albania', garrisonIds: ['c_alba_10'],
    adjacentTo: ['alba2', 'alba4'],
    position: px(2, 2), income: 60, hasActed: false,
  },

  // ── マグナス魔導院（東・col4 rows1-4 + magn2） ────────
  // 本拠地: magn4（col4中央、自国のみ接続）
  magn1: {
    id: 'magn1', name: '東の聖塔',
    ownerId: 'magnus', garrisonIds: ['c_magn_1', 'c_magn_2', 'c_magn_10'],
    adjacentTo: ['nord5', 'alba3', 'magn3'],
    position: px(4, 1), income: 45, hasActed: false,
  },
  magn2: {
    id: 'magn2', name: '魔法の回廊',
    ownerId: 'magnus', garrisonIds: ['c_magn_3', 'c_magn_4'],
    adjacentTo: ['alba3', 'magn3', 'silv3'],
    position: px(3, 2), income: 35, hasActed: false,
  },
  magn3: {
    id: 'magn3', name: '東の聖域',
    ownerId: 'magnus', garrisonIds: ['c_magn_5', 'c_magn_6'],
    adjacentTo: ['magn1', 'magn2', 'magn4'],
    position: px(4, 2), income: 40, hasActed: false,
  },
  magn4: {
    id: 'magn4', name: '東の魔都',
    ownerId: 'magnus', garrisonIds: ['c_magn_7', 'c_magn_8'],
    adjacentTo: ['magn3', 'magn5'],
    position: px(4, 3), income: 60, hasActed: false,
  },
  magn5: {
    id: 'magn5', name: '魔都の港',
    ownerId: 'magnus', garrisonIds: ['c_magn_9'],
    adjacentTo: ['magn4', 'silv5'],
    position: px(4, 4), income: 35, hasActed: false,
  },

  // ── シルヴァン同盟（南・rows3-4） ────────────────────
  // 本拠地: silv2（南中央内陸、自国のみ接続）
  silv1: {
    id: 'silv1', name: '南の森',
    ownerId: 'sylvan', garrisonIds: ['c_silv_1', 'c_silv_2'],
    adjacentTo: ['alba4', 'vies5', 'silv2'],
    position: px(1, 3), income: 40, hasActed: false,
  },
  silv2: {
    id: 'silv2', name: '聖なる樹',
    ownerId: 'sylvan', garrisonIds: ['c_silv_4'],
    adjacentTo: ['silv1', 'silv3', 'silv4'],
    position: px(2, 3), income: 55, hasActed: false,
  },
  silv3: {
    id: 'silv3', name: '緑の聖地',
    ownerId: 'sylvan', garrisonIds: ['c_silv_5', 'c_silv_6', 'c_silv_7'],
    adjacentTo: ['magn2', 'silv2', 'silv5'],
    position: px(3, 3), income: 35, hasActed: false,
  },
  silv4: {
    id: 'silv4', name: '花咲く草原',
    ownerId: 'sylvan', garrisonIds: ['c_silv_8', 'c_silv_10'],
    adjacentTo: ['silv2', 'vies5', 'silv5'],
    position: px(2, 4), income: 30, hasActed: false,
  },
  silv5: {
    id: 'silv5', name: '南海の浜辺',
    ownerId: 'sylvan', garrisonIds: ['c_silv_3', 'c_silv_9'],
    adjacentTo: ['silv3', 'silv4', 'magn5'],
    position: px(3, 4), income: 30, hasActed: false,
  },
};

import type { Territory, Nation, Character } from '../game/types';
import { NATIONS } from './nations';
import { CHARACTERS } from './characters';

// ============================================================
// シード付き疑似乱数 (mulberry32)
// ============================================================
function createRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ============================================================
// マップ定数
// ============================================================
const COLS = 5;
const ROWS = 5;
const NATION_COUNT = 5;
const TERR_PER_NATION = 5;

/** 固定国家順（NATIONS と対応） */
export const NATION_ORDER = ['albania', 'magnus', 'nordal', 'sylvan', 'wess'] as const;

/** ピクセル座標（デフォルトマップと同じ間隔） */
const px = (col: number, row: number) => ({ x: col * 195 + 100, y: row * 135 + 75 });

/** 領地名プール（30種） */
const TERRITORY_NAMES = [
  '北の辺境',   '氷峰の砦',   '雪原の関門', '吹雪の岬',   '北の砦城',
  '西の城砦',   '西の辺境',   '砂礫の荒野', '葦の渡し',   '西の王都',
  '中の城門',   '中央平野',   '東の砦台',   '緑の丘陵',   '要の王城',
  '東の聖塔',   '魔法の回廊', '霧の聖域',   '黒曜の都',   '東の港',
  '南の森',     '聖なる樹',   '緑の聖地',   '花咲く草原', '南海の岬',
  '紅葉の峰',   '月見の丘',   '春風の原野', '秋霧の谷',   '冬枯れの野',
];

// ============================================================
// Voronoi + バランス調整
// ============================================================

/** グリッド上でよく分散した5つの種を選ぶ（最大最小距離法） */
function pickSeeds(rng: () => number): [number, number][] {
  const all: [number, number][] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) all.push([c, r]);
  }
  const shuffled = shuffle(all, rng);

  const seeds: [number, number][] = [shuffled[0]];
  const remaining = shuffled.slice(1);

  while (seeds.length < NATION_COUNT) {
    let bestCell: [number, number] = remaining[0];
    let bestDist = -1;
    for (const cell of remaining) {
      if (seeds.some(([sc, sr]) => sc === cell[0] && sr === cell[1])) continue;
      const minD = Math.min(
        ...seeds.map(([sc, sr]) => Math.abs(sc - cell[0]) + Math.abs(sr - cell[1]))
      );
      if (minD > bestDist) { bestDist = minD; bestCell = cell; }
    }
    seeds.push(bestCell);
  }
  return seeds;
}

/** Voronoi 割り当て（ユークリッド二乗距離） */
function voronoiAssign(seeds: [number, number][]): number[][] {
  return Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) => {
      let minD = Infinity, minIdx = 0;
      seeds.forEach(([sc, sr], idx) => {
        const d = (c - sc) ** 2 + (r - sr) ** 2;
        if (d < minD) { minD = d; minIdx = idx; }
      });
      return minIdx;
    })
  );
}

/**
 * 各国がちょうど TERR_PER_NATION 領地になるよう調整
 * 種セルは固定（ロック）、余剰セルを近い不足国に譲渡
 */
function balanceAssignment(
  base: number[][],
  seeds: [number, number][],
  rng: () => number,
): number[][] {
  const result = base.map((row) => [...row]);

  // 種セルを優先確定
  seeds.forEach(([sc, sr], idx) => { result[sr][sc] = idx; });

  // 非種セルをシャッフル順で処理
  const nonSeedCells = shuffle(
    (() => {
      const cells: [number, number][] = [];
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++)
          if (!seeds.some(([sc, sr]) => sc === c && sr === r))
            cells.push([c, r]);
      return cells;
    })(),
    rng,
  );

  const counts = new Array(NATION_COUNT).fill(0);
  seeds.forEach((_, idx) => counts[idx]++);
  for (const [c, r] of nonSeedCells) counts[result[r][c]]++;

  // 過剰分を不足国へ移す（最大100回反復）
  for (let iter = 0; iter < 100; iter++) {
    let changed = false;
    for (const [c, r] of nonSeedCells) {
      const from = result[r][c];
      if (counts[from] <= TERR_PER_NATION) continue;
      const needy = Array.from({ length: NATION_COUNT }, (_, i) => i)
        .filter((i) => counts[i] < TERR_PER_NATION);
      if (needy.length === 0) continue;
      // 最も近い不足国に割り当て
      const best = needy.reduce((a, b) => {
        const da = (c - seeds[a][0]) ** 2 + (r - seeds[a][1]) ** 2;
        const db = (c - seeds[b][0]) ** 2 + (r - seeds[b][1]) ** 2;
        return da <= db ? a : b;
      });
      counts[from]--;
      counts[best]++;
      result[r][c] = best;
      changed = true;
    }
    if (!changed) break;
  }
  return result;
}

// ============================================================
// 公開 API
// ============================================================

export interface RandomMapResult {
  territories: Record<string, Territory>;
  nations: Record<string, Nation>;
  characters: Record<string, Character>;
}

/** セルIDヘルパー */
export const cellId = (c: number, r: number): string => `rnd_${c}_${r}`;

export function generateRandomMap(seed: number = Date.now()): RandomMapResult {
  const rng = createRng(seed >>> 0);

  // 1. Voronoi 種 + 割り当て
  const seeds = pickSeeds(rng);
  const assignment = balanceAssignment(voronoiAssign(seeds), seeds, rng);

  // 2. 領地名をシャッフル
  const namePool = shuffle([...TERRITORY_NAMES], rng);

  // 3. 国別セルリスト
  const nationCells: [number, number][][] = Array.from({ length: NATION_COUNT }, () => []);
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      nationCells[assignment[r][c]].push([c, r]);

  // 4. 領地オブジェクト生成
  const territories: Record<string, Territory> = {};
  let nameIdx = 0;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const nationIdx = assignment[r][c];
      const nationId = NATION_ORDER[nationIdx];
      const [sc, sr] = seeds[nationIdx];
      const isCapital = sc === c && sr === r;
      const id = cellId(c, r);

      // 4方向隣接
      const adj: string[] = [];
      if (r > 0) adj.push(cellId(c, r - 1));
      if (r < ROWS - 1) adj.push(cellId(c, r + 1));
      if (c > 0) adj.push(cellId(c - 1, r));
      if (c < COLS - 1) adj.push(cellId(c + 1, r));

      territories[id] = {
        id,
        name: isCapital ? `★${namePool[nameIdx]}` : namePool[nameIdx],
        ownerId: nationId,
        garrisonIds: [],            // 後で設定
        adjacentTo: adj,
        position: px(c, r),
        income: isCapital ? 55 : 25 + Math.floor(rng() * 20),
        hasActed: false,
      };
      nameIdx++;
    }
  }

  // 5. キャラクターをガリソンに配置
  //    各国10キャラ: 本拠地1 + 各辺境2ずつ(4×2=8) + 余り1 = 10
  for (let nIdx = 0; nIdx < NATION_COUNT; nIdx++) {
    const nId = NATION_ORDER[nIdx];
    const [sc, sr] = seeds[nIdx];
    const capitalId = cellId(sc, sr);
    const cells = nationCells[nIdx];
    const otherCells = cells.filter(([c, r]) => !(c === sc && r === sr));
    const chars = shuffle([...NATIONS[nId].characterIds], rng);

    let ci = 0;
    // 本拠地: 1キャラ
    territories[capitalId].garrisonIds = [chars[ci++]];
    // 辺境: 2キャラずつ
    for (const [c, r] of otherCells) {
      territories[cellId(c, r)].garrisonIds = [chars[ci++], chars[ci++]];
    }
    // 余り1キャラをランダムな辺境に追加
    if (ci < chars.length) {
      const extra = otherCells[Math.floor(rng() * otherCells.length)];
      territories[cellId(extra[0], extra[1])].garrisonIds.push(chars[ci]);
    }
  }

  // 6. 国家オブジェクト（capitalTerritoryId を更新）
  const nations: Record<string, Nation> = {};
  for (let nIdx = 0; nIdx < NATION_COUNT; nIdx++) {
    const nId = NATION_ORDER[nIdx];
    const [sc, sr] = seeds[nIdx];
    nations[nId] = {
      ...NATIONS[nId],
      capitalTerritoryId: cellId(sc, sr),
      defeated: false,
    };
  }

  // 7. キャラクター: HP フルリセット
  const characters: Record<string, Character> = {};
  for (const [id, ch] of Object.entries(CHARACTERS)) {
    characters[id] = { ...ch, hp: ch.maxHp };
  }

  return { territories, nations, characters };
}

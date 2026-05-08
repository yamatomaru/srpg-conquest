import type { TerrainType } from './types';

export const TERRAIN_DEFS: Record<TerrainType, {
  label: string;
  color: string;
  movCost: number;
  defBonus: number;
  mdefBonus: number;
}> = {
  plain:    { label: '平原', color: '#1e3a5f', movCost: 1, defBonus: 0,  mdefBonus: 0 },
  forest:   { label: '森',   color: '#1a4a1a', movCost: 2, defBonus: 3,  mdefBonus: 1 },
  mountain: { label: '山岳', color: '#3a3a4a', movCost: 3, defBonus: 5,  mdefBonus: 3 },
  fortress: { label: '砦',   color: '#5a3a10', movCost: 1, defBonus: 4,  mdefBonus: 3 },
};

export function generateTerrain(width: number, height: number): TerrainType[][] {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, (): TerrainType => {
      const r = Math.random();
      if (r < 0.05) return 'fortress';
      if (r < 0.20) return 'mountain';
      if (r < 0.40) return 'forest';
      return 'plain';
    }),
  );
}

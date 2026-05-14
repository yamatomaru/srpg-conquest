import { TERRAIN_DEFS } from '../game/terrain';
import type { TerrainType } from '../game/types';

const TERRAIN_ORDER: TerrainType[] = ['plain', 'forest', 'mountain', 'fortress'];

const TERRAIN_ICON: Record<TerrainType, string> = {
  plain:    '🌾',
  forest:   '🌲',
  mountain: '⛰',
  fortress: '🏯',
};

export default function TerrainLegend() {
  return (
    <div style={{
      display: 'flex',
      gap: 6,
      flexWrap: 'wrap',
      padding: '6px 12px',
      background: '#0d1117',
      borderTop: '1px solid #1f2937',
      fontSize: 12,
    }}>
      {TERRAIN_ORDER.map((t) => {
        const def = TERRAIN_DEFS[t];
        return (
          <div
            key={t}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 8px',
              background: def.color,
              borderRadius: 4,
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#e5e7eb',
              whiteSpace: 'nowrap',
            }}
          >
            <span>{TERRAIN_ICON[t]}</span>
            <span style={{ fontWeight: 'bold' }}>{def.label}</span>
            <span style={{ color: '#9ca3af', fontSize: 11 }}>
              MOV{def.movCost > 1 ? `-${def.movCost - 1}` : '='}
              {def.defBonus > 0 && <span style={{ color: '#60a5fa' }}> DEF+{def.defBonus}</span>}
              {def.mdefBonus > 0 && <span style={{ color: '#c084fc' }}> MDEF+{def.mdefBonus}</span>}
            </span>
          </div>
        );
      })}
      <div style={{ color: '#4b5563', fontSize: 11, alignSelf: 'center', marginLeft: 4 }}>
        ※ MOV= 移動コスト同じ / MOV-N 移動消費+N
      </div>
    </div>
  );
}

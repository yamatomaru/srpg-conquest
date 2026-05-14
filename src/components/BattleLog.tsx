import { useGameStore } from '../game/store';
import { TERRAIN_DEFS } from '../game/terrain';

export default function BattleLog() {
  const log = useGameStore((s) => s.battle?.recentLog ?? []);
  if (log.length === 0) return null;

  return (
    <div
      style={{
        padding: '9px 24px',
        background: '#111827',
        borderTop: '1px solid #374151',
        fontSize: 17,
        color: '#9ca3af',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        flexShrink: 0,
        maxHeight: 160,
        overflowY: 'auto',
      }}
    >
      {log.map((entry, i) => (
        <div key={i} style={{ color: i === 0 ? '#e5e7eb' : '#6b7280', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span>
            {entry.defeated
              ? `💀 ${entry.attackerName} → ${entry.defenderName} に ${entry.damage} ダメージ（撃破）`
              : `⚔ ${entry.attackerName} → ${entry.defenderName} に ${entry.damage} ダメージ`}
          </span>
          {entry.terrainType && entry.terrainBonus && (
            <span style={{
              fontSize: 13,
              color: '#34d399',
              background: 'rgba(52,211,153,0.1)',
              border: '1px solid rgba(52,211,153,0.3)',
              borderRadius: 3,
              padding: '0 5px',
            }}>
              🌿 {TERRAIN_DEFS[entry.terrainType].label} DEF+{entry.terrainBonus}
            </span>
          )}
          {entry.levelUp && (
            <span style={{
              color: '#fbbf24',
              fontWeight: 'bold',
              fontSize: 15,
              background: '#1c1917',
              border: '1px solid #fbbf24',
              borderRadius: 3,
              padding: '0 5px',
            }}>
              ★ Lv UP! → Lv{entry.newLevel}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

import { useGameStore } from '../game/store';

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
        <div key={i} style={{ color: i === 0 ? '#e5e7eb' : '#6b7280' }}>
          {entry.defeated
            ? `💀 ${entry.attackerName} → ${entry.defenderName} に ${entry.damage} ダメージ（撃破）`
            : `⚔ ${entry.attackerName} → ${entry.defenderName} に ${entry.damage} ダメージ`}
        </div>
      ))}
    </div>
  );
}

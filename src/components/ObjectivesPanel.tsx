import { useGameStore } from '../game/store';

export default function ObjectivesPanel() {
  const objectives = useGameStore((s) => s.objectives);
  const done = objectives.filter((o) => o.completed).length;

  return (
    <div
      style={{
        background: '#111827', borderTop: '1px solid #374151',
        padding: '10px 16px', flexShrink: 0,
      }}
    >
      <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 6 }}>
        🏆 シナリオ目標 {done}/{objectives.length}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 130, overflowY: 'auto' }}>
        {objectives.map((obj) => (
          <div
            key={obj.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 12,
              opacity: obj.completed ? 0.6 : 1,
            }}
          >
            <span style={{ color: obj.completed ? '#22c55e' : '#374151', fontSize: 14 }}>
              {obj.completed ? '✓' : '○'}
            </span>
            <span style={{ color: obj.completed ? '#6b7280' : '#d1d5db', textDecoration: obj.completed ? 'line-through' : 'none' }}>
              {obj.title}
            </span>
            {!obj.completed && (
              <span style={{ color: '#6b7280', fontSize: 11 }}>— {obj.description}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

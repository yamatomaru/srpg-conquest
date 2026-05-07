import { useGameStore } from '../game/store';

export default function TurnControl() {
  const { month, currentNationId, nations, winnerId, endPlayerTurn } =
    useGameStore();
  const currentNation = nations[currentNationId];
  const playerNation = Object.values(nations).find((n) => n.isPlayer)!;
  const isPlayerTurn = currentNationId === playerNation.id;
  const canEndTurn = isPlayerTurn && winnerId === null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        background: '#1f2937',
        borderBottom: '1px solid #374151',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', gap: 24, alignItems: 'center', fontSize: 14 }}>
        <span style={{ fontWeight: 'bold', color: '#f9fafb' }}>月: {month}</span>
        <span style={{ color: '#9ca3af' }}>
          行動中:{' '}
          <strong style={{ color: currentNation.color }}>{currentNation.name}</strong>
        </span>
      </div>

      <button
        onClick={endPlayerTurn}
        disabled={!canEndTurn}
        style={{
          padding: '6px 18px',
          background: canEndTurn ? '#2563eb' : '#374151',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          cursor: canEndTurn ? 'pointer' : 'default',
          opacity: canEndTurn ? 1 : 0.5,
          fontSize: 13,
        }}
      >
        ターン終了
      </button>
    </div>
  );
}

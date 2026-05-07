import { useGameStore } from '../game/store';

export default function GameOverModal() {
  const { winnerId, nations, ui, reset } = useGameStore();

  if (!ui.gameOverShown || winnerId === null) return null;

  const playerNation = Object.values(nations).find((n) => n.isPlayer)!;
  const isVictory = winnerId === playerNation.id;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        style={{
          background: '#1f2937',
          borderRadius: 12,
          padding: '48px 56px',
          textAlign: 'center',
          color: '#f9fafb',
          minWidth: 320,
          border: `2px solid ${isVictory ? '#f59e0b' : '#6b7280'}`,
        }}
      >
        <div
          style={{ fontSize: 52, marginBottom: 8, lineHeight: 1 }}
        >
          {isVictory ? '★' : '✕'}
        </div>
        <h2 style={{ fontSize: 30, margin: '8px 0', color: isVictory ? '#fbbf24' : '#ef4444' }}>
          {isVictory ? '勝利！' : '敗北...'}
        </h2>
        <p style={{ color: '#9ca3af', marginBottom: 28, fontSize: 14 }}>
          {isVictory
            ? 'すべての領地を統一しました！'
            : 'プレイヤーの領地がすべて失われました...'}
        </p>
        <button
          onClick={reset}
          style={{
            padding: '10px 36px',
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 15,
          }}
        >
          最初から
        </button>
      </div>
    </div>
  );
}

import { useGameStore } from '../game/store';

export default function GameOverModal() {
  const { winnerId, nations, territories, month, ui, reset } = useGameStore();

  if (!ui.gameOverShown || winnerId === null) return null;

  const playerNation = Object.values(nations).find((n) => n.isPlayer)!;
  const isVictory = winnerId === playerNation.id;
  const winnerNation = nations[winnerId];

  const playerTerritoryCount = Object.values(territories).filter(
    (t) => t.ownerId === playerNation.id,
  ).length;
  const totalTerritoryCount = Object.values(territories).length;
  const survivingCharCount = playerNation.characterIds.length;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
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
          padding: '44px 52px',
          textAlign: 'center',
          color: '#f9fafb',
          minWidth: 340,
          border: `2px solid ${isVictory ? '#f59e0b' : '#6b7280'}`,
        }}
      >
        <div style={{ fontSize: 52, marginBottom: 8, lineHeight: 1 }}>
          {isVictory ? '★' : '✕'}
        </div>
        <h2 style={{ fontSize: 30, margin: '8px 0', color: isVictory ? '#fbbf24' : '#ef4444' }}>
          {isVictory ? '征服完了！' : '敗北...'}
        </h2>
        <p style={{ color: '#9ca3af', marginBottom: 20, fontSize: 14 }}>
          {isVictory
            ? `${month}ヶ月で全土を統一しました`
            : `${winnerNation.name}に敗れました（${month}ヶ月目）`}
        </p>

        {/* 統計 */}
        <div
          style={{
            background: '#111827',
            borderRadius: 8,
            padding: '16px 24px',
            marginBottom: 24,
            display: 'flex',
            justifyContent: 'space-around',
            gap: 16,
            fontSize: 13,
            color: '#d1d5db',
          }}
        >
          <div>
            <div style={{ color: '#9ca3af', fontSize: 11, marginBottom: 4 }}>到達月</div>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: '#f9fafb' }}>{month}</div>
          </div>
          <div>
            <div style={{ color: '#9ca3af', fontSize: 11, marginBottom: 4 }}>領地</div>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: '#f9fafb' }}>
              {playerTerritoryCount}/{totalTerritoryCount}
            </div>
          </div>
          <div>
            <div style={{ color: '#9ca3af', fontSize: 11, marginBottom: 4 }}>生存武将</div>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: '#f9fafb' }}>{survivingCharCount}</div>
          </div>
          <div>
            <div style={{ color: '#9ca3af', fontSize: 11, marginBottom: 4 }}>ゴールド</div>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: '#fbbf24' }}>
              ¥{playerNation.gold.toLocaleString()}
            </div>
          </div>
        </div>

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

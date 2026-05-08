import { useGameStore } from '../game/store';

const SAVE_KEY = 'srpg-conquest-save';

export default function TurnControl() {
  const { month, currentNationId, nations, winnerId, isAIThinking, ui, endPlayerTurn, saveGame, loadGame, reset, togglePanel } =
    useGameStore();
  const currentNation = nations[currentNationId];
  const playerNation = Object.values(nations).find((n) => n.isPlayer)!;
  const isPlayerTurn = currentNationId === playerNation.id;
  const canEndTurn = isPlayerTurn && winnerId === null && !isAIThinking;
  const hasSave = !!localStorage.getItem(SAVE_KEY);

  const btnStyle = (color: string, enabled = true) => ({
    padding: '7px 18px',
    background: enabled ? color : '#374151',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    cursor: enabled ? 'pointer' : 'default',
    opacity: enabled ? 1 : 0.45,
    fontSize: 18,
  });

  return (
    <div
      style={{
        background: '#1f2937',
        borderBottom: '1px solid #374151',
        flexShrink: 0,
      }}
    >
      {/* コントロールバー */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 20px',
          gap: 12,
        }}
      >
        {/* 左: 月・行動中・ゴールド */}
        <div style={{ display: 'flex', gap: 24, alignItems: 'center', fontSize: 21 }}>
          <span style={{ fontWeight: 'bold', color: '#f9fafb' }}>月: {month}</span>
          <span style={{ color: '#9ca3af' }}>
            行動中:{' '}
            <strong style={{ color: currentNation.color }}>{currentNation.name}</strong>
          </span>
          <span style={{ color: '#fbbf24', fontSize: 20 }}>
            ¥{playerNation.gold.toLocaleString()}
          </span>
          {isAIThinking && (
            <span style={{ color: '#f59e0b', fontSize: 20 }}>AI行動中...</span>
          )}
        </div>

        {/* 右: パネルボタン + セーブ・ロード・リセット・ターン終了 */}
        <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
          <button onClick={() => togglePanel('troops')}
            style={{ ...btnStyle(ui.activePanel === 'troops' ? '#1d4ed8' : '#374151'), fontSize: 15 }}
            title="部隊一覧">👥 部隊</button>
          <button onClick={() => togglePanel('diplomacy')}
            style={{ ...btnStyle(ui.activePanel === 'diplomacy' ? '#065f46' : '#374151'), fontSize: 15 }}
            title="外交">🤝 外交</button>
          <button onClick={() => togglePanel('mercenary')}
            disabled={!isPlayerTurn}
            style={{ ...btnStyle(ui.activePanel === 'mercenary' ? '#92400e' : '#374151', isPlayerTurn), fontSize: 15 }}
            title="傭兵雇用">💰 傭兵</button>
          <div style={{ width: 1, background: '#374151', alignSelf: 'stretch', margin: '0 4px' }} />
          <button onClick={saveGame} disabled={!canEndTurn} style={btnStyle('#065f46', canEndTurn)} title="セーブ">セーブ</button>
          <button onClick={loadGame} disabled={!hasSave} style={btnStyle('#1e3a5f', hasSave)} title="ロード">ロード</button>
          <button onClick={reset} style={btnStyle('#4b5563')} title="リセット">リセット</button>
          <div style={{ width: 1, background: '#374151', alignSelf: 'stretch', margin: '0 4px' }} />
          <button onClick={endPlayerTurn} disabled={!canEndTurn} style={btnStyle('#2563eb', canEndTurn)}>
            ターン終了
          </button>
        </div>
      </div>

      {/* 行動ログ */}
      {ui.log.length > 0 && (
        <div
          style={{
            padding: '6px 20px 9px',
            borderTop: '1px solid #374151',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            maxHeight: 120,
            overflowY: 'auto',
          }}
        >
          {ui.log.map((entry, i) => (
            <div
              key={i}
              style={{
                fontSize: 17,
                color: i === 0 ? '#e5e7eb' : '#6b7280',
              }}
            >
              {entry}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

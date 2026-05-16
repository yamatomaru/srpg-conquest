import { useState } from 'react';
import { useGameStore } from '../game/store';
import { useIsMobile } from '../hooks/useIsMobile';
import SaveSlotPanel from './SaveSlotPanel';

export default function TurnControl() {
  const { month, currentNationId, nations, winnerId, isAIThinking, autoPlay, fastForward, ui,
    endPlayerTurn, reset, togglePanel, toggleAutoPlay, toggleFastForward } =
    useGameStore();
  const isMobile = useIsMobile();
  const currentNation = nations[currentNationId];
  const playerNation = Object.values(nations).find((n) => n.isPlayer)!;
  const isPlayerTurn = currentNationId === playerNation.id;
  const canEndTurn = isPlayerTurn && winnerId === null && !isAIThinking;

  // オートセーブ存在チェック（UI表示用）
  const hasAutoSave = !!localStorage.getItem('srpg-conquest-save-auto');
  const [showSavePanel, setShowSavePanel] = useState(false);

  const btnStyle = (color: string, enabled = true) => ({
    padding: isMobile ? '6px 10px' : '7px 18px',
    background: enabled ? color : '#374151',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    cursor: enabled ? 'pointer' : 'default',
    opacity: enabled ? 1 : 0.45,
    fontSize: isMobile ? 13 : 18,
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
          flexWrap: 'wrap',
          padding: isMobile ? '8px 10px' : '10px 20px',
          gap: isMobile ? 6 : 12,
        }}
      >
        {/* 左: 月・行動中・ゴールド */}
        <div style={{ display: 'flex', gap: isMobile ? 10 : 24, alignItems: 'center', fontSize: isMobile ? 14 : 21 }}>
          <span style={{ fontWeight: 'bold', color: '#f9fafb' }}>月: {month}</span>
          <span style={{ color: '#9ca3af' }}>
            行動中:{' '}
            <strong style={{ color: currentNation.color }}>{currentNation.name}</strong>
          </span>
          <span style={{ color: '#fbbf24' }}>
            ¥{playerNation.gold.toLocaleString()}
          </span>
          {isAIThinking && (
            <span style={{ color: '#f59e0b' }}>AI中...</span>
          )}
          {hasAutoSave && !isMobile && (
            <span style={{ fontSize: 11, color: '#4b5563' }}>💾 AS</span>
          )}
        </div>

        {/* 右: パネルボタン + セーブ・リセット・ターン終了 */}
        <div style={{ display: 'flex', gap: isMobile ? 4 : 7, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => togglePanel('troops')}
            style={{ ...btnStyle(ui.activePanel === 'troops' ? '#1d4ed8' : '#374151') }}
            title="部隊一覧">👥 部隊</button>
          <button onClick={() => togglePanel('diplomacy')}
            style={{ ...btnStyle(ui.activePanel === 'diplomacy' ? '#065f46' : '#374151') }}
            title="外交">🤝 外交</button>
          <button onClick={() => togglePanel('mercenary')}
            disabled={!isPlayerTurn}
            style={{ ...btnStyle(ui.activePanel === 'mercenary' ? '#92400e' : '#374151', isPlayerTurn) }}
            title="傭兵雇用">💰 傭兵</button>
          <button
            onClick={() => togglePanel('domestic')}
            disabled={!isPlayerTurn}
            style={{ ...btnStyle(ui.activePanel === 'domestic' ? '#065f46' : '#374151', isPlayerTurn) }}
            title="内政・建設">🏗 内政</button>
          {!isMobile && <div style={{ width: 1, background: '#374151', alignSelf: 'stretch', margin: '0 4px' }} />}
          <button
            onClick={() => togglePanel('shop')}
            disabled={!isPlayerTurn}
            style={{ ...btnStyle(ui.activePanel === 'shop' ? '#b45309' : '#374151', isPlayerTurn) }}
            title="装備屋">⚔ 装備</button>
          <button
            onClick={() => togglePanel('simulation')}
            style={{ ...btnStyle(ui.activePanel === 'simulation' ? '#7c3aed' : '#374151') }}
            title="シミュレーション">🎲</button>
          <button
            onClick={() => togglePanel('achievements')}
            style={{ ...btnStyle(ui.activePanel === 'achievements' ? '#92400e' : '#374151') }}
            title="実績">🏆</button>
          <button
            onClick={() => togglePanel('wallet')}
            style={{ ...btnStyle(ui.activePanel === 'wallet' ? '#d97706' : '#374151') }}
            title="MCH Verseヒーロー連携">⛓ MCH</button>
          {!isMobile && <div style={{ width: 1, background: '#374151', alignSelf: 'stretch', margin: '0 4px' }} />}
          <button
            onClick={() => setShowSavePanel(true)}
            style={btnStyle('#065f46', canEndTurn)}
            disabled={!canEndTurn}
            title="セーブ / ロード"
          >
            💾
          </button>
          <button onClick={reset} style={btnStyle('#4b5563')} title="リセット">リセット</button>
          {!isMobile && <div style={{ width: 1, background: '#374151', alignSelf: 'stretch', margin: '0 4px' }} />}
          {autoPlay && (
            <button
              onClick={toggleFastForward}
              style={{ ...btnStyle(fastForward ? '#d97706' : '#374151') }}
              title="早送り"
            >⏩</button>
          )}
          <button
            onClick={toggleAutoPlay}
            disabled={winnerId !== null}
            style={{ ...btnStyle(autoPlay ? '#dc2626' : '#374151', winnerId === null) }}
            title={autoPlay ? 'オートプレイ停止' : 'オートプレイ開始'}
          >{autoPlay ? '⏹ AUTO' : '▶ AUTO'}</button>
          {!autoPlay && (
            <button onClick={endPlayerTurn} disabled={!canEndTurn} style={btnStyle('#2563eb', canEndTurn)}>
              ターン終了
            </button>
          )}
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

      {showSavePanel && <SaveSlotPanel onClose={() => setShowSavePanel(false)} />}
    </div>
  );
}

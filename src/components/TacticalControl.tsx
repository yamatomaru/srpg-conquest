import { useGameStore } from '../game/store';

export default function TacticalControl() {
  const { battle, nations, endBattle, endTacticalTurn } = useGameStore();
  if (!battle) return null;

  const attackerNation = nations[battle.attackerNationId];
  const defenderNation = nations[battle.defenderNationId];
  const sideLabel =
    battle.currentSide === 'attacker' ? attackerNation.name : defenderNation.name;

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
        fontSize: 14,
        color: '#f9fafb',
      }}
    >
      <div style={{ display: 'flex', gap: 24 }}>
        <span>
          <span style={{ color: '#9ca3af' }}>攻撃: </span>
          <strong style={{ color: attackerNation.color }}>{attackerNation.name}</strong>
          <span style={{ color: '#6b7280', marginLeft: 8 }}>vs</span>
          <span style={{ color: '#9ca3af', marginLeft: 8 }}>防衛: </span>
          <strong style={{ color: defenderNation.color }}>{defenderNation.name}</strong>
        </span>
        <span style={{ color: '#9ca3af' }}>
          ターン {battle.turnCount + 1}/{battle.maxTurns} —{' '}
          <strong style={{ color: '#f9fafb' }}>{sideLabel}</strong>の行動
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => endBattle('defender')}
          style={{
            padding: '6px 12px',
            background: '#4b5563',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          降参する
        </button>
        <button
          onClick={() => endBattle('attacker')}
          style={{
            padding: '6px 12px',
            background: '#16a34a',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          占領する
        </button>
        <button
          onClick={endTacticalTurn}
          style={{
            padding: '6px 14px',
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          ターン終了
        </button>
      </div>
    </div>
  );
}

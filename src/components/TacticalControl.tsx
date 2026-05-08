import { useGameStore } from '../game/store';
import { JOBS } from '../data/jobs';
import { TERRAIN_DEFS } from '../game/terrain';

export default function TacticalControl() {
  const { battle, nations, characters, isAIThinking, endBattle, endUnitTurn, useSkill, cancelSkill } = useGameStore();

  if (!battle) return null;

  const attackerNation = nations[battle.attackerNationId];
  const defenderNation = nations[battle.defenderNationId];

  const currentActiveId = battle.initiativeOrder[battle.initiativeIndex];
  const currentUnit = battle.units.find((u) => u.characterId === currentActiveId) ?? null;
  const currentChar = currentUnit ? characters[currentUnit.characterId] : null;
  const isPlayerTurn = currentUnit?.side === battle.playerSide && !isAIThinking;
  const canWait = isPlayerTurn && currentUnit !== null && !currentUnit.hasActed;
  const canUseSkill = isPlayerTurn && currentUnit !== null && !currentUnit.usedSkill && !currentUnit.hasActed;
  const skillName = currentChar ? JOBS[currentChar.jobId].skillName : '';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 24px',
        background: '#1f2937',
        borderBottom: '1px solid #374151',
        flexShrink: 0,
        fontSize: 21,
        color: '#f9fafb',
        gap: 18,
      }}
    >
      {/* 左: 対戦情報 */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexShrink: 0 }}>
        <span>
          <span style={{ color: '#9ca3af' }}>攻: </span>
          <strong style={{ color: attackerNation.color }}>{attackerNation.name}</strong>
          <span style={{ color: '#6b7280', margin: '0 9px' }}>vs</span>
          <span style={{ color: '#9ca3af' }}>守: </span>
          <strong style={{ color: defenderNation.color }}>{defenderNation.name}</strong>
        </span>
        <span style={{ color: '#9ca3af', fontSize: 18 }}>
          R{battle.turnCount + 1}/{battle.maxTurns}
        </span>
      </div>

      {/* 中央: 現在の行動ユニット + ステータス */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, fontSize: 20 }}>
        {isAIThinking ? (
          <span style={{ color: '#f59e0b' }}>AI思考中...</span>
        ) : currentUnit && currentChar ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ color: currentUnit.side === battle.playerSide ? '#60a5fa' : '#f87171', fontWeight: 'bold', fontSize: 18 }}>
                ▶ {currentChar.name}
                <span style={{ color: '#9ca3af', fontWeight: 'normal', fontSize: 14, marginLeft: 8 }}>{JOBS[currentChar.jobId].name} Lv.{currentChar.level}</span>
              </span>
              <div style={{ display: 'flex', gap: 12, fontSize: 13, color: '#9ca3af' }}>
                <span>HP <span style={{ color: currentUnit.currentHp < currentChar.maxHp * 0.3 ? '#ef4444' : '#e5e7eb' }}>{currentUnit.currentHp}/{currentChar.maxHp}</span></span>
                <span>ATK <span style={{ color: '#f87171' }}>{currentChar.atk}</span></span>
                <span>DEF <span style={{ color: '#60a5fa' }}>{currentChar.def}</span></span>
                <span>MATK <span style={{ color: '#c084fc' }}>{currentChar.matk}</span></span>
                <span>MDEF <span style={{ color: '#7dd3fc' }}>{currentChar.mdef}</span></span>
                <span>EXP <span style={{ color: '#60a5fa' }}>{currentChar.exp}/{currentChar.level * 100}</span></span>
                {currentUnit.position && (() => {
                  const t = battle.map.terrain[currentUnit.position.y]?.[currentUnit.position.x] ?? 'plain';
                  return <span>地形 <span style={{ color: '#fbbf24' }}>{TERRAIN_DEFS[t].label}</span></span>;
                })()}
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* 右: アクションボタン */}
      <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
        {battle.skillMode && isPlayerTurn && (
          <button
            onClick={() => cancelSkill()}
            style={{ padding: '9px 18px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 20 }}
          >
            スキルキャンセル
          </button>
        )}
        {canUseSkill && !battle.skillMode && (
          <button
            onClick={() => useSkill(currentActiveId)}
            style={{ padding: '9px 18px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 20 }}
          >
            ✦ {skillName}
          </button>
        )}
        {canWait && (
          <button
            onClick={() => endUnitTurn(currentActiveId)}
            style={{ padding: '9px 18px', background: '#78716c', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 20 }}
          >
            待機
          </button>
        )}
        {isPlayerTurn && (
          <button
            onClick={() => endBattle(battle.playerSide === 'attacker' ? 'defender' : 'attacker')}
            style={{ padding: '9px 18px', background: '#4b5563', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 20 }}
          >
            降参
          </button>
        )}
      </div>
    </div>
  );
}

import { useGameStore } from '../game/store';
import { JOBS } from '../data/jobs';
import { TERRAIN_DEFS } from '../game/terrain';
import { useIsMobile } from '../hooks/useIsMobile';
import { MAX_BATTLE_UNITS } from '../game/tactical/placement';

export default function TacticalControl() {
  const { battle, nations, characters, isAIThinking, endBattle, endUnitTurn, useSkill, cancelSkill, toggleAutoTactical } = useGameStore();
  const isMobile = useIsMobile();

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

  const btnSt = { padding: isMobile ? '7px 12px' : '9px 18px', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: isMobile ? 14 : 20, color: '#fff' };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isMobile ? '8px 10px' : '12px 24px',
        background: '#1f2937',
        borderBottom: '1px solid #374151',
        flexShrink: 0,
        fontSize: isMobile ? 13 : 21,
        color: '#f9fafb',
        gap: isMobile ? 8 : 18,
      }}
    >
      {/* 左: 対戦情報 */}
      <div style={{ display: 'flex', gap: isMobile ? 8 : 24, alignItems: 'center', flexShrink: 0 }}>
        <span>
          <strong style={{ color: attackerNation.color }}>{attackerNation.name}</strong>
          <span style={{ color: '#6b7280', margin: '0 6px' }}>vs</span>
          <strong style={{ color: defenderNation.color }}>{defenderNation.name}</strong>
        </span>
        <span style={{ color: '#9ca3af', fontSize: isMobile ? 12 : 18 }}>
          R{battle.turnCount + 1}/{battle.maxTurns}
        </span>
        {!isMobile && (() => {
          const atkCount = battle.units.filter((u) => u.side === 'attacker').length;
          const defCount = battle.units.filter((u) => u.side === 'defender').length;
          const totalAtk = battle.originalAttackerIds.length;
          const totalDef = battle.originalDefenderIds.length;
          const reserveAtk = totalAtk - atkCount;
          const reserveDef = totalDef - defCount;
          return (
            <span style={{ fontSize: 13, color: '#6b7280' }}>
              <span style={{ color: attackerNation.color }}>{atkCount}</span>
              {reserveAtk > 0 && <span style={{ color: '#4b5563' }}>+{reserveAtk}控</span>}
              <span style={{ margin: '0 4px', color: '#4b5563' }}>vs</span>
              <span style={{ color: defenderNation.color }}>{defCount}</span>
              {reserveDef > 0 && <span style={{ color: '#4b5563' }}>+{reserveDef}控</span>}
              <span style={{ color: '#4b5563', marginLeft: 4 }}>（上限{MAX_BATTLE_UNITS}）</span>
            </span>
          );
        })()}
      </div>

      {/* 中央: 現在の行動ユニット + ステータス */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, fontSize: isMobile ? 13 : 20, overflow: 'hidden' }}>
        {isAIThinking ? (
          <span style={{ color: '#f59e0b' }}>AI思考中...</span>
        ) : currentUnit && currentChar ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, overflow: 'hidden' }}>
            <span style={{ color: currentUnit.side === battle.playerSide ? '#60a5fa' : '#f87171', fontWeight: 'bold', fontSize: isMobile ? 13 : 18, whiteSpace: 'nowrap' }}>
              ▶ {currentChar.name}
              <span style={{ color: '#9ca3af', fontWeight: 'normal', fontSize: isMobile ? 11 : 14, marginLeft: 6 }}>Lv.{currentChar.level}</span>
            </span>
            {!isMobile && (
              <div style={{ display: 'flex', gap: 12, fontSize: 13, color: '#9ca3af' }}>
                <span>HP <span style={{ color: currentUnit.currentHp < currentChar.maxHp * 0.3 ? '#ef4444' : '#e5e7eb' }}>{currentUnit.currentHp}/{currentChar.maxHp}</span></span>
                <span>ATK <span style={{ color: '#f87171' }}>{currentChar.atk}</span></span>
                <span>DEF <span style={{ color: '#60a5fa' }}>{currentChar.def}</span></span>
                <span>MATK <span style={{ color: '#c084fc' }}>{currentChar.matk}</span></span>
                <span>MDEF <span style={{ color: '#7dd3fc' }}>{currentChar.mdef}</span></span>
                <span>EXP <span style={{ color: '#60a5fa' }}>{currentChar.exp}/{currentChar.level * 70}</span></span>
                {currentUnit.position && (() => {
                  const t = battle.map.terrain[currentUnit.position.y]?.[currentUnit.position.x] ?? 'plain';
                  return <span>地形 <span style={{ color: '#fbbf24' }}>{TERRAIN_DEFS[t].label}</span></span>;
                })()}
              </div>
            )}
            {isMobile && (
              <div style={{ fontSize: 11, color: '#9ca3af' }}>
                HP <span style={{ color: currentUnit.currentHp < currentChar.maxHp * 0.3 ? '#ef4444' : '#e5e7eb' }}>{currentUnit.currentHp}/{currentChar.maxHp}</span>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* 右: アクションボタン */}
      <div style={{ display: 'flex', gap: isMobile ? 6 : 12, flexShrink: 0 }}>
        {battle.skillMode && isPlayerTurn && (
          <button onClick={() => cancelSkill()} style={{ ...btnSt, background: '#7c3aed' }}>
            {isMobile ? 'キャンセル' : 'スキルキャンセル'}
          </button>
        )}
        {canUseSkill && !battle.skillMode && (
          <button onClick={() => useSkill(currentActiveId)} style={{ ...btnSt, background: '#7c3aed' }}>
            ✦ {skillName}
          </button>
        )}
        {canWait && (
          <button onClick={() => endUnitTurn(currentActiveId)} style={{ ...btnSt, background: '#78716c' }}>
            待機
          </button>
        )}
        <button
          onClick={toggleAutoTactical}
          style={{ ...btnSt, background: battle.autoTactical ? '#dc2626' : '#0e7490' }}
          title={battle.autoTactical ? 'オートバトル停止' : 'オートバトル: AIに委任'}
        >
          {battle.autoTactical ? '⏹ AUTO' : '🤖 AUTO'}
        </button>
        {isPlayerTurn && (
          <button
            onClick={() => endBattle(battle.playerSide === 'attacker' ? 'defender' : 'attacker')}
            style={{ ...btnSt, background: '#4b5563' }}
          >
            降参
          </button>
        )}
      </div>
    </div>
  );
}

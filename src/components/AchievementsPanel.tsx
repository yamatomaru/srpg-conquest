import { useGameStore } from '../game/store';
import { ACHIEVEMENTS, calcTotalPoints } from '../data/achievements';

export default function AchievementsPanel() {
  const { unlockedAchievementIds, playerStats, togglePanel } = useGameStore();
  const unlockedSet = new Set(unlockedAchievementIds);
  const totalPoints = calcTotalPoints(unlockedAchievementIds);
  const maxPoints = ACHIEVEMENTS.reduce((s, a) => s + a.points, 0);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) togglePanel('achievements'); }}
    >
      <div style={{
        background: '#111827', border: '1px solid #374151', borderRadius: 12,
        width: 560, maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        color: '#f9fafb', overflow: 'hidden',
      }}>
        {/* ヘッダー */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, color: '#f59e0b' }}>🏆 実績</h3>
            <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 2 }}>
              {unlockedAchievementIds.length} / {ACHIEVEMENTS.length} 解除済み　{totalPoints} / {maxPoints} pt
            </div>
          </div>
          <button
            onClick={() => togglePanel('achievements')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#6b7280', padding: 0 }}
          >×</button>
        </div>

        {/* タブ: 実績 / 統計 */}
        <div style={{ display: 'flex', overflowY: 'auto', flex: 1 }}>
          {/* 左: 実績リスト */}
          <div style={{ flex: 3, padding: '12px 16px', overflowY: 'auto', borderRight: '1px solid #1f2937' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ACHIEVEMENTS.map((ach) => {
                const unlocked = unlockedSet.has(ach.id);
                const isHidden = ach.hidden && !unlocked;
                return (
                  <div
                    key={ach.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 12px',
                      background: unlocked ? 'rgba(245,158,11,0.08)' : '#1f2937',
                      border: `1px solid ${unlocked ? '#f59e0b' : '#374151'}`,
                      borderRadius: 8,
                      opacity: isHidden ? 0.4 : 1,
                    }}
                  >
                    <div style={{ fontSize: 28, flexShrink: 0, filter: unlocked ? 'none' : 'grayscale(1)', opacity: unlocked ? 1 : 0.3 }}>
                      {isHidden ? '❓' : ach.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 'bold', color: unlocked ? '#fef3c7' : '#9ca3af' }}>
                        {isHidden ? '???（隠し実績）' : ach.title}
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                        {isHidden ? '条件不明' : ach.description}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 13, color: unlocked ? '#f59e0b' : '#4b5563', fontWeight: 'bold' }}>
                        {ach.points} pt
                      </div>
                      {unlocked && <div style={{ fontSize: 10, color: '#34d399' }}>✓ 解除済み</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 右: 統計 */}
          <div style={{ flex: 2, padding: '12px 16px', overflowY: 'auto' }}>
            <div style={{ fontSize: 13, color: '#f59e0b', fontWeight: 'bold', marginBottom: 10 }}>📊 プレイ統計</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                ['戦闘勝利', playerStats.battlesWon],
                ['戦闘敗北', playerStats.battlesLost],
                ['累計撃破', playerStats.unitsDefeated],
                ['ゲームクリア', playerStats.gamesWon],
                ['最大レベル', playerStats.maxLevelReached],
                ['最大所持金', `¥${playerStats.maxGoldHeld}`],
                ['占領した領地', playerStats.territoriesCaptured],
                ['雇用した傭兵', playerStats.mercenariesHired],
                ['完了した行軍計画', playerStats.marchPlansCompleted],
                ['渾身撃で撃破', playerStats.powerAttackKills],
                ['AoE3体同時撃破', playerStats.aoeTripleKills],
                ['最長生存(ヶ月)', playerStats.maxMonthSurvived],
                ['締結した同盟', playerStats.alliancesFormed],
                ['速攻勝利(≤3ターン)', playerStats.fastBattleWins],
                ['完全勝利', playerStats.perfectBattleWins],
              ].map(([label, val]) => (
                <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 8px', background: '#0d1117', borderRadius: 4, fontSize: 13 }}>
                  <span style={{ color: '#9ca3af' }}>{label}</span>
                  <span style={{ color: '#e5e7eb', fontWeight: 'bold' }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

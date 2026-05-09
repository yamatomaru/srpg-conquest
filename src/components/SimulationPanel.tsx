import { useState, useCallback } from 'react';
import { useGameStore } from '../game/store';
import { NATIONS } from '../data/nations';
import { runBatchSimulation } from '../game/simulation';
import type { SimStats } from '../game/simulation';

const FACTION_COLOR: Record<string, string> = {
  '朱雀': '#3b82f6', '青龍': '#a855f7', '玄武': '#6b7280',
  '黄竜': '#22c55e', '白虎': '#eab308',
};

const RUN_OPTIONS = [20, 50, 100];

export default function SimulationPanel() {
  const { togglePanel } = useGameStore();
  const [targetNationId, setTargetNationId] = useState(Object.keys(NATIONS)[0]);
  const [runs, setRuns] = useState(50);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<SimStats | null>(null);

  const startSim = useCallback(async () => {
    setRunning(true);
    setProgress(0);
    setStats(null);
    try {
      const result = await runBatchSimulation(
        targetNationId,
        runs,
        (done, total) => setProgress(Math.round((done / total) * 100)),
      );
      setStats(result);
    } finally {
      setRunning(false);
    }
  }, [targetNationId, runs]);

  const sortedNations = stats
    ? [...stats.nations].sort((a, b) => b.winRate - a.winRate)
    : [];

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) togglePanel('simulation'); }}
    >
      <div
        style={{
          background: '#1f2937', border: '1px solid #374151', borderRadius: 10,
          width: 'min(95vw, 760px)', maxHeight: '90vh',
          display: 'flex', flexDirection: 'column', color: '#f9fafb', overflow: 'hidden',
        }}
      >
        {/* ヘッダー */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #374151', flexShrink: 0 }}>
          <h3 style={{ margin: 0, fontSize: 17 }}>🎲 ゲームシミュレーション</h3>
          <button onClick={() => togglePanel('simulation')} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 22, cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* 設定パネル */}
          <div style={{ background: '#111827', borderRadius: 8, padding: 16, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>追跡する国家</div>
              <select
                value={targetNationId}
                onChange={(e) => setTargetNationId(e.target.value)}
                disabled={running}
                style={{ background: '#1f2937', color: '#f9fafb', border: '1px solid #374151', borderRadius: 4, padding: '6px 10px', fontSize: 14 }}
              >
                {Object.values(NATIONS).map((n) => (
                  <option key={n.id} value={n.id}>{n.name}（{n.faction}）</option>
                ))}
              </select>
            </div>

            <div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>試行回数</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {RUN_OPTIONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRuns(r)}
                    disabled={running}
                    style={{
                      padding: '6px 14px', border: 'none', borderRadius: 4, cursor: running ? 'default' : 'pointer',
                      fontSize: 14, fontWeight: 'bold',
                      background: runs === r ? '#2563eb' : '#374151',
                      color: '#fff', opacity: running ? 0.5 : 1,
                    }}
                  >{r}回</button>
                ))}
              </div>
            </div>

            <button
              onClick={startSim}
              disabled={running}
              style={{
                padding: '8px 20px', background: running ? '#374151' : '#16a34a',
                color: '#fff', border: 'none', borderRadius: 4, cursor: running ? 'default' : 'pointer',
                fontSize: 15, fontWeight: 'bold',
              }}
            >
              {running ? '実行中...' : '▶ シミュレーション開始'}
            </button>
          </div>

          {/* プログレスバー */}
          {running && (
            <div>
              <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 4 }}>処理中: {progress}%</div>
              <div style={{ background: '#374151', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, height: '100%', background: '#2563eb', transition: 'width 0.2s' }} />
              </div>
            </div>
          )}

          {/* 結果 */}
          {stats && !running && (
            <>
              {/* サマリー */}
              <div style={{ background: '#111827', borderRadius: 8, padding: 14, display: 'flex', flexWrap: 'wrap', gap: 20 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>試行回数</div>
                  <div style={{ fontSize: 22, fontWeight: 'bold', color: '#f9fafb' }}>{stats.runs}回</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>{stats.targetNationName} 勝率</div>
                  <div style={{ fontSize: 22, fontWeight: 'bold', color: stats.targetWinRate > 0.3 ? '#22c55e' : stats.targetWinRate > 0.1 ? '#f59e0b' : '#ef4444' }}>
                    {(stats.targetWinRate * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>平均ゲーム長</div>
                  <div style={{ fontSize: 22, fontWeight: 'bold', color: '#60a5fa' }}>{stats.avgMonths.toFixed(1)}ヶ月</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>最短 / 最長</div>
                  <div style={{ fontSize: 18, fontWeight: 'bold', color: '#9ca3af' }}>{stats.minMonths} / {stats.maxMonths}ヶ月</div>
                </div>
              </div>

              {/* 国家別勝率 */}
              <div>
                <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 8 }}>国家別勝率</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {sortedNations.map((n) => {
                    const color = FACTION_COLOR[n.faction] ?? '#6b7280';
                    const pct = n.winRate * 100;
                    return (
                      <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 130, fontSize: 13, color: '#e5e7eb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <span style={{ color, marginRight: 5 }}>●</span>{n.name}
                        </div>
                        <div style={{ flex: 1, background: '#374151', borderRadius: 3, height: 18, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 0.4s' }} />
                        </div>
                        <div style={{ width: 52, textAlign: 'right', fontSize: 13, color: '#f9fafb', fontWeight: 'bold' }}>{pct.toFixed(1)}%</div>
                        <div style={{ width: 60, textAlign: 'right', fontSize: 11, color: '#6b7280' }}>平均{n.avgFinalTerritories.toFixed(1)}領</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 改善提案 */}
              <div>
                <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 8 }}>改善提案</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {stats.suggestions.map((s, i) => (
                    <div
                      key={i}
                      style={{
                        background: '#111827', border: '1px solid #374151', borderRadius: 6,
                        padding: '10px 14px', fontSize: 13, color: '#d1d5db', lineHeight: 1.6,
                      }}
                    >{s}</div>
                  ))}
                </div>
              </div>

              {/* 勝者分布グラフ */}
              <div>
                <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 8 }}>勝者の勢力分布 ({stats.runs}試合)</div>
                <div style={{ display: 'flex', height: 24, borderRadius: 4, overflow: 'hidden', gap: 1 }}>
                  {sortedNations.filter((n) => n.wins > 0).map((n) => {
                    const color = FACTION_COLOR[n.faction] ?? '#6b7280';
                    return (
                      <div
                        key={n.id}
                        style={{ flex: n.wins, background: color, position: 'relative' }}
                        title={`${n.name}: ${n.wins}勝`}
                      />
                    );
                  })}
                  {/* 引き分け / 未決着 */}
                  {(() => {
                    const decided = sortedNations.reduce((s, n) => s + n.wins, 0);
                    const undecided = stats.runs - decided;
                    return undecided > 0 ? (
                      <div style={{ flex: undecided, background: '#374151' }} title={`未決着: ${undecided}`} />
                    ) : null;
                  })()}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 6 }}>
                  {sortedNations.filter((n) => n.wins > 0).map((n) => (
                    <span key={n.id} style={{ fontSize: 11, color: FACTION_COLOR[n.faction] ?? '#6b7280' }}>
                      ● {n.name} {n.wins}勝
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

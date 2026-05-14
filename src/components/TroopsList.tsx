import { useGameStore } from '../game/store';
import { JOBS, JOB_ABBR } from '../data/jobs';
import { useIsMobile } from '../hooks/useIsMobile';

const JOB_COLOR: Record<string, string> = {
  shielder: '#6b7280', warrior: '#ef4444', spearman: '#f59e0b',
  archer: '#22c55e', mage: '#a855f7', knight: '#f97316', priest: '#ec4899',
};

export default function TroopsList() {
  const { nations, territories, characters, actedCharIds, togglePanel } = useGameStore();
  const isMobile = useIsMobile();
  const player = Object.values(nations).find((n) => n.isPlayer)!;

  const charLocation: Record<string, string> = {};
  Object.values(territories).forEach((t) => {
    t.garrisonIds.forEach((cId) => { charLocation[cId] = t.name; });
  });

  const chars = player.characterIds.map((id) => characters[id]).filter(Boolean);
  chars.sort((a, b) => {
    if (a.hp <= 0 && b.hp > 0) return 1;
    if (b.hp <= 0 && a.hp > 0) return -1;
    return b.level - a.level;
  });

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) togglePanel('troops'); }}
    >
      <div
        style={{
          background: '#1f2937', border: '1px solid #374151', borderRadius: 8,
          width: isMobile ? '95vw' : 700, maxHeight: '85vh',
          display: 'flex', flexDirection: 'column', color: '#f9fafb',
        }}
      >
        {/* ヘッダー */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #374151', flexShrink: 0 }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>部隊一覧 — {player.name}（{chars.length}名）</h3>
          <button onClick={() => togglePanel('troops')} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* テーブル（横スクロール + 縦スクロール） */}
        <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1 }}>
          <div style={{ minWidth: 580 }}>
            {/* テーブルヘッダー */}
            <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 60px 80px 100px 56px 56px 56px 56px 56px', gap: 0, padding: '8px 16px', background: '#111827', fontSize: 12, color: '#6b7280', borderBottom: '1px solid #374151' }}>
              <span></span>
              <span>名前</span>
              <span style={{ textAlign: 'center' }}>Lv</span>
              <span>EXP</span>
              <span>場所</span>
              <span style={{ textAlign: 'center' }}>ATK</span>
              <span style={{ textAlign: 'center' }}>DEF</span>
              <span style={{ textAlign: 'center' }}>MATK</span>
              <span style={{ textAlign: 'center' }}>MDEF</span>
              <span style={{ textAlign: 'center' }}>MOV</span>
            </div>

            {/* キャラ一覧 */}
            {chars.map((ch) => {
              const isDead = ch.hp <= 0;
              const isActed = actedCharIds.includes(ch.id);
              const location = charLocation[ch.id] ?? '—';
              const expPct = Math.min(100, (ch.exp / (ch.level * 100)) * 100);
              const hpRatio = ch.maxHp > 0 ? ch.hp / ch.maxHp : 0;

              return (
                <div
                  key={ch.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '28px 1fr 60px 80px 100px 56px 56px 56px 56px 56px',
                    alignItems: 'center',
                    gap: 0,
                    padding: '7px 16px',
                    borderBottom: '1px solid #1f2937',
                    opacity: isDead ? 0.45 : 1,
                    background: isDead ? '#0d1117' : 'transparent',
                    fontSize: 13,
                  }}
                >
                  <div style={{ width: 22, height: 22, borderRadius: 4, background: JOB_COLOR[ch.jobId] ?? '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 'bold' }}>
                    {JOB_ABBR[ch.jobId] ?? '?'}
                  </div>

                  <div>
                    <div style={{ fontWeight: 'bold', color: isDead ? '#9ca3af' : '#e5e7eb', fontSize: 13 }}>
                      {ch.name}
                      {isDead && <span style={{ color: '#ef4444', fontSize: 11, marginLeft: 6 }}>回復中</span>}
                      {isActed && !isDead && <span style={{ color: '#f59e0b', fontSize: 11, marginLeft: 6 }}>移動済</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <div style={{ flex: 1, maxWidth: 80, height: 4, background: '#374151', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${hpRatio * 100}%`, height: '100%', background: hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.25 ? '#f59e0b' : '#ef4444' }} />
                      </div>
                      <span style={{ fontSize: 11, color: '#9ca3af' }}>{ch.hp}/{ch.maxHp}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'center', color: '#fbbf24', fontWeight: 'bold' }}>{ch.level}</div>

                  <div>
                    <div style={{ height: 4, background: '#374151', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${expPct}%`, height: '100%', background: '#60a5fa' }} />
                    </div>
                    <div style={{ fontSize: 10, color: '#6b7280', marginTop: 1 }}>{ch.exp}/{ch.level * 100}</div>
                  </div>

                  <div style={{ fontSize: 12, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{location}</div>
                  <div style={{ textAlign: 'center', color: '#f87171' }}>{ch.atk}</div>
                  <div style={{ textAlign: 'center', color: '#60a5fa' }}>{ch.def}</div>
                  <div style={{ textAlign: 'center', color: '#c084fc' }}>{ch.matk}</div>
                  <div style={{ textAlign: 'center', color: '#7dd3fc' }}>{ch.mdef}</div>
                  <div style={{ textAlign: 'center', color: '#34d399' }}>{ch.mov}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 凡例 */}
        <div style={{ padding: '8px 16px', borderTop: '1px solid #374151', fontSize: 12, color: '#6b7280', display: 'flex', gap: 16, flexShrink: 0 }}>
          {Object.entries(JOBS).map(([id, job]) => (
            <span key={id}><span style={{ color: JOB_COLOR[id] }}>●</span> {job.name}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

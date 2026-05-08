import { useGameStore } from '../game/store';
import { JOBS, JOB_ABBR } from '../data/jobs';
import type { MercTemplate } from '../game/types';

const JOB_COLOR: Record<string, string> = {
  shielder: '#6b7280', warrior: '#ef4444', spearman: '#f59e0b',
  archer: '#22c55e', mage: '#a855f7',
};

// charId のフォーマット: merc_${merc.id}_m${month}
// merc.id が "mch_01" なら charId = "merc_mch_01_m3"
function isHired(mercId: string, mercDurations: Record<string, number>): boolean {
  return Object.keys(mercDurations).some((cId) => cId.startsWith(`merc_${mercId}_`));
}

function StatGrid({ merc }: { merc: MercTemplate }) {
  const job = JOBS[merc.jobId];
  const lv = merc.level - 1;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 3, fontSize: 11 }}>
      {([
        ['HP',   job.baseHp   + lv * 3, '#e5e7eb'],
        ['ATK',  job.baseAtk  + lv,     '#f87171'],
        ['DEF',  job.baseDef  + lv,     '#60a5fa'],
        ['MATK', job.baseMatk + lv,     '#c084fc'],
        ['MDEF', job.baseMdef + lv,     '#7dd3fc'],
        ['MOV',  job.baseMov,           '#34d399'],
      ] as [string, number, string][]).map(([label, val, color]) => (
        <div key={label} style={{ textAlign: 'center', background: '#0d1117', borderRadius: 3, padding: '3px 0' }}>
          <div style={{ color: '#4b5563', fontSize: 9 }}>{label}</div>
          <div style={{ color, fontWeight: 'bold' }}>{val}</div>
        </div>
      ))}
    </div>
  );
}

export default function MercenaryPanel() {
  const { nations, mercPool, mercDurations, characters, togglePanel, hireMercenary } = useGameStore();
  const player = Object.values(nations).find((n) => n.isPlayer)!;

  const mchMercs  = mercPool.filter((m) => m.isMCH);
  const baseMercs = mercPool.filter((m) => !m.isMCH);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) togglePanel('mercenary'); }}
    >
      <div
        style={{
          background: '#111827', border: '1px solid #374151', borderRadius: 10,
          width: 580, maxHeight: '88vh', display: 'flex', flexDirection: 'column', color: '#f9fafb',
        }}
      >
        {/* ヘッダー */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #374151' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17 }}>💰 傭兵雇用</h3>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 3 }}>
              所持金: <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>¥{player.gold.toLocaleString()}</span>
              <span style={{ marginLeft: 12 }}>雇用期間: 4ヶ月（本拠地に配置）</span>
            </div>
          </div>
          <button
            onClick={() => togglePanel('mercenary')}
            style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}
          >×</button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>

          {/* ── MCHヒーロー ─────────────────────────────── */}
          {mchMercs.length > 0 && (
            <div style={{ padding: '12px 16px 0' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
                padding: '6px 10px', background: 'rgba(124,58,237,0.15)',
                border: '1px solid rgba(124,58,237,0.4)', borderRadius: 6,
              }}>
                <span style={{ fontSize: 14 }}>✦</span>
                <span style={{ fontSize: 13, fontWeight: 'bold', color: '#c084fc' }}>
                  MyCryptoHeroes ヒーロー
                </span>
                <span style={{ fontSize: 11, color: '#7c3aed', background: 'rgba(124,58,237,0.3)', borderRadius: 4, padding: '1px 6px' }}>
                  {player.faction}勢力限定
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                {mchMercs.map((merc) => {
                  const hired = isHired(merc.id, mercDurations);
                  const canHire = !hired && player.gold >= merc.cost;
                  const job = JOBS[merc.jobId];

                  return (
                    <div
                      key={merc.id}
                      style={{
                        background: hired ? '#1a1a1a' : '#1a1225',
                        border: `1px solid ${hired ? '#374151' : '#5b21b6'}`,
                        borderRadius: 8, padding: '12px', opacity: hired ? 0.5 : 1,
                        display: 'flex', flexDirection: 'column', gap: 8,
                      }}
                    >
                      {/* アイコン + 名前 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 52, height: 52, borderRadius: 10, flexShrink: 0,
                          background: 'linear-gradient(135deg, #4c1d95, #7c3aed)',
                          border: '2px solid #7c3aed',
                          overflow: 'hidden',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 28,
                        }}>
                          {merc.imageUrl ? (
                            <img
                              src={merc.imageUrl}
                              alt={merc.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                                (e.currentTarget.nextSibling as HTMLElement | null)?.style && ((e.currentTarget.nextSibling as HTMLElement).style.display = 'block');
                              }}
                            />
                          ) : null}
                          <span style={{ display: merc.imageUrl ? 'none' : 'block' }}>{merc.iconEmoji ?? '⚔'}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 'bold', fontSize: 14, color: '#e9d5ff' }}>{merc.name}</span>
                            <span style={{ fontSize: 9, background: '#7c3aed', color: '#fff', borderRadius: 3, padding: '1px 4px', flexShrink: 0 }}>MCH</span>
                          </div>
                          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                            <span style={{ color: JOB_COLOR[merc.jobId] }}>■</span>
                            {' '}{job.name} Lv.{merc.level}
                          </div>
                          <div style={{ fontSize: 11, color: '#7c3aed', marginTop: 1 }}>
                            ✦ {job.skillName}
                          </div>
                        </div>
                      </div>

                      <StatGrid merc={merc} />

                      <button
                        onClick={() => !hired && hireMercenary(merc.id)}
                        disabled={!canHire}
                        style={{
                          padding: '7px', fontSize: 13, borderRadius: 5, border: 'none',
                          cursor: canHire ? 'pointer' : 'not-allowed',
                          background: hired ? '#374151' : canHire ? '#7c3aed' : '#374151',
                          color: hired ? '#6b7280' : canHire ? '#fff' : '#6b7280',
                          fontWeight: 'bold',
                        }}
                      >
                        {hired ? '雇用済み' : player.gold < merc.cost ? `残高不足 (¥${merc.cost})` : `雇用 ¥${merc.cost}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── 通常傭兵 ──────────────────────────────────── */}
          {baseMercs.length > 0 && (
            <div style={{ padding: '0 16px 12px' }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, paddingTop: 4,
                borderTop: mchMercs.length > 0 ? '1px solid #1f2937' : undefined }}>
                通常傭兵
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {baseMercs.map((merc) => {
                  const hired = isHired(merc.id, mercDurations);
                  const canHire = !hired && player.gold >= merc.cost;
                  const job = JOBS[merc.jobId];

                  return (
                    <div
                      key={merc.id}
                      style={{
                        background: '#1f2937', border: '1px solid #374151', borderRadius: 6,
                        padding: '10px 12px', opacity: hired ? 0.45 : 1,
                        display: 'flex', flexDirection: 'column', gap: 7,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {/* ジョブアイコン */}
                        <div style={{
                          width: 36, height: 36, borderRadius: 6, flexShrink: 0,
                          background: JOB_COLOR[merc.jobId],
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14, color: '#fff', fontWeight: 'bold',
                        }}>
                          {JOB_ABBR[merc.jobId]}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 'bold', fontSize: 13 }}>{merc.name}</div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>{job.name} Lv.{merc.level}</div>
                        </div>
                        <button
                          onClick={() => !hired && hireMercenary(merc.id)}
                          disabled={!canHire}
                          style={{
                            padding: '5px 14px', fontSize: 12, borderRadius: 4, border: 'none',
                            cursor: canHire ? 'pointer' : 'not-allowed',
                            background: hired ? '#374151' : canHire ? '#d97706' : '#374151',
                            color: hired ? '#6b7280' : canHire ? '#fff' : '#6b7280',
                            fontWeight: 'bold', flexShrink: 0,
                          }}
                        >
                          {hired ? '雇用済' : `¥${merc.cost}`}
                        </button>
                      </div>
                      <StatGrid merc={merc} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── 雇用中の傭兵 ──────────────────────────────── */}
          {Object.keys(mercDurations).length > 0 && (
            <div style={{
              margin: '0 16px 16px', padding: '10px 14px',
              background: '#0d1117', border: '1px solid #1f2937', borderRadius: 6,
            }}>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>現在雇用中</div>
              {Object.entries(mercDurations).map(([cId, months]) => {
                const ch = characters[cId];
                if (!ch) return null;
                const isMCH = cId.includes('mch_');
                return (
                  <div key={cId} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontSize: 12 }}>
                    <span style={{ color: isMCH ? '#c084fc' : '#9ca3af' }}>
                      {isMCH ? '✦' : '·'}
                    </span>
                    <span style={{ flex: 1, color: '#d1d5db' }}>
                      {ch.name}
                      <span style={{ color: '#6b7280', marginLeft: 4 }}>({JOBS[ch.jobId].name} Lv.{ch.level})</span>
                    </span>
                    <span style={{ color: months <= 1 ? '#ef4444' : '#f59e0b' }}>残{months}ヶ月</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

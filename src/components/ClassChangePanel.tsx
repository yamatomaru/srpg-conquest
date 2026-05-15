import { useState } from 'react';
import { useGameStore } from '../game/store';
import { JOBS, JOB_ABBR } from '../data/jobs';
import { CLASS_CHANGES, getClassChange, isTier2 } from '../data/classChange';

const TIER2_COLOR: Record<string, string> = {
  paladin: '#f0c040',
  hero:    '#f87171',
  lancer:  '#4ade80',
  ranger:  '#34d399',
  sage:    '#e879f9',
};

const JOB_COLOR: Record<string, string> = {
  shielder: '#6b7280', warrior: '#ef4444', spearman: '#f59e0b',
  archer: '#22c55e', mage: '#a855f7', knight: '#f97316', priest: '#ec4899',
  paladin: '#f0c040', hero: '#f87171', lancer: '#4ade80', ranger: '#34d399', sage: '#e879f9',
};

interface Props {
  onClose: () => void;
}

export default function ClassChangePanel({ onClose }: Props) {
  const { nations, characters, classChange } = useGameStore();
  const player = Object.values(nations).find((n) => n.isPlayer);
  if (!player) return null;

  const [confirmCharId, setConfirmCharId] = useState<string | null>(null);

  // 昇格可能キャラ (Tier1, Lv5+, 生存)
  const eligibleChars = player.characterIds
    .map((id) => characters[id])
    .filter((ch) => ch && !isTier2(ch.jobId) && getClassChange(ch.jobId) && ch.hp > 0 && ch.level >= 5);

  // Tier2昇格済みキャラ
  const promotedChars = player.characterIds
    .map((id) => characters[id])
    .filter((ch) => ch && isTier2(ch.jobId));

  const confirmChar = confirmCharId ? characters[confirmCharId] : null;
  const confirmDef = confirmChar ? getClassChange(confirmChar.jobId) : null;

  const handleClassChange = (charId: string) => {
    classChange(charId);
    setConfirmCharId(null);
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: '#111827', border: '2px solid #374151', borderRadius: 14,
          padding: '24px 28px', maxWidth: 600, width: '92%', maxHeight: '85vh',
          overflowY: 'auto', color: '#f9fafb', fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* ヘッダー */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 'bold' }}>⭐ クラスチェンジ</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
              Lv5以上のキャラクターを上位職に昇格できます（¥200）
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 22, cursor: 'pointer' }}>✕</button>
        </div>

        {/* 所持金 */}
        <div style={{ fontSize: 13, color: '#fbbf24', marginBottom: 16 }}>
          所持金: ¥{player.gold.toLocaleString()}
        </div>

        {/* 昇格可能キャラ一覧 */}
        {eligibleChars.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {eligibleChars.map((ch) => {
              const def = getClassChange(ch.jobId)!;
              const canAfford = player.gold >= def.cost;
              const fromJob = JOBS[ch.jobId];

              return (
                <div
                  key={ch.id}
                  style={{
                    background: '#1f2937',
                    border: `1px solid ${canAfford ? TIER2_COLOR[def.to] ?? '#374151' : '#374151'}`,
                    borderRadius: 10, padding: '14px 16px',
                    opacity: canAfford ? 1 : 0.6,
                  }}
                >
                  {/* キャラ名・現在職 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <span style={{ fontSize: 15, fontWeight: 'bold', color: '#f9fafb' }}>{ch.name}</span>
                      <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 8 }}>Lv{ch.level}</span>
                    </div>
                    <button
                      onClick={() => setConfirmCharId(ch.id)}
                      disabled={!canAfford}
                      style={{
                        padding: '5px 16px',
                        background: canAfford ? (TIER2_COLOR[def.to] ?? '#1d4ed8') : '#374151',
                        color: canAfford ? '#111' : '#6b7280',
                        border: 'none', borderRadius: 6,
                        cursor: canAfford ? 'pointer' : 'default',
                        fontSize: 13, fontWeight: 'bold',
                      }}
                    >
                      昇格 ¥{def.cost}
                    </button>
                  </div>

                  {/* 職業変化 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 8,
                        background: JOB_COLOR[ch.jobId] + '44',
                        border: `1px solid ${JOB_COLOR[ch.jobId]}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 'bold', color: JOB_COLOR[ch.jobId],
                      }}>{JOB_ABBR[ch.jobId]}</div>
                      <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{fromJob.name}</div>
                    </div>
                    <span style={{ color: '#fbbf24', fontSize: 18 }}>→</span>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 8,
                        background: (TIER2_COLOR[def.to] ?? '#374151') + '44',
                        border: `1px solid ${TIER2_COLOR[def.to] ?? '#374151'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 'bold', color: TIER2_COLOR[def.to] ?? '#f9fafb',
                      }}>{JOB_ABBR[def.to]}</div>
                      <div style={{ fontSize: 10, color: '#fbbf24', marginTop: 2 }}>{def.toName}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.6 }}>
                        {def.description}
                      </div>
                      <div style={{ fontSize: 11, color: '#fbbf24', marginTop: 3 }}>
                        スキル: {def.toSkillName}
                      </div>
                    </div>
                  </div>

                  {/* ステータス変化 */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[
                      { label: 'HP', val: def.bonusHp, cur: ch.maxHp },
                      { label: 'ATK', val: def.bonusAtk, cur: ch.atk },
                      { label: 'DEF', val: def.bonusDef, cur: ch.def },
                      { label: 'MATK', val: def.bonusMatk, cur: ch.matk },
                      { label: 'MDEF', val: def.bonusMdef, cur: ch.mdef },
                      { label: 'MOV', val: def.bonusMov, cur: ch.mov },
                      { label: 'RNG', val: def.bonusRange, cur: ch.range },
                    ].filter((s) => s.val > 0).map((s) => (
                      <div
                        key={s.label}
                        style={{
                          background: '#0d1117', borderRadius: 6, padding: '3px 8px',
                          fontSize: 11, color: '#34d399',
                        }}
                      >
                        {s.label}: {s.cur} <span style={{ color: '#86efac' }}>+{s.val}</span> → {s.cur + s.val}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20, padding: '16px 0', textAlign: 'center' }}>
            昇格可能なキャラクターはいません（Lv5以上が必要）
          </div>
        )}

        {/* 昇格済みキャラ */}
        {promotedChars.length > 0 && (
          <div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, borderTop: '1px solid #374151', paddingTop: 12 }}>
              昇格済みキャラクター
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {promotedChars.map((ch) => (
                <div
                  key={ch.id}
                  style={{
                    background: '#1f2937', border: `1px solid ${JOB_COLOR[ch.jobId] ?? '#374151'}`,
                    borderRadius: 8, padding: '6px 12px',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <div style={{
                    width: 22, height: 22, borderRadius: 4,
                    background: JOB_COLOR[ch.jobId] + '44',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 'bold', color: JOB_COLOR[ch.jobId],
                  }}>
                    {JOB_ABBR[ch.jobId]}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#f9fafb' }}>{ch.name}</div>
                    <div style={{ fontSize: 10, color: JOB_COLOR[ch.jobId] }}>{JOBS[ch.jobId]?.name}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 職業一覧（説明） */}
        <div style={{ marginTop: 20, borderTop: '1px solid #374151', paddingTop: 16 }}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>昇格ルート</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {CLASS_CHANGES.map((def) => (
              <div key={def.from} style={{ fontSize: 11, color: '#9ca3af', display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ color: JOB_COLOR[def.from] }}>{JOBS[def.from]?.name}</span>
                <span>→</span>
                <span style={{ color: TIER2_COLOR[def.to] ?? '#fbbf24', fontWeight: 'bold' }}>{def.toName}</span>
                <span style={{ color: '#4b5563' }}>（スキル: {def.toSkillName}）</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 確認モーダル */}
      {confirmChar && confirmDef && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 250,
          }}
          onClick={() => setConfirmCharId(null)}
        >
          <div
            style={{
              background: '#1f2937', border: `2px solid ${TIER2_COLOR[confirmDef.to] ?? '#374151'}`,
              borderRadius: 12, padding: '24px 28px', maxWidth: 380, width: '90%',
              color: '#f9fafb',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
              ⭐ {confirmChar.name} を昇格しますか？
            </div>
            <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16 }}>
              {JOBS[confirmChar.jobId]?.name} → <span style={{ color: TIER2_COLOR[confirmDef.to] }}>{confirmDef.toName}</span>
            </div>
            <div style={{ fontSize: 13, color: '#fbbf24', marginBottom: 20 }}>
              費用: ¥{confirmDef.cost}（残り ¥{player.gold - confirmDef.cost}）
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmCharId(null)}
                style={{ padding: '8px 18px', background: '#374151', color: '#e5e7eb', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
              >
                キャンセル
              </button>
              <button
                onClick={() => handleClassChange(confirmChar.id)}
                style={{
                  padding: '8px 22px',
                  background: TIER2_COLOR[confirmDef.to] ?? '#1d4ed8',
                  color: '#111', border: 'none', borderRadius: 6,
                  cursor: 'pointer', fontSize: 13, fontWeight: 'bold',
                }}
              >
                昇格する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

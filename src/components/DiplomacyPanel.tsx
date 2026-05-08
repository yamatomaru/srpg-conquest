import { useGameStore } from '../game/store';

const STATUS_LABEL: Record<string, string> = {
  neutral: '中立',
  alliance: '同盟',
  war: '交戦',
};
const STATUS_COLOR: Record<string, string> = {
  neutral: '#9ca3af',
  alliance: '#22c55e',
  war: '#ef4444',
};

export default function DiplomacyPanel() {
  const { nations, relations, togglePanel, proposeAlliance, declareWar } = useGameStore();
  const player = Object.values(nations).find((n) => n.isPlayer)!;
  const aiNations = Object.values(nations).filter((n) => !n.isPlayer);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) togglePanel('diplomacy'); }}
    >
      <div
        style={{
          background: '#1f2937', border: '1px solid #374151', borderRadius: 8,
          width: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column', color: '#f9fafb',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #374151' }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>🤝 外交</h3>
          <button onClick={() => togglePanel('diplomacy')} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 22, cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ padding: '12px 20px', fontSize: 13, color: '#9ca3af', borderBottom: '1px solid #374151' }}>
          <span style={{ color: '#fbbf24' }}>¥{player.gold}</span> 所持 / 同盟締結コスト: <span style={{ color: '#22c55e' }}>¥200</span>（5ヶ月間）
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0' }}>
          {aiNations.map((nation) => {
            const rel = relations[nation.id] ?? { status: 'neutral', turnsLeft: 0 };
            const canAlly = rel.status !== 'alliance' && !nation.defeated && player.gold >= 200;
            const canWar = rel.status !== 'war' && !nation.defeated;

            return (
              <div
                key={nation.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 20px', borderBottom: '1px solid #1f2937',
                  opacity: nation.defeated ? 0.4 : 1,
                }}
              >
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: nation.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', fontSize: 14 }}>{nation.name}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                    {nation.defeated ? '滅亡' : (
                      <>
                        <span style={{ color: STATUS_COLOR[rel.status] }}>【{STATUS_LABEL[rel.status]}】</span>
                        {rel.status === 'alliance' && <span> 残{rel.turnsLeft}ヶ月</span>}
                      </>
                    )}
                  </div>
                </div>
                {!nation.defeated && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => proposeAlliance(nation.id)}
                      disabled={!canAlly}
                      style={{
                        padding: '5px 12px', fontSize: 12, borderRadius: 4, border: 'none', cursor: canAlly ? 'pointer' : 'not-allowed',
                        background: canAlly ? '#065f46' : '#1f2937', color: canAlly ? '#fff' : '#4b5563',
                      }}
                    >
                      同盟¥200
                    </button>
                    <button
                      onClick={() => declareWar(nation.id)}
                      disabled={!canWar}
                      style={{
                        padding: '5px 12px', fontSize: 12, borderRadius: 4, border: 'none', cursor: canWar ? 'pointer' : 'not-allowed',
                        background: canWar ? '#7f1d1d' : '#1f2937', color: canWar ? '#fff' : '#4b5563',
                      }}
                    >
                      宣戦布告
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

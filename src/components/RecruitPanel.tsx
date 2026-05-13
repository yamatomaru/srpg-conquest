import { useGameStore } from '../game/store';

const JOB_NAME: Record<string, string> = {
  shielder: '盾士', warrior: '戦士', spearman: '槍士', archer: '弓師', mage: '魔術師',
};
const JOB_COLOR: Record<string, string> = {
  shielder: '#60a5fa', warrior: '#f87171', spearman: '#4ade80', archer: '#facc15', mage: '#c084fc',
};

const RECRUIT_COST = 150;

export default function RecruitPanel() {
  const { recruitOffer, characters, nations, acceptRecruit, dismissRecruit } = useGameStore();

  if (!recruitOffer) return null;

  const player = Object.values(nations).find((n) => n.isPlayer);
  const playerGold = player?.gold ?? 0;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 300, fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          background: '#1f2937', border: '2px solid #f59e0b', borderRadius: 12,
          padding: '24px 28px', width: 'min(480px, 92vw)', color: '#f9fafb',
        }}
      >
        <div style={{ marginBottom: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 'bold', color: '#f59e0b', marginBottom: 4 }}>
            ⚔ 敗走兵の勧誘
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>
            {recruitOffer.nationName} の兵士が降伏しました。仲間にしますか？
          </div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
            所持金: {playerGold}G　雇用コスト: {RECRUIT_COST}G / 人
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {recruitOffer.charIds.map((charId) => {
            const ch = characters[charId];
            if (!ch) return null;
            const canAfford = playerGold >= RECRUIT_COST;
            const jobColor = JOB_COLOR[ch.jobId] ?? '#9ca3af';
            return (
              <div
                key={charId}
                style={{
                  background: '#374151', borderRadius: 8, padding: '10px 14px',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}
              >
                <div
                  style={{
                    width: 36, height: 36, borderRadius: 6, background: '#4b5563',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, flexShrink: 0,
                    border: `2px solid ${jobColor}`,
                  }}
                >
                  {ch.jobId === 'shielder' ? '🛡' : ch.jobId === 'warrior' ? '⚔' : ch.jobId === 'spearman' ? '🗡' : ch.jobId === 'archer' ? '🏹' : '✨'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 'bold', color: '#f9fafb' }}>{ch.name}</div>
                  <div style={{ fontSize: 11, color: jobColor }}>
                    {JOB_NAME[ch.jobId]} Lv{ch.level}
                  </div>
                  <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>
                    HP {ch.maxHp}　ATK {ch.atk}　DEF {ch.def}　MATK {ch.matk}
                  </div>
                  <div style={{ fontSize: 10, color: '#9ca3af' }}>※ 加入時 HP 50% で復帰</div>
                </div>
                <button
                  onClick={() => acceptRecruit(charId)}
                  disabled={!canAfford}
                  style={{
                    background: canAfford ? '#d97706' : '#374151',
                    border: `1px solid ${canAfford ? '#f59e0b' : '#4b5563'}`,
                    borderRadius: 6, padding: '6px 12px', cursor: canAfford ? 'pointer' : 'not-allowed',
                    color: canAfford ? '#fff' : '#6b7280', fontSize: 12, fontWeight: 'bold', flexShrink: 0,
                  }}
                >
                  {RECRUIT_COST}G<br />仲間に
                </button>
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={dismissRecruit}
            style={{
              background: 'transparent', border: '1px solid #4b5563', borderRadius: 6,
              padding: '8px 24px', color: '#9ca3af', cursor: 'pointer', fontSize: 13,
            }}
          >
            スキップして閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

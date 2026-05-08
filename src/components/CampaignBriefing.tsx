import { useGameStore } from '../game/store';
import { CAMPAIGNS } from '../data/campaigns';

export default function CampaignBriefing() {
  const { campaignScenario, campaignProgress, loadScenario, reset } = useGameStore();

  if (!campaignScenario || !campaignProgress) return null;

  const campaign = CAMPAIGNS.find((c) => c.id === campaignProgress.campaignId);
  const scenarioIndex = campaign?.scenarios.findIndex((s) => s.id === campaignScenario.id) ?? 0;

  const handleStart = () => {
    loadScenario(scenarioIndex);
  };

  return (
    <div
      style={{
        height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', background: '#0d1117', color: '#f9fafb',
        fontFamily: 'system-ui, sans-serif', padding: '40px 24px',
      }}
    >
      <div style={{ maxWidth: 680, width: '100%' }}>
        {/* 章タイトル */}
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#60a5fa', letterSpacing: 4, marginBottom: 8 }}>
            {campaign?.title} — 第{campaignScenario.chapter}章
          </div>
          <h1 style={{ fontSize: 32, margin: 0, color: '#f9fafb' }}>{campaignScenario.title}</h1>
        </div>

        {/* ストーリーテキスト */}
        <div
          style={{
            background: '#111827', border: '1px solid #374151', borderRadius: 10,
            padding: '28px 32px', marginBottom: 28, lineHeight: 2.0, fontSize: 15,
            color: '#d1d5db', whiteSpace: 'pre-line',
          }}
        >
          {campaignScenario.briefing}
        </div>

        {/* 引き継ぎ情報 */}
        {Object.keys(campaignProgress.carryOver).length > 0 && (
          <div
            style={{
              background: '#1a2a1a', border: '1px solid #166534', borderRadius: 8,
              padding: '14px 20px', marginBottom: 24, fontSize: 13,
            }}
          >
            <div style={{ color: '#22c55e', fontWeight: 'bold', marginBottom: 6 }}>
              ✓ 前章からの引き継ぎ
            </div>
            <div style={{ color: '#86efac', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {Object.entries(campaignProgress.carryOver)
                .filter(([, co]) => co.level > 1)
                .map(([id, co]) => (
                  <span key={id} style={{ background: '#14532d', borderRadius: 4, padding: '2px 8px' }}>
                    Lv.{co.level}
                  </span>
                ))}
            </div>
            <div style={{ color: '#6b7280', marginTop: 6, fontSize: 12 }}>
              {Object.values(campaignProgress.carryOver).filter((c) => c.level > 1).length}名のキャラクターがレベルアップを引き継いでいます
            </div>
          </div>
        )}

        {/* 開始ボタン */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            onClick={reset}
            style={{
              padding: '12px 28px', fontSize: 14, background: 'none',
              border: '1px solid #374151', color: '#9ca3af', borderRadius: 8, cursor: 'pointer',
            }}
          >
            タイトルに戻る
          </button>
          <button
            onClick={handleStart}
            style={{
              padding: '14px 48px', fontSize: 18, fontWeight: 'bold',
              background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer',
            }}
          >
            出陣 ⚔
          </button>
        </div>
      </div>
    </div>
  );
}

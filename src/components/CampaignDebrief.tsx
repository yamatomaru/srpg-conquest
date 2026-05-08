import { useGameStore } from '../game/store';
import { CAMPAIGNS } from '../data/campaigns';

export default function CampaignDebrief() {
  const { campaignScenario, campaignProgress, phase, loadScenario, reset } = useGameStore();

  if (phase !== 'campaign_debrief' || !campaignScenario || !campaignProgress) return null;

  const campaign = CAMPAIGNS.find((c) => c.id === campaignProgress.campaignId);

  // 前のシナリオのindexを求める（progressは既にnextIndexを指している）
  const prevScenarioIndex = campaignProgress.scenarioIndex - 1;
  const prevScenario = campaign?.scenarios[prevScenarioIndex];

  // 現在のシナリオ（次章）があるか
  const currentIndex = campaignProgress.scenarioIndex;
  const hasNext = campaign && currentIndex < campaign.scenarios.length;
  const nextScenario = hasNext ? campaign!.scenarios[currentIndex] : null;
  const isCampaignComplete = !hasNext;

  const handleNext = () => {
    if (hasNext) {
      loadScenario(currentIndex);
    }
  };

  // 実際の成功判定: winnerId が player.id か、またはシナリオがsurvive条件を満たしたか
  // ここでは campaignProgress.scenarioIndex が進んでいれば成功とみなす
  const isSuccess = prevScenarioIndex >= 0;

  return (
    <div
      style={{
        height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', background: '#0d1117', color: '#f9fafb',
        fontFamily: 'system-ui, sans-serif', padding: '40px 24px',
      }}
    >
      <div style={{ maxWidth: 600, width: '100%', textAlign: 'center' }}>
        {/* 結果タイトル */}
        <div style={{ fontSize: 64, marginBottom: 16 }}>
          {isCampaignComplete ? '👑' : isSuccess ? '🏆' : '💀'}
        </div>
        <h1 style={{ fontSize: 28, margin: '0 0 8px', color: isCampaignComplete ? '#fbbf24' : isSuccess ? '#22c55e' : '#ef4444' }}>
          {isCampaignComplete
            ? '天下統一！キャンペーン完了'
            : isSuccess
            ? `第${prevScenario?.chapter}章クリア！`
            : '作戦失敗'}
        </h1>
        <div style={{ color: '#9ca3af', fontSize: 15, marginBottom: 32 }}>
          {isCampaignComplete
            ? '全ての章を制覇しました。あなたの統治者としての名は歴史に刻まれるでしょう。'
            : isSuccess
            ? `${prevScenario?.title} を完了しました。`
            : '本拠地を失いました。再挑戦しますか？'}
        </div>

        {/* 報酬 */}
        {isSuccess && prevScenario && prevScenario.rewards.goldBonus > 0 && (
          <div
            style={{
              background: '#1f2937', border: '1px solid #374151', borderRadius: 8,
              padding: '16px 24px', marginBottom: 24, display: 'inline-block',
            }}
          >
            <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 8 }}>獲得報酬</div>
            <div style={{ display: 'flex', gap: 24, fontSize: 15 }}>
              <span style={{ color: '#fbbf24' }}>¥{prevScenario.rewards.goldBonus} ボーナス</span>
              <span style={{ color: '#60a5fa' }}>EXP×{prevScenario.rewards.expBonus} 全武将</span>
            </div>
          </div>
        )}

        {/* 引き継ぎキャラ情報 */}
        {isSuccess && Object.keys(campaignProgress.carryOver).length > 0 && (
          <div
            style={{
              background: '#111827', border: '1px solid #1f2937', borderRadius: 8,
              padding: '14px 20px', marginBottom: 28, fontSize: 13, textAlign: 'left',
            }}
          >
            <div style={{ color: '#9ca3af', marginBottom: 8 }}>次章へ引き継ぐキャラクター ({Object.values(campaignProgress.carryOver).filter((c) => c.level > 1).length}名)</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {Object.entries(campaignProgress.carryOver)
                .filter(([, co]) => co.level > 1)
                .slice(0, 12)
                .map(([, co], i) => (
                  <span key={i} style={{ background: '#1f2937', borderRadius: 4, padding: '3px 8px', color: '#60a5fa' }}>
                    Lv.{co.level}
                  </span>
                ))}
            </div>
          </div>
        )}

        {/* 次章情報 */}
        {isSuccess && nextScenario && (
          <div
            style={{
              background: '#1a1a2e', border: '1px solid #1e3a5f', borderRadius: 8,
              padding: '16px 24px', marginBottom: 28, textAlign: 'left',
            }}
          >
            <div style={{ fontSize: 12, color: '#60a5fa', marginBottom: 4 }}>次章</div>
            <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 4 }}>
              第{nextScenario.chapter}章: {nextScenario.title}
            </div>
            <div style={{ fontSize: 13, color: '#9ca3af' }}>{nextScenario.description}</div>
          </div>
        )}

        {/* ボタン */}
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
          {!isSuccess && (
            <button
              onClick={() => {
                const scIdx = (campaignProgress.scenarioIndex - 1 + (campaign?.scenarios.length ?? 1)) % (campaign?.scenarios.length ?? 1);
                loadScenario(Math.max(0, scIdx - 1));
              }}
              style={{
                padding: '14px 40px', fontSize: 16, fontWeight: 'bold',
                background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer',
              }}
            >
              再挑戦
            </button>
          )}
          {isSuccess && !isCampaignComplete && nextScenario && (
            <button
              onClick={handleNext}
              style={{
                padding: '14px 40px', fontSize: 16, fontWeight: 'bold',
                background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer',
              }}
            >
              第{nextScenario.chapter}章へ ⚔
            </button>
          )}
          {isCampaignComplete && (
            <button
              onClick={reset}
              style={{
                padding: '14px 40px', fontSize: 16, fontWeight: 'bold',
                background: '#d97706', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer',
              }}
            >
              タイトルへ 👑
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

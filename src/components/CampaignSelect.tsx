import { useState } from 'react';
import { useGameStore } from '../game/store';
import { CAMPAIGNS } from '../data/campaigns';
import { NATIONS } from '../data/nations';

const FACTION_ICON: Record<string, string> = {
  '朱雀': '🦅', '青龍': '🐉', '玄武': '🐢', '黄竜': '🌟', '白虎': '🐯',
};

export default function CampaignSelect() {
  const { startCampaign, reset } = useGameStore();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [selectedNationId, setSelectedNationId] = useState<string | null>(null);

  const campaign = CAMPAIGNS.find((c) => c.id === selectedCampaignId) ?? null;
  const nations = Object.values(NATIONS);

  return (
    <div
      style={{
        height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'flex-start', background: '#0d1117', color: '#f9fafb',
        fontFamily: 'system-ui, sans-serif', overflowY: 'auto', padding: '40px 20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
        <button
          onClick={reset}
          style={{ background: 'none', border: '1px solid #374151', color: '#9ca3af', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
        >
          ← 戻る
        </button>
        <h1 style={{ margin: 0, fontSize: 28, color: '#f9fafb' }}>キャンペーン選択</h1>
      </div>

      {/* キャンペーン一覧 */}
      <div style={{ width: '100%', maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
        {CAMPAIGNS.map((c) => (
          <button
            key={c.id}
            onClick={() => { setSelectedCampaignId(c.id); setSelectedNationId(null); }}
            style={{
              background: selectedCampaignId === c.id ? '#1d3557' : '#1f2937',
              border: `2px solid ${selectedCampaignId === c.id ? '#3b82f6' : '#374151'}`,
              borderRadius: 10, padding: '20px 24px', cursor: 'pointer', color: '#f9fafb', textAlign: 'left',
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 6 }}>{c.title}</div>
            <div style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.6 }}>{c.description}</div>
            <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
              {c.scenarios.map((sc, i) => (
                <div
                  key={sc.id}
                  style={{
                    background: '#111827', border: '1px solid #374151', borderRadius: 6,
                    padding: '6px 12px', fontSize: 12, color: '#d1d5db',
                  }}
                >
                  <span style={{ color: '#60a5fa', marginRight: 6 }}>第{i + 1}章</span>
                  {sc.title}
                </div>
              ))}
            </div>
          </button>
        ))}
      </div>

      {/* 国家選択 */}
      {campaign && (
        <div style={{ width: '100%', maxWidth: 720 }}>
          <h2 style={{ fontSize: 18, color: '#9ca3af', marginBottom: 16 }}>プレイする国家を選択</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
            {nations.map((n) => (
              <button
                key={n.id}
                onClick={() => setSelectedNationId(n.id)}
                style={{
                  background: selectedNationId === n.id ? '#1f2937' : '#111827',
                  border: `2px solid ${selectedNationId === n.id ? n.color : '#374151'}`,
                  borderRadius: 8, padding: '14px 16px', cursor: 'pointer', color: '#f9fafb',
                  textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
                }}
              >
                <span style={{ fontSize: 22 }}>{FACTION_ICON[n.faction] ?? '⚔'}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 'bold', color: n.color }}>{n.name}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>{n.faction}</div>
                </div>
              </button>
            ))}
          </div>

          {/* シナリオ概要 */}
          <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8, padding: '20px 24px', marginBottom: 24 }}>
            <div style={{ fontSize: 14, color: '#9ca3af', marginBottom: 10 }}>章の構成</div>
            {campaign.scenarios.map((sc, i) => (
              <div key={sc.id} style={{ display: 'flex', gap: 16, marginBottom: 10, fontSize: 13 }}>
                <span style={{ color: '#60a5fa', flexShrink: 0, minWidth: 50 }}>第{i + 1}章</span>
                <div>
                  <div style={{ fontWeight: 'bold', color: '#e5e7eb', marginBottom: 2 }}>{sc.title}</div>
                  <div style={{ color: '#6b7280' }}>{sc.description}</div>
                  <div style={{ color: '#22c55e', marginTop: 2 }}>🏆 {sc.victory.description}</div>
                  {i < campaign.scenarios.length - 1 && (
                    <div style={{ color: '#d97706', marginTop: 2 }}>
                      完了報酬: ¥{sc.rewards.goldBonus} + EXP×{sc.rewards.expBonus}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              if (selectedCampaignId && selectedNationId) {
                startCampaign(selectedCampaignId, selectedNationId);
              }
            }}
            disabled={!selectedNationId}
            style={{
              width: '100%', padding: '16px', fontSize: 18, fontWeight: 'bold',
              background: selectedNationId ? '#1d4ed8' : '#374151',
              color: selectedNationId ? '#fff' : '#6b7280',
              border: 'none', borderRadius: 8, cursor: selectedNationId ? 'pointer' : 'default',
            }}
          >
            キャンペーン開始
          </button>
        </div>
      )}
    </div>
  );
}

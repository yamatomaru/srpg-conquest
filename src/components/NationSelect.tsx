import { useGameStore } from '../game/store';
import { NATIONS } from '../data/nations';

const FACTION_ICON: Record<string, string> = {
  '朱雀': '🦅', '青龍': '🐉', '玄武': '🐢', '黄竜': '🌟', '白虎': '🐯',
};

export default function NationSelect() {
  const { selectNation, openCampaignSelect, openMapEditor } = useGameStore();
  const nations = Object.values(NATIONS);

  return (
    <div
      style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: '#0d1117', color: '#f9fafb', fontFamily: 'system-ui, sans-serif', gap: 32,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 36, margin: 0, color: '#f9fafb', letterSpacing: 4 }}>MyCryptoConquest</h1>
      </div>

      {/* モード選択 */}
      <div style={{ display: 'flex', gap: 16 }}>
        <div
          style={{
            background: '#1f2937', border: '2px solid #374151', borderRadius: 10,
            padding: '16px 24px', textAlign: 'center', width: 220,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 'bold', color: '#f9fafb', marginBottom: 6 }}>⚔ フリープレイ</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>国家を選んで自由に遊ぶ</div>
          <div style={{ fontSize: 11, color: '#4b5563' }}>↓ 国家を選択</div>
        </div>
        <button
          onClick={openCampaignSelect}
          style={{
            background: '#1a1a2e', border: '2px solid #3b82f6', borderRadius: 10,
            padding: '16px 24px', textAlign: 'center', cursor: 'pointer', color: '#f9fafb',
            width: 220,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 'bold', color: '#60a5fa', marginBottom: 6 }}>📜 キャンペーン</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>3章構成のストーリー<br />キャラLv引き継ぎあり</div>
          <div style={{ fontSize: 12, color: '#3b82f6' }}>→ キャンペーンを選択</div>
        </button>
        <button
          onClick={openMapEditor}
          style={{
            background: '#0d1a0d', border: '2px solid #22c55e', borderRadius: 10,
            padding: '16px 24px', textAlign: 'center', cursor: 'pointer', color: '#f9fafb',
            width: 220,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 'bold', color: '#4ade80', marginBottom: 6 }}>🗺 マップエディタ</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>領地・隣接を自由に配置<br />カスタムマップを作成</div>
          <div style={{ fontSize: 12, color: '#22c55e' }}>→ エディタを開く</div>
        </button>
      </div>

      {/* フリープレイ国家選択 */}
      <div
        style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16, maxWidth: 780, width: '90%',
        }}
      >
        {nations.map((nation) => (
          <button
            key={nation.id}
            onClick={() => selectNation(nation.id)}
            style={{
              background: '#1f2937', border: `2px solid ${nation.color}`, borderRadius: 10,
              padding: '18px 16px', cursor: 'pointer', color: '#f9fafb', textAlign: 'left',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#374151';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#1f2937';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 24 }}>{FACTION_ICON[nation.faction] ?? '⚔'}</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 'bold', color: nation.color }}>{nation.name}</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>{nation.faction}勢力</div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>
              ¥{nation.gold.toLocaleString()} · 兵力{nation.characterIds.length}名
            </div>
          </button>
        ))}
      </div>

      <p style={{ color: '#4b5563', fontSize: 12, margin: 0 }}>
        ※ 同じ勢力のMyCryptoHeroesヒーローを傭兵として雇用できます
      </p>
    </div>
  );
}

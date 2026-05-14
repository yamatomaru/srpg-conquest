import { useGameStore } from '../game/store';
import { BUILDINGS } from '../data/buildings';
import type { BuildingType } from '../game/types';

const BUILDING_ORDER: BuildingType[] = ['market', 'barracks', 'fortress'];

export default function DomesticPanel() {
  const { nations, territories, togglePanel, buildStructure } = useGameStore();
  const player = Object.values(nations).find((n) => n.isPlayer);
  if (!player) return null;

  const playerTerritories = Object.values(territories).filter((t) => t.ownerId === player.id);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) togglePanel('domestic'); }}
    >
      <div
        style={{
          background: '#111827', border: '2px solid #374151', borderRadius: 14,
          padding: '24px 28px', maxWidth: 640, width: '92%', maxHeight: '85vh',
          overflowY: 'auto', color: '#f9fafb', fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* タイトル */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 'bold' }}>🏗 内政</div>
          <button
            onClick={() => togglePanel('domestic')}
            style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 22, cursor: 'pointer' }}
          >✕</button>
        </div>

        {/* 建築物説明 */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 22, flexWrap: 'wrap' }}>
          {BUILDING_ORDER.map((bid) => {
            const b = BUILDINGS[bid];
            return (
              <div
                key={bid}
                style={{
                  flex: '1 1 160px', background: '#1f2937', border: '1px solid #374151',
                  borderRadius: 8, padding: '10px 14px',
                }}
              >
                <div style={{ fontSize: 22, marginBottom: 4 }}>{b.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 'bold', color: '#f9fafb', marginBottom: 2 }}>{b.name}</div>
                <div style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.5, marginBottom: 6 }}>{b.description}</div>
                <div style={{ fontSize: 12, color: '#fbbf24' }}>費用: ¥{b.cost}</div>
              </div>
            );
          })}
        </div>

        {/* 所持金 */}
        <div style={{ fontSize: 13, color: '#fbbf24', marginBottom: 14 }}>
          所持金: ¥{player.gold.toLocaleString()}
        </div>

        {/* 領地一覧 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {playerTerritories.map((t) => {
            const currentBuilding = t.building ? BUILDINGS[t.building] : null;
            const buildingBonus = t.building ? (BUILDINGS[t.building]?.incomeBonus ?? 0) : 0;
            return (
              <div
                key={t.id}
                style={{
                  background: '#1f2937', border: '1px solid #374151', borderRadius: 10,
                  padding: '12px 16px',
                }}
              >
                {/* 領地ヘッダー */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 'bold', color: '#f9fafb' }}>{t.name}</span>
                    <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 8 }}>
                      収入: ¥{t.income}{buildingBonus > 0 ? ` (+${buildingBonus})` : ''}
                    </span>
                  </div>
                  {currentBuilding && (
                    <span style={{
                      fontSize: 12, background: '#374151', borderRadius: 6,
                      padding: '2px 10px', color: '#d1d5db',
                    }}>
                      {currentBuilding.icon} {currentBuilding.name} 建設済
                    </span>
                  )}
                </div>

                {/* 建設ボタン */}
                {!t.building && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {BUILDING_ORDER.map((bid) => {
                      const b = BUILDINGS[bid];
                      const canAfford = player.gold >= b.cost;
                      return (
                        <button
                          key={bid}
                          onClick={() => buildStructure(t.id, bid)}
                          disabled={!canAfford}
                          style={{
                            padding: '5px 14px',
                            background: canAfford ? '#1d4ed8' : '#374151',
                            color: '#fff', border: 'none', borderRadius: 6,
                            cursor: canAfford ? 'pointer' : 'default',
                            opacity: canAfford ? 1 : 0.5,
                            fontSize: 12,
                          }}
                          onMouseEnter={(e) => { if (canAfford) e.currentTarget.style.background = '#2563eb'; }}
                          onMouseLeave={(e) => { if (canAfford) e.currentTarget.style.background = '#1d4ed8'; }}
                        >
                          {b.icon} {b.name} ¥{b.cost}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {playerTerritories.length === 0 && (
          <div style={{ textAlign: 'center', color: '#6b7280', fontSize: 13, padding: '20px 0' }}>
            領地がありません
          </div>
        )}
      </div>
    </div>
  );
}

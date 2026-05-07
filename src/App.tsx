import StrategicMap from './components/StrategicMap';

export default function App() {
  return (
    <div
      style={{
        fontFamily: 'system-ui, sans-serif',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#111827',
        color: '#f9fafb',
      }}
    >
      {/* Step 5 で TurnControl に置き換える */}
      <div
        style={{
          padding: '8px 16px',
          background: '#1f2937',
          borderBottom: '1px solid #374151',
        }}
      >
        Sprint 2 — 戦略マップ構築中
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <StrategicMap />
        </div>

        {/* Step 3 で TerritoryDetail に置き換える */}
        <div
          style={{
            width: 260,
            borderLeft: '1px solid #374151',
            padding: 16,
            color: '#6b7280',
            fontSize: 13,
          }}
        >
          ← 領地をクリックして選択
        </div>
      </div>
    </div>
  );
}

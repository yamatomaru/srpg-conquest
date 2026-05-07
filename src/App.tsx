import StrategicMap from './components/StrategicMap';
import TerritoryDetail from './components/TerritoryDetail';
import TurnControl from './components/TurnControl';

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
      <TurnControl />

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

        <div
          style={{
            width: 260,
            borderLeft: '1px solid #374151',
            overflowY: 'auto',
          }}
        >
          <TerritoryDetail />
        </div>
      </div>
    </div>
  );
}

import { useGameStore } from './game/store';
import StrategicMap from './components/StrategicMap';
import TerritoryDetail from './components/TerritoryDetail';
import TurnControl from './components/TurnControl';
import GameOverModal from './components/GameOverModal';
import TacticalControl from './components/TacticalControl';
import TacticalMap from './components/TacticalMap';

export default function App() {
  const phase = useGameStore((s) => s.phase);

  // 戦術マップ画面（Step 2 で TacticalMap を追加する）
  if (phase === 'tactical') {
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
        <TacticalControl />
        <TacticalMap />
      </div>
    );
  }

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

      <GameOverModal />
    </div>
  );
}

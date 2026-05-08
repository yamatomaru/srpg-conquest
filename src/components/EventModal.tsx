import { useGameStore } from '../game/store';

export default function EventModal() {
  const { currentEvent, dismissEvent } = useGameStore();
  if (!currentEvent) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
      }}
    >
      <div
        style={{
          background: '#1f2937', border: '1px solid #374151', borderRadius: 12,
          padding: '28px 32px', width: 400, color: '#f9fafb', textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 36, marginBottom: 8 }}>📜</div>
        <h3 style={{ margin: '0 0 12px', fontSize: 20, color: '#fbbf24' }}>{currentEvent.title}</h3>
        <p style={{ margin: '0 0 14px', fontSize: 15, color: '#d1d5db', lineHeight: 1.6 }}>
          {currentEvent.description}
        </p>
        <div
          style={{
            display: 'inline-block', padding: '6px 18px', background: '#111827',
            borderRadius: 6, fontSize: 14, color: '#60a5fa', marginBottom: 20,
          }}
        >
          効果: {currentEvent.effectDesc}
        </div>
        <br />
        <button
          onClick={dismissEvent}
          style={{
            padding: '10px 30px', background: '#2563eb', color: '#fff',
            border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 16, fontWeight: 'bold',
          }}
        >
          了解
        </button>
      </div>
    </div>
  );
}

import { useGameStore } from '../game/store';

export default function EventModal() {
  const { currentEvent, dismissEvent, autoPlay, fastForward, toggleAutoPlay, toggleFastForward } = useGameStore();
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

        {/* AUTO中はモーダルの中からでも操作できるようにする */}
        {autoPlay && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
            <button
              onClick={toggleFastForward}
              title={fastForward ? '通常速度に戻す' : '高速化'}
              style={{
                padding: '6px 14px', fontSize: 13, fontWeight: 'bold',
                background: fastForward ? '#92400e' : '#374151',
                color: fastForward ? '#fbbf24' : '#d1d5db',
                border: `1px solid ${fastForward ? '#f59e0b' : '#4b5563'}`,
                borderRadius: 6, cursor: 'pointer',
              }}
            >
              {fastForward ? '⚡ 高速中' : '⚡ 高速化'}
            </button>
            <button
              onClick={toggleAutoPlay}
              title="AUTOを停止"
              style={{
                padding: '6px 14px', fontSize: 13, fontWeight: 'bold',
                background: '#7f1d1d', color: '#fca5a5',
                border: '1px solid #ef4444',
                borderRadius: 6, cursor: 'pointer',
              }}
            >
              ⏹ AUTO停止
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

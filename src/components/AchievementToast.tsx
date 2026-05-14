import { useEffect } from 'react';
import { useGameStore } from '../game/store';
import { ACHIEVEMENT_MAP } from '../data/achievements';

export default function AchievementToast() {
  const { pendingAchievementToasts, dismissAchievementToast } = useGameStore();
  const currentId = pendingAchievementToasts[0];

  useEffect(() => {
    if (!currentId) return;
    const timer = setTimeout(() => dismissAchievementToast(), 3500);
    return () => clearTimeout(timer);
  }, [currentId]);

  if (!currentId) return null;

  const ach = ACHIEVEMENT_MAP[currentId];
  if (!ach) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 28,
        right: 28,
        zIndex: 300,
        background: 'linear-gradient(135deg, #1c1917, #292524)',
        border: '1px solid #f59e0b',
        borderRadius: 10,
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 4px 20px rgba(245,158,11,0.35)',
        animation: 'slideInRight 0.35s ease-out',
        maxWidth: 300,
      }}
    >
      <div style={{ fontSize: 32, flexShrink: 0 }}>{ach.icon}</div>
      <div>
        <div style={{ fontSize: 11, color: '#f59e0b', fontWeight: 'bold', letterSpacing: '0.05em', marginBottom: 2 }}>
          🏆 実績解除！
        </div>
        <div style={{ fontSize: 15, color: '#fef3c7', fontWeight: 'bold' }}>{ach.title}</div>
        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{ach.description}</div>
        <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 4 }}>+{ach.points} pt</div>
      </div>
      <button
        onClick={dismissAchievementToast}
        style={{
          position: 'absolute', top: 6, right: 8,
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#6b7280', fontSize: 16, lineHeight: 1, padding: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}

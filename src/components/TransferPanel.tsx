import { useState, useEffect } from 'react';
import { useGameStore } from '../game/store';
import { JOB_ABBR } from '../data/jobs';

export default function TransferPanel() {
  const { territories, nations, characters, actedCharIds, ui, cancelTransfer, executeTransfer } = useGameStore();
  const { transferPending } = ui;
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!transferPending) { setSelected(new Set()); return; }
    const garrison = territories[transferPending.fromTerritoryId]?.garrisonIds ?? [];
    const eligible = garrison.filter(
      (id) => characters[id]?.hp > 0 && !actedCharIds.includes(id),
    );
    setSelected(new Set(eligible));
  }, [transferPending?.fromTerritoryId]);

  if (!transferPending) return null;

  const fromT = territories[transferPending.fromTerritoryId];
  const toT = territories[transferPending.toTerritoryId];
  const nation = nations[fromT.ownerId];

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const confirm = () => {
    if (selected.size === 0) return;
    executeTransfer(fromT.id, toT.id, [...selected]);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        style={{
          background: '#1f2937',
          border: '1px solid #374151',
          borderRadius: 8,
          padding: 24,
          width: 420,
          maxHeight: '80vh',
          overflowY: 'auto',
          color: '#f9fafb',
        }}
      >
        <h3 style={{ margin: '0 0 4px', fontSize: 18 }}>兵力移動</h3>
        <p style={{ margin: '0 0 16px', fontSize: 14, color: '#9ca3af' }}>
          <span style={{ color: nation.color }}>{fromT.name}</span>
          {' → '}
          <span style={{ color: nation.color }}>{toT.name}</span>
          （同国移動）
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {fromT.garrisonIds.map((cId) => {
            const ch = characters[cId];
            const isDead = ch.hp <= 0;
            const isActed = actedCharIds.includes(cId);
            const isDisabled = isDead || isActed;
            const isChecked = selected.has(cId);
            return (
              <label
                key={cId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  background: isDisabled ? '#0d1117' : isChecked ? '#1a3a2a' : '#111827',
                  border: `1px solid ${isDisabled ? '#1f2937' : isChecked ? '#22c55e' : '#374151'}`,
                  borderRadius: 6,
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  fontSize: 14,
                  opacity: isDisabled ? 0.4 : 1,
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked && !isDisabled}
                  disabled={isDisabled}
                  onChange={() => !isDisabled && toggle(cId)}
                  style={{ width: 16, height: 16, cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                />
                <img
                  src={ch.spritePath}
                  width={36} height={36}
                  style={{ borderRadius: '50%', imageRendering: 'pixelated', flexShrink: 0 }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div>
                  <div style={{ fontWeight: 'bold' }}>{ch.name}</div>
                  <div style={{ color: '#9ca3af', fontSize: 12 }}>
                    [{JOB_ABBR[ch.jobId]}] HP:{ch.hp}/{ch.maxHp} ATK:{ch.atk} DEF:{ch.def} MOV:{ch.mov}
                    {isDead && <span style={{ color: '#ef4444', marginLeft: 6 }}>回復中</span>}
                    {isActed && <span style={{ color: '#f59e0b', marginLeft: 6 }}>移動済</span>}
                  </div>
                </div>
              </label>
            );
          })}
        </div>

        <div style={{ color: '#9ca3af', fontSize: 13, marginBottom: 16 }}>
          {selected.size}名移動 / 残留 {fromT.garrisonIds.length - selected.size}名
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={cancelTransfer}
            style={{
              padding: '8px 18px',
              background: '#4b5563',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 15,
            }}
          >
            キャンセル
          </button>
          <button
            onClick={confirm}
            disabled={selected.size === 0}
            style={{
              padding: '8px 18px',
              background: selected.size === 0 ? '#374151' : '#16a34a',
              color: selected.size === 0 ? '#6b7280' : '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: selected.size === 0 ? 'not-allowed' : 'pointer',
              fontSize: 15,
              fontWeight: 'bold',
            }}
          >
            移動する
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useGameStore } from '../game/store';
import { seSave } from '../game/sound';

const SLOT_COUNT = 3;

interface SlotMeta {
  slot: number;
  label: string;
  ts: string | null;
  month: number | null;
  nationName: string | null;
}

function getSlotMeta(slot: number): SlotMeta {
  const key = `srpg-conquest-save-${slot}`;
  const ts = localStorage.getItem(`${key}-ts`) ?? (slot === 0 ? localStorage.getItem('srpg-conquest-save-ts') : null);
  const raw = localStorage.getItem(key) ?? (slot === 0 ? localStorage.getItem('srpg-conquest-save') : null);
  let month: number | null = null;
  let nationName: string | null = null;
  if (raw) {
    try {
      const data = JSON.parse(raw);
      month = data.month ?? null;
      const nations: Record<string, { isPlayer?: boolean; name?: string }> = data.nations ?? {};
      nationName = Object.values(nations).find((n) => n.isPlayer)?.name ?? null;
    } catch { /* ignore */ }
  }
  const dateStr = ts ? new Date(Number(ts)).toLocaleString('ja-JP', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }) : null;
  return { slot, label: `スロット ${slot + 1}`, ts: dateStr, month, nationName };
}

function getAutoSlotMeta(): SlotMeta & { slot: -1 } {
  const ts = localStorage.getItem('srpg-conquest-save-auto-ts');
  const raw = localStorage.getItem('srpg-conquest-save-auto');
  let month: number | null = null;
  let nationName: string | null = null;
  if (raw) {
    try {
      const data = JSON.parse(raw);
      month = data.month ?? null;
      const nations: Record<string, { isPlayer?: boolean; name?: string }> = data.nations ?? {};
      nationName = Object.values(nations).find((n) => n.isPlayer)?.name ?? null;
    } catch { /* ignore */ }
  }
  const dateStr = ts ? new Date(Number(ts)).toLocaleString('ja-JP', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }) : null;
  return { slot: -1, label: 'オートセーブ', ts: dateStr, month, nationName };
}

interface Props {
  onClose: () => void;
}

export default function SaveSlotPanel({ onClose }: Props) {
  const { saveGame, loadGame, deleteSave } = useGameStore();
  const [mode, setMode] = useState<'save' | 'load'>('save');
  const [msg, setMsg] = useState('');
  const [refresh, setRefresh] = useState(0);

  const slots: SlotMeta[] = Array.from({ length: SLOT_COUNT }, (_, i) => getSlotMeta(i));
  const autoSlot = getAutoSlotMeta();

  const flash = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(''), 2000);
  };

  const handleSave = (slot: number) => {
    saveGame(slot);
    seSave();
    setRefresh((r) => r + 1);
    flash(`✅ スロット${slot + 1}にセーブしました`);
  };

  const handleLoad = (slot: number | 'auto') => {
    if (slot === 'auto') {
      const raw = localStorage.getItem('srpg-conquest-save-auto');
      if (!raw) return;
      try {
        const data = JSON.parse(raw);
        useGameStore.setState({ ...data, marchPlans: data.marchPlans ?? [], playerInventory: data.playerInventory ?? {}, battle: null, isAIThinking: false, currentEvent: null });
      } catch { /* ignore */ }
    } else {
      loadGame(slot);
    }
    onClose();
  };

  const handleDelete = (slot: number) => {
    if (!window.confirm(`スロット${slot + 1}のデータを削除しますか？`)) return;
    deleteSave(slot);
    setRefresh((r) => r + 1);
    flash(`🗑 スロット${slot + 1}を削除しました`);
  };

  // refresh で再レンダリング（副作用を起こすため）
  void refresh;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: '#111827', border: '2px solid #374151', borderRadius: 14,
          padding: '24px 28px', maxWidth: 480, width: '92%',
          color: '#f9fafb', fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* ヘッダー */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 'bold' }}>💾 セーブ / ロード</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 22, cursor: 'pointer' }}>✕</button>
        </div>

        {/* モード切替 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {(['save', 'load'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                flex: 1, padding: '8px 0',
                background: mode === m ? '#1d4ed8' : '#374151',
                color: '#fff', border: 'none', borderRadius: 6,
                cursor: 'pointer', fontSize: 14, fontWeight: 'bold',
              }}
            >
              {m === 'save' ? '💾 セーブ' : '📂 ロード'}
            </button>
          ))}
        </div>

        {/* フラッシュメッセージ */}
        {msg && (
          <div style={{ fontSize: 13, color: '#34d399', marginBottom: 12, textAlign: 'center' }}>{msg}</div>
        )}

        {/* スロット一覧 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {slots.map(({ slot, label, ts, month, nationName }) => {
            const isEmpty = !ts;
            return (
              <div
                key={slot}
                style={{
                  background: '#1f2937', border: '1px solid #374151', borderRadius: 10,
                  padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 'bold', color: '#e5e7eb' }}>{label}</div>
                  {isEmpty ? (
                    <div style={{ fontSize: 11, color: '#4b5563' }}>─ 空き ─</div>
                  ) : (
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>
                      {nationName && <span style={{ color: '#fbbf24' }}>{nationName} </span>}
                      {month !== null && <span>月{month} </span>}
                      <span>{ts}</span>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {mode === 'save' && (
                    <button
                      onClick={() => handleSave(slot)}
                      style={{
                        padding: '5px 14px', background: '#065f46', color: '#fff',
                        border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#047857')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#065f46')}
                    >
                      保存
                    </button>
                  )}
                  {mode === 'load' && !isEmpty && (
                    <button
                      onClick={() => handleLoad(slot)}
                      style={{
                        padding: '5px 14px', background: '#1d4ed8', color: '#fff',
                        border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#2563eb')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#1d4ed8')}
                    >
                      ロード
                    </button>
                  )}
                  {!isEmpty && (
                    <button
                      onClick={() => handleDelete(slot)}
                      style={{
                        padding: '5px 10px', background: '#7f1d1d', color: '#fff',
                        border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#991b1b')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#7f1d1d')}
                    >
                      🗑
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* オートセーブスロット (ロード時のみ) */}
          {mode === 'load' && autoSlot.ts && (
            <div
              style={{
                background: '#1a1a2e', border: '1px solid #3b82f6', borderRadius: 10,
                padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 'bold', color: '#60a5fa' }}>{autoSlot.label}</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>
                  {autoSlot.nationName && <span style={{ color: '#fbbf24' }}>{autoSlot.nationName} </span>}
                  {autoSlot.month !== null && <span>月{autoSlot.month} </span>}
                  <span>{autoSlot.ts}</span>
                </div>
              </div>
              <button
                onClick={() => handleLoad('auto')}
                style={{
                  padding: '5px 14px', background: '#1e3a5f', color: '#fff',
                  border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12,
                }}
              >
                ロード
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

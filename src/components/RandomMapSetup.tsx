import { useState, useCallback } from 'react';
import { useGameStore } from '../game/store';
import { generateRandomMap, NATION_ORDER, cellId } from '../data/randomMap';
import type { RandomMapResult } from '../data/randomMap';

const FACTION_ICON: Record<string, string> = {
  '朱雀': '🦅', '青龍': '🐉', '玄武': '🐢', '黄竜': '🌟', '白虎': '🐯',
};

// ============================================================
// ミニマップ (5×5 カラードグリッド)
// ============================================================
function MiniMap({ data }: { data: RandomMapResult }) {
  const { territories, nations } = data;
  const CELL_W = 44;
  const CELL_H = 34;

  return (
    <svg
      width={5 * CELL_W}
      height={5 * CELL_H}
      style={{ borderRadius: 6, display: 'block', border: '1px solid #374151' }}
    >
      {Array.from({ length: 5 }, (_, row) =>
        Array.from({ length: 5 }, (_, col) => {
          const id = cellId(col, row);
          const t = territories[id];
          if (!t) return null;
          const nation = nations[t.ownerId];
          const isCapital = t.name.startsWith('★');
          return (
            <g key={id}>
              <rect
                x={col * CELL_W + 1}
                y={row * CELL_H + 1}
                width={CELL_W - 2}
                height={CELL_H - 2}
                fill={nation?.color ?? '#374151'}
                opacity={0.65}
                rx={3}
              />
              {isCapital && (
                <text
                  x={col * CELL_W + CELL_W / 2}
                  y={row * CELL_H + CELL_H / 2 + 5}
                  textAnchor="middle"
                  fontSize={13}
                  fill="#fff"
                  style={{ userSelect: 'none' }}
                >
                  ★
                </text>
              )}
            </g>
          );
        })
      )}
    </svg>
  );
}

// ============================================================
// ランダムマップ設定パネル
// ============================================================
interface Props {
  onClose: () => void;
}

export default function RandomMapSetup({ onClose }: Props) {
  const { startRandomGame } = useGameStore();
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 0xffffffff));
  const [mapData, setMapData] = useState<RandomMapResult>(() => generateRandomMap(seed));
  const [selectedNation, setSelectedNation] = useState<string | null>(null);

  const regenerate = useCallback(() => {
    const newSeed = Math.floor(Math.random() * 0xffffffff);
    setSeed(newSeed);
    setMapData(generateRandomMap(newSeed));
    setSelectedNation(null);
  }, []);

  const handleStart = () => {
    if (!selectedNation) return;
    startRandomGame(selectedNation, seed);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: '#111827', border: '2px solid #374151', borderRadius: 14,
          padding: '24px 28px', maxWidth: 580, width: '92%',
          color: '#f9fafb', fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* タイトル */}
        <div style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 18 }}>🎲 ランダムマップ</div>

        {/* ミニマップ + 説明 */}
        <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <MiniMap data={mapData} />
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4, textAlign: 'center' }}>
              ★ = 本拠地
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.7, marginBottom: 10 }}>
              各国の領地配置・収入・ガリソン配置がランダムに変化します。<br />
              5国・各5領地・10キャラクターの構成は固定です。
            </div>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 10 }}>
              シード:{' '}
              <code style={{ color: '#d1d5db', background: '#1f2937', padding: '1px 6px', borderRadius: 3 }}>
                {seed}
              </code>
            </div>
            <button
              onClick={regenerate}
              style={{
                padding: '6px 14px', background: '#374151', color: '#e5e7eb',
                border: '1px solid #4b5563', borderRadius: 6,
                cursor: 'pointer', fontSize: 13,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#4b5563')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#374151')}
            >
              🔄 再生成
            </button>
          </div>
        </div>

        {/* 国家選択 */}
        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>プレイヤー国家を選択:</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
          {NATION_ORDER.map((nId) => {
            const n = mapData.nations[nId];
            const isSelected = selectedNation === nId;
            return (
              <button
                key={nId}
                onClick={() => setSelectedNation(nId)}
                style={{
                  padding: '8px 14px',
                  border: `2px solid ${isSelected ? n.color : '#374151'}`,
                  borderRadius: 8,
                  background: isSelected ? '#1f2937' : 'transparent',
                  cursor: 'pointer', color: '#f9fafb', fontSize: 13,
                  display: 'flex', alignItems: 'center', gap: 6,
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.borderColor = n.color + '88';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.borderColor = '#374151';
                }}
              >
                <span style={{ fontSize: 16 }}>{FACTION_ICON[n.faction] ?? '⚔'}</span>
                <span style={{ color: n.color, fontWeight: 'bold' }}>{n.name}</span>
              </button>
            );
          })}
        </div>

        {/* アクションボタン */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 18px', background: '#374151', color: '#e5e7eb',
              border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13,
            }}
          >
            キャンセル
          </button>
          <button
            onClick={handleStart}
            disabled={!selectedNation}
            style={{
              padding: '8px 22px',
              background: selectedNation ? '#1d4ed8' : '#374151',
              color: '#fff', border: 'none', borderRadius: 6,
              cursor: selectedNation ? 'pointer' : 'default',
              opacity: selectedNation ? 1 : 0.45,
              fontSize: 13, fontWeight: 'bold',
            }}
          >
            このマップで開始
          </button>
        </div>
      </div>
    </div>
  );
}

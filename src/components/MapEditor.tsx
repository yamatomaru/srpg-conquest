import { useState, useCallback } from 'react';
import { useGameStore } from '../game/store';
import type { EditorCell, EditorMap, EditorNation } from '../game/types';

const EDITOR_SAVE_KEY = 'srpg-mapeditor-custom';

const DEFAULT_NATIONS: Record<string, EditorNation> = {
  albania: { id: 'albania', name: '朱雀王国',   color: '#3b82f6', faction: '朱雀', gold: 200 },
  magnus:  { id: 'magnus',  name: '青龍魔導院', color: '#a855f7', faction: '青龍', gold: 250 },
  nordal:  { id: 'nordal',  name: '玄武氏族',   color: '#6b7280', faction: '玄武', gold: 150 },
  sylvan:  { id: 'sylvan',  name: '黄竜同盟',   color: '#22c55e', faction: '黄竜', gold: 150 },
  wess:    { id: 'wess',    name: '白虎公国',   color: '#eab308', faction: '白虎', gold: 80  },
};

type Tool = 'place' | 'erase' | 'adjacency';

function makeEmptyMap(cols: number, rows: number): EditorMap {
  return {
    id: `map_${Date.now()}`,
    mapName: '新しいマップ',
    cols, rows,
    cells: {},
    adjacency: [],
    nations: { ...DEFAULT_NATIONS },
  };
}

function cellKey(col: number, row: number) { return `${col},${row}`; }
function adjacencyKey(a: string, b: string) { return [a, b].sort().join('|'); }

export default function MapEditor() {
  const { reset } = useGameStore();

  const [map, setMap] = useState<EditorMap>(() => {
    const raw = localStorage.getItem(EDITOR_SAVE_KEY);
    if (raw) { try { return JSON.parse(raw) as EditorMap; } catch { /* ignore */ } }
    return makeEmptyMap(5, 5);
  });

  const [tool, setTool] = useState<Tool>('place');
  const [selectedCellKey, setSelectedCellKey] = useState<string | null>(null);
  const [adjFirst, setAdjFirst] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState('');

  const selectedCell = selectedCellKey ? map.cells[selectedCellKey] : null;

  const handleCellClick = useCallback((col: number, row: number) => {
    const key = cellKey(col, row);
    const existing = map.cells[key];

    if (tool === 'erase') {
      const newCells = { ...map.cells };
      delete newCells[key];
      // Remove adjacency entries for this cell
      const newAdj = map.adjacency.filter((a) => !a.includes(key));
      setMap((m) => ({ ...m, cells: newCells, adjacency: newAdj }));
      if (selectedCellKey === key) setSelectedCellKey(null);
      return;
    }

    if (tool === 'adjacency') {
      if (!existing) return;
      if (!adjFirst) {
        setAdjFirst(key);
        return;
      }
      if (adjFirst === key) { setAdjFirst(null); return; }
      const ak = adjacencyKey(adjFirst, key);
      setMap((m) => {
        const has = m.adjacency.includes(ak);
        return { ...m, adjacency: has ? m.adjacency.filter((a) => a !== ak) : [...m.adjacency, ak] };
      });
      setAdjFirst(null);
      return;
    }

    // place tool
    if (!existing) {
      const firstNationId = Object.keys(map.nations)[0] ?? 'albania';
      const newCell: EditorCell = {
        id: key, name: `領地(${col},${row})`, ownerId: firstNationId, income: 30, isCapital: false,
      };
      setMap((m) => ({ ...m, cells: { ...m.cells, [key]: newCell } }));
    }
    setSelectedCellKey(key);
  }, [tool, map, adjFirst, selectedCellKey]);

  const updateCell = (updates: Partial<EditorCell>) => {
    if (!selectedCellKey) return;
    setMap((m) => ({
      ...m,
      cells: { ...m.cells, [selectedCellKey]: { ...m.cells[selectedCellKey], ...updates } },
    }));
  };

  const saveToStorage = () => {
    localStorage.setItem(EDITOR_SAVE_KEY, JSON.stringify(map));
    setSaveMsg('保存しました');
    setTimeout(() => setSaveMsg(''), 2000);
  };

  const exportToClipboard = () => {
    const json = JSON.stringify(map, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      setSaveMsg('JSONをコピーしました');
      setTimeout(() => setSaveMsg(''), 2000);
    });
  };

  const handleLoadDefault = () => {
    setMap(makeEmptyMap(map.cols, map.rows));
    setSelectedCellKey(null);
    setAdjFirst(null);
  };

  const handleResize = (cols: number, rows: number) => {
    setMap((m) => ({ ...m, cols, rows }));
  };

  const CELL_SIZE = 80;
  const GAP = 6;

  return (
    <div
      style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        background: '#0d1117', color: '#f9fafb', fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* ヘッダー */}
      <div
        style={{
          background: '#1f2937', borderBottom: '1px solid #374151',
          padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0,
        }}
      >
        <button
          onClick={reset}
          style={{ background: 'none', border: '1px solid #374151', color: '#9ca3af', padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
        >
          ← 戻る
        </button>
        <h2 style={{ margin: 0, fontSize: 18 }}>🗺 マップエディタ</h2>
        <input
          value={map.mapName}
          onChange={(e) => setMap((m) => ({ ...m, mapName: e.target.value }))}
          style={{ background: '#111827', border: '1px solid #374151', color: '#f9fafb', padding: '5px 10px', borderRadius: 4, fontSize: 15, width: 200 }}
        />

        {/* グリッドサイズ */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, color: '#9ca3af' }}>
          <span>グリッド:</span>
          {[4, 5, 6, 7, 8].map((n) => (
            <button
              key={n}
              onClick={() => handleResize(n, n)}
              style={{
                padding: '3px 8px', fontSize: 12, borderRadius: 4, border: 'none', cursor: 'pointer',
                background: map.cols === n ? '#3b82f6' : '#374151',
                color: map.cols === n ? '#fff' : '#9ca3af',
              }}
            >{n}×{n}</button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* ツール */}
        <div style={{ display: 'flex', gap: 6 }}>
          {([
            { id: 'place' as Tool, label: '✏ 配置', color: '#1d4ed8' },
            { id: 'erase' as Tool, label: '🗑 消去', color: '#dc2626' },
            { id: 'adjacency' as Tool, label: '🔗 隣接', color: '#065f46' },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => { setTool(t.id); setAdjFirst(null); }}
              style={{
                padding: '6px 14px', fontSize: 13, borderRadius: 4, border: 'none', cursor: 'pointer',
                background: tool === t.id ? t.color : '#374151',
                color: tool === t.id ? '#fff' : '#9ca3af', fontWeight: tool === t.id ? 'bold' : 'normal',
              }}
            >{t.label}</button>
          ))}
        </div>

        <div style={{ width: 1, background: '#374151', alignSelf: 'stretch' }} />
        <button onClick={saveToStorage} style={{ padding: '6px 14px', fontSize: 13, background: '#065f46', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
          保存
        </button>
        <button onClick={exportToClipboard} style={{ padding: '6px 14px', fontSize: 13, background: '#374151', color: '#9ca3af', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
          JSON出力
        </button>
        <button onClick={handleLoadDefault} style={{ padding: '6px 14px', fontSize: 13, background: '#4b5563', color: '#9ca3af', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
          クリア
        </button>
        {saveMsg && <span style={{ color: '#22c55e', fontSize: 13 }}>{saveMsg}</span>}
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* メインエディタ */}
        <div
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'auto', padding: 24,
          }}
        >
          <div>
            {/* ヒント */}
            {tool === 'adjacency' && (
              <div style={{ textAlign: 'center', marginBottom: 12, fontSize: 13, color: '#fbbf24' }}>
                {adjFirst ? `「${map.cells[adjFirst]?.name ?? adjFirst}」から接続先を選択` : '最初の領地をクリック'}
              </div>
            )}

            {/* グリッド */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${map.cols}, ${CELL_SIZE}px)`,
                gap: GAP,
              }}
            >
              {Array.from({ length: map.rows }, (_, row) =>
                Array.from({ length: map.cols }, (_, col) => {
                  const key = cellKey(col, row);
                  const cell = map.cells[key];
                  const nation = cell ? map.nations[cell.ownerId] : null;
                  const isSelected = selectedCellKey === key;
                  const isAdjFirst = adjFirst === key;
                  const isAdjLinked = adjFirst && cell && map.adjacency.includes(adjacencyKey(adjFirst, key));

                  return (
                    <div
                      key={key}
                      onClick={() => handleCellClick(col, row)}
                      style={{
                        width: CELL_SIZE, height: CELL_SIZE,
                        border: `2px solid ${
                          isAdjFirst ? '#fbbf24' :
                          isAdjLinked ? '#22c55e' :
                          isSelected ? '#60a5fa' :
                          cell ? (nation?.color ?? '#374151') :
                          '#1f2937'
                        }`,
                        borderRadius: 6,
                        background: cell
                          ? (nation ? `${nation.color}22` : '#1f2937')
                          : '#0d1117',
                        cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        gap: 2, position: 'relative', userSelect: 'none',
                        transition: 'border-color 0.15s, background 0.15s',
                      }}
                    >
                      {cell ? (
                        <>
                          {cell.isCapital && (
                            <span style={{ fontSize: 14 }}>★</span>
                          )}
                          <span style={{ fontSize: 10, color: nation?.color ?? '#9ca3af', fontWeight: 'bold', textAlign: 'center', lineHeight: 1.3, padding: '0 4px' }}>
                            {cell.name.slice(0, 6)}
                          </span>
                          <span style={{ fontSize: 9, color: '#6b7280' }}>¥{cell.income}</span>
                        </>
                      ) : (
                        <span style={{ color: '#1f2937', fontSize: 22 }}>+</span>
                      )}

                      {/* 隣接線の表示（右・下方向のみ） */}
                      {cell && col + 1 < map.cols && map.cells[cellKey(col + 1, row)] &&
                        map.adjacency.includes(adjacencyKey(key, cellKey(col + 1, row))) && (
                          <div style={{
                            position: 'absolute', right: -(GAP + 2), top: '50%', width: GAP + 4, height: 2,
                            background: '#22c55e', transform: 'translateY(-50%)', zIndex: 1,
                          }} />
                        )}
                      {cell && row + 1 < map.rows && map.cells[cellKey(col, row + 1)] &&
                        map.adjacency.includes(adjacencyKey(key, cellKey(col, row + 1))) && (
                          <div style={{
                            position: 'absolute', bottom: -(GAP + 2), left: '50%', width: 2, height: GAP + 4,
                            background: '#22c55e', transform: 'translateX(-50%)', zIndex: 1,
                          }} />
                        )}
                    </div>
                  );
                })
              )}
            </div>

            {/* 統計 */}
            <div style={{ marginTop: 16, display: 'flex', gap: 16, fontSize: 12, color: '#6b7280', justifyContent: 'center' }}>
              <span>領地数: {Object.keys(map.cells).length}</span>
              <span>隣接ペア: {map.adjacency.length}</span>
            </div>
          </div>
        </div>

        {/* 右パネル: 選択領地 / 国家設定 */}
        <div
          style={{
            width: 260, borderLeft: '1px solid #374151', background: '#111827',
            display: 'flex', flexDirection: 'column', overflowY: 'auto',
          }}
        >
          {/* 選択中の領地 */}
          {selectedCell ? (
            <div style={{ padding: 16 }}>
              <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 10 }}>選択中の領地</div>

              <label style={{ display: 'block', marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 3 }}>名前</div>
                <input
                  value={selectedCell.name}
                  onChange={(e) => updateCell({ name: e.target.value })}
                  style={{ width: '100%', background: '#1f2937', border: '1px solid #374151', color: '#f9fafb', padding: '5px 8px', borderRadius: 4, fontSize: 13, boxSizing: 'border-box' }}
                />
              </label>

              <label style={{ display: 'block', marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 3 }}>所有国家</div>
                <select
                  value={selectedCell.ownerId}
                  onChange={(e) => updateCell({ ownerId: e.target.value })}
                  style={{ width: '100%', background: '#1f2937', border: '1px solid #374151', color: '#f9fafb', padding: '5px 8px', borderRadius: 4, fontSize: 13 }}
                >
                  {Object.values(map.nations).map((n) => (
                    <option key={n.id} value={n.id}>{n.name}</option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'block', marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 3 }}>収入</div>
                <input
                  type="number" min={10} max={200} step={10}
                  value={selectedCell.income}
                  onChange={(e) => updateCell({ income: Number(e.target.value) })}
                  style={{ width: '100%', background: '#1f2937', border: '1px solid #374151', color: '#f9fafb', padding: '5px 8px', borderRadius: 4, fontSize: 13, boxSizing: 'border-box' }}
                />
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer', fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={selectedCell.isCapital}
                  onChange={(e) => updateCell({ isCapital: e.target.checked })}
                />
                本拠地（★）
              </label>

              {/* 隣接リスト */}
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>隣接している領地</div>
                {map.adjacency
                  .filter((ak) => ak.includes(selectedCellKey!))
                  .map((ak) => {
                    const otherId = ak.split('|').find((id) => id !== selectedCellKey)!;
                    const other = map.cells[otherId];
                    return other ? (
                      <div
                        key={ak}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '4px 8px', background: '#1f2937', borderRadius: 4, marginBottom: 4, fontSize: 12,
                        }}
                      >
                        <span style={{ color: map.nations[other.ownerId]?.color ?? '#d1d5db' }}>{other.name}</span>
                        <button
                          onClick={() => setMap((m) => ({ ...m, adjacency: m.adjacency.filter((a) => a !== ak) }))}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 14, padding: '0 4px' }}
                        >×</button>
                      </div>
                    ) : null;
                  })}
              </div>
            </div>
          ) : (
            <div style={{ padding: 16, color: '#4b5563', fontSize: 13 }}>
              ← 領地をクリックして選択
            </div>
          )}

          <div style={{ height: 1, background: '#374151', margin: '0 16px' }} />

          {/* 国家設定 */}
          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 10 }}>国家設定</div>
            {Object.values(map.nations).map((nation) => {
              const count = Object.values(map.cells).filter((c) => c.ownerId === nation.id).length;
              return (
                <div
                  key={nation.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
                    padding: '6px 10px', background: '#1f2937', borderRadius: 6,
                    border: `1px solid ${nation.color}44`,
                  }}
                >
                  <div
                    style={{ width: 10, height: 10, borderRadius: 2, background: nation.color, flexShrink: 0 }}
                  />
                  <span style={{ flex: 1, fontSize: 13, color: nation.color }}>{nation.name}</span>
                  <span style={{ fontSize: 11, color: '#6b7280' }}>{count}領地</span>
                </div>
              );
            })}
          </div>

          {/* 使い方 */}
          <div style={{ padding: '0 16px 16px', fontSize: 11, color: '#374151', lineHeight: 1.8 }}>
            <div style={{ color: '#4b5563', marginBottom: 4 }}>使い方</div>
            <div>✏ 配置: 空白クリックで領地追加</div>
            <div>🗑 消去: 領地クリックで削除</div>
            <div>🔗 隣接: 2領地クリックで接続切替</div>
            <div style={{ marginTop: 6, color: '#22c55e' }}>保存→ゲームで「カスタムマップ」として使用可</div>
          </div>
        </div>
      </div>
    </div>
  );
}

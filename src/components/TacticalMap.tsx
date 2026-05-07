import { useGameStore } from '../game/store';

const CELL = 60;
const PADDING = 24;

const JOB_ABBR: Record<string, string> = {
  warrior: '戦',
  archer: '弓',
  mage: '魔',
};

const SIDE_COLOR: Record<string, string> = {
  attacker: '#3b82f6',
  defender: '#ef4444',
};

export default function TacticalMap() {
  const { battle, characters, nations, selectUnit, moveUnit } = useGameStore();
  if (!battle) return null;

  const { map, units, selectedUnitId, reachableCells, currentSide } = battle;
  const W = map.width * CELL;
  const H = map.height * CELL;
  const SVG_W = W + PADDING * 2;
  const SVG_H = H + PADDING * 2;

  const reachableSet = new Set(reachableCells.map((c) => `${c.x},${c.y}`));
  const unitAtPos = new Map(units.map((u) => [`${u.position.x},${u.position.y}`, u]));

  function handleCellClick(x: number, y: number) {
    const key = `${x},${y}`;
    const unit = unitAtPos.get(key);
    console.log('[click]', x, y, 'unit:', unit?.characterId, 'side:', unit?.side, 'currentSide:', currentSide, 'hasMoved:', unit?.hasMoved, 'selectedUnitId:', selectedUnitId);
    if (selectedUnitId !== null && reachableSet.has(key)) {
      moveUnit(selectedUnitId, { x, y });
      return;
    }
    if (unit && unit.side === currentSide && !unit.hasMoved) {
      selectUnit(unit.characterId);
    } else {
      selectUnit(null);
    }
  }

  return (
    <div style={{ overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
      {/* SVG（描画専用） + HTML div オーバーレイ（クリック処理） */}
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <svg
          width={SVG_W}
          height={SVG_H}
          style={{ display: 'block' }}
        >
          <g transform={`translate(${PADDING}, ${PADDING})`}>
            {/* ① グリッド背景 */}
            {Array.from({ length: map.height }, (_, row) =>
              Array.from({ length: map.width }, (_, col) => (
                <rect
                  key={`bg-${col}-${row}`}
                  x={col * CELL}
                  y={row * CELL}
                  width={CELL}
                  height={CELL}
                  fill="#1e3a5f"
                  stroke="#374151"
                  strokeWidth={1}
                />
              )),
            )}

            {/* ② 移動範囲ハイライト */}
            {reachableCells.map(({ x, y }) => (
              <rect
                key={`reach-${x}-${y}`}
                x={x * CELL + 2}
                y={y * CELL + 2}
                width={CELL - 4}
                height={CELL - 4}
                fill="#60a5fa"
                fillOpacity={0.45}
                stroke="#93c5fd"
                strokeWidth={2}
                rx={4}
              />
            ))}

            {/* ③ ユニット */}
            {units.map((unit) => {
              const ch = characters[unit.characterId];
              const cx = unit.position.x * CELL + CELL / 2;
              const cy = unit.position.y * CELL + CELL / 2;
              const color = SIDE_COLOR[unit.side];
              const abbr = JOB_ABBR[ch.jobId] ?? '?';
              const hpRatio = unit.currentHp / ch.maxHp;
              const isSelected = unit.characterId === selectedUnitId;

              return (
                <g key={unit.characterId} style={{ opacity: unit.hasMoved ? 0.45 : 1 }}>
                  {isSelected && (
                    <circle cx={cx} cy={cy} r={27} fill="none" stroke="#facc15" strokeWidth={4} />
                  )}
                  <circle cx={cx} cy={cy} r={22} fill={color} stroke="#f9fafb" strokeWidth={1.5} />
                  <text x={cx} y={cy - 4} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={16} fontWeight="bold">
                    {abbr}
                  </text>
                  <rect x={cx - 18} y={cy + 13} width={36} height={5} fill="#374151" rx={2} />
                  <rect
                    x={cx - 18}
                    y={cy + 13}
                    width={36 * hpRatio}
                    height={5}
                    fill={hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.25 ? '#f59e0b' : '#ef4444'}
                    rx={2}
                  />
                  <text x={cx} y={cy + 10} textAnchor="middle" fill="#d1d5db" fontSize={9}>
                    {unit.currentHp}
                  </text>
                </g>
              );
            })}

            {/* 国名ラベル */}
            <text x={CELL * 0.5} y={-8} textAnchor="middle" fill={nations[battle.attackerNationId].color} fontSize={12}>
              {nations[battle.attackerNationId].name}
            </text>
            <text x={CELL * (map.width - 0.5)} y={-8} textAnchor="middle" fill={nations[battle.defenderNationId].color} fontSize={12}>
              {nations[battle.defenderNationId].name}
            </text>

            {/* [DEBUG] 状態表示 */}
            <text x={W / 2} y={H + 16} textAnchor="middle" fill="#9ca3af" fontSize={11}>
              選択中: {selectedUnitId ?? 'なし'} | 移動可能マス: {reachableCells.length}
            </text>
          </g>
        </svg>

        {/* ④ HTML div グリッド（クリック処理専用・SVG の上に重なる） */}
        <div
          style={{
            position: 'absolute',
            top: PADDING,
            left: PADDING,
            display: 'grid',
            gridTemplateColumns: `repeat(${map.width}, ${CELL}px)`,
            gridTemplateRows: `repeat(${map.height}, ${CELL}px)`,
            width: W,
            height: H,
          }}
        >
          {Array.from({ length: map.height }, (_, row) =>
            Array.from({ length: map.width }, (_, col) => (
              <div
                key={`${col}-${row}`}
                style={{ cursor: 'pointer' }}
                onClick={() => handleCellClick(col, row)}
              />
            )),
          )}
        </div>
      </div>
    </div>
  );
}

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

  const reachableSet = new Set(reachableCells.map((c) => `${c.x},${c.y}`));
  const unitAtPos = new Map(units.map((u) => [`${u.position.x},${u.position.y}`, u]));

  function handleCellClick(x: number, y: number) {
    const key = `${x},${y}`;
    if (selectedUnitId !== null && reachableSet.has(key)) {
      moveUnit(selectedUnitId, { x, y });
      return;
    }
    const unit = unitAtPos.get(key);
    if (unit && unit.side === currentSide && !unit.hasMoved) {
      selectUnit(unit.characterId);
    } else {
      selectUnit(null);
    }
  }

  return (
    <div style={{ overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
      <svg
        width={W + PADDING * 2}
        height={H + PADDING * 2}
        style={{ display: 'block' }}
      >
        <g transform={`translate(${PADDING}, ${PADDING})`}>

          {/* ① グリッド背景（常に同一色） */}
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

          {/* ② 移動範囲ハイライト（背景の上、ユニットの下） */}
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
              style={{ pointerEvents: 'none' }}
            />
          ))}

          {/* ③ ユニット（クリック非対応） */}
          {units.map((unit) => {
            const ch = characters[unit.characterId];
            const cx = unit.position.x * CELL + CELL / 2;
            const cy = unit.position.y * CELL + CELL / 2;
            const color = SIDE_COLOR[unit.side];
            const abbr = JOB_ABBR[ch.jobId] ?? '?';
            const hpRatio = unit.currentHp / ch.maxHp;
            const isSelected = unit.characterId === selectedUnitId;

            return (
              <g key={unit.characterId} style={{ opacity: unit.hasMoved ? 0.45 : 1, pointerEvents: 'none' }}>
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

          {/* ④ クリック透明オーバーレイ（最前面 / pointer-events:all で確実に捕捉） */}
          {Array.from({ length: map.height }, (_, row) =>
            Array.from({ length: map.width }, (_, col) => (
              <rect
                key={`hit-${col}-${row}`}
                x={col * CELL}
                y={row * CELL}
                width={CELL}
                height={CELL}
                fill="none"
                pointerEvents="all"
                style={{ cursor: 'pointer' }}
                onClick={() => handleCellClick(col, row)}
              />
            )),
          )}

          {/* 国名ラベル */}
          <text x={CELL * 0.5} y={-8} textAnchor="middle" fill={nations[battle.attackerNationId].color} fontSize={12} style={{ pointerEvents: 'none' }}>
            {nations[battle.attackerNationId].name}
          </text>
          <text x={CELL * (map.width - 0.5)} y={-8} textAnchor="middle" fill={nations[battle.defenderNationId].color} fontSize={12} style={{ pointerEvents: 'none' }}>
            {nations[battle.defenderNationId].name}
          </text>
        </g>
      </svg>
    </div>
  );
}

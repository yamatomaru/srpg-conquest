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
    if (selectedUnitId && reachableSet.has(key)) {
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
          {/* グリッドセル */}
          {Array.from({ length: map.height }, (_, row) =>
            Array.from({ length: map.width }, (_, col) => {
              const key = `${col},${row}`;
              const isReachable = reachableSet.has(key);
              return (
                <rect
                  key={key}
                  x={col * CELL}
                  y={row * CELL}
                  width={CELL}
                  height={CELL}
                  fill={isReachable ? '#1e4d8a' : '#1e3a5f'}
                  stroke={isReachable ? '#60a5fa' : '#374151'}
                  strokeWidth={isReachable ? 2 : 1}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleCellClick(col, row)}
                />
              );
            }),
          )}

          {/* ユニット */}
          {units.map((unit) => {
            const ch = characters[unit.characterId];
            const cx = unit.position.x * CELL + CELL / 2;
            const cy = unit.position.y * CELL + CELL / 2;
            const color = SIDE_COLOR[unit.side];
            const abbr = JOB_ABBR[ch.jobId] ?? '?';
            const hpRatio = unit.currentHp / ch.maxHp;
            const isSelected = unit.characterId === selectedUnitId;
            const isMoved = unit.hasMoved;

            return (
              <g
                key={unit.characterId}
                style={{ cursor: 'pointer', opacity: isMoved ? 0.45 : 1 }}
                onClick={() => handleCellClick(unit.position.x, unit.position.y)}
              >
                {/* 選択リング */}
                {isSelected && (
                  <circle cx={cx} cy={cy} r={26} fill="none" stroke="#facc15" strokeWidth={3} />
                )}
                {/* ユニット本体 */}
                <circle cx={cx} cy={cy} r={22} fill={color} stroke="#f9fafb" strokeWidth={1.5} />
                {/* ジョブ略称 */}
                <text
                  x={cx}
                  y={cy - 4}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#fff"
                  fontSize={16}
                  fontWeight="bold"
                  style={{ pointerEvents: 'none' }}
                >
                  {abbr}
                </text>
                {/* HP バー背景 */}
                <rect x={cx - 18} y={cy + 13} width={36} height={5} fill="#374151" rx={2} />
                {/* HP バー */}
                <rect
                  x={cx - 18}
                  y={cy + 13}
                  width={36 * hpRatio}
                  height={5}
                  fill={hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.25 ? '#f59e0b' : '#ef4444'}
                  rx={2}
                />
                {/* HP 数値 */}
                <text
                  x={cx}
                  y={cy + 10}
                  textAnchor="middle"
                  fill="#d1d5db"
                  fontSize={9}
                  style={{ pointerEvents: 'none' }}
                >
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
        </g>
      </svg>
    </div>
  );
}

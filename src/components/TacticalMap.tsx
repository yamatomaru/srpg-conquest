import { useEffect, useRef, useState } from 'react';
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

interface Popup {
  id: number;
  x: number;
  y: number;
  damage: number;
  defeated: boolean;
}

let popupCounter = 0;

export default function TacticalMap() {
  const { battle, characters, nations, selectUnit, moveUnit, attackUnit } = useGameStore();
  const [popups, setPopups] = useState<Popup[]>([]);
  const prevLogRef = useRef(battle?.recentLog[0] ?? null);

  // ダメージポップアップ
  const currentLog = battle?.recentLog[0] ?? null;
  useEffect(() => {
    if (!currentLog || currentLog === prevLogRef.current) return;
    prevLogRef.current = currentLog;
    const id = ++popupCounter;
    const { defenderPos, damage, defeated } = currentLog;
    setPopups((p) => [...p, { id, x: defenderPos.x, y: defenderPos.y, damage, defeated }]);
    const timer = setTimeout(
      () => setPopups((p) => p.filter((pp) => pp.id !== id)),
      900,
    );
    return () => clearTimeout(timer);
  }, [currentLog]);

  if (!battle) return null;

  const { map, units, selectedUnitId, reachableCells, attackTargets, currentSide } = battle;
  const W = map.width * CELL;
  const H = map.height * CELL;
  const SVG_W = W + PADDING * 2;
  const SVG_H = H + PADDING * 2;

  const reachableSet = new Set(reachableCells.map((c) => `${c.x},${c.y}`));
  const attackTargetSet = new Set(attackTargets);
  const unitAtPos = new Map(units.map((u) => [`${u.position.x},${u.position.y}`, u]));

  function handleCellClick(x: number, y: number) {
    const unit = unitAtPos.get(`${x},${y}`);

    // 攻撃
    if (selectedUnitId !== null && unit && attackTargetSet.has(unit.characterId)) {
      attackUnit(selectedUnitId, unit.characterId);
      return;
    }
    // 移動
    if (selectedUnitId !== null && reachableSet.has(`${x},${y}`)) {
      moveUnit(selectedUnitId, { x, y });
      return;
    }
    // 選択 / 解除
    if (unit && unit.side === currentSide && !unit.hasActed) {
      selectUnit(unit.characterId);
    } else {
      selectUnit(null);
    }
  }

  return (
    <div style={{ overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <svg width={SVG_W} height={SVG_H} style={{ display: 'block' }}>
          <g transform={`translate(${PADDING}, ${PADDING})`}>

            {/* ① グリッド背景 */}
            {Array.from({ length: map.height }, (_, row) =>
              Array.from({ length: map.width }, (_, col) => (
                <rect
                  key={`bg-${col}-${row}`}
                  x={col * CELL} y={row * CELL}
                  width={CELL} height={CELL}
                  fill="#1e3a5f" stroke="#374151" strokeWidth={1}
                />
              )),
            )}

            {/* ② 移動範囲ハイライト（青） */}
            {reachableCells.map(({ x, y }) => (
              <rect
                key={`reach-${x}-${y}`}
                x={x * CELL + 2} y={y * CELL + 2}
                width={CELL - 4} height={CELL - 4}
                fill="#60a5fa" fillOpacity={0.4}
                stroke="#93c5fd" strokeWidth={2} rx={4}
              />
            ))}

            {/* ③ 攻撃対象ハイライト（赤） */}
            {units
              .filter((u) => attackTargetSet.has(u.characterId))
              .map((u) => (
                <rect
                  key={`atk-${u.characterId}`}
                  x={u.position.x * CELL + 2} y={u.position.y * CELL + 2}
                  width={CELL - 4} height={CELL - 4}
                  fill="#ef4444" fillOpacity={0.35}
                  stroke="#fca5a5" strokeWidth={2} rx={4}
                />
              ))}

            {/* ④ ユニット */}
            {units.map((unit) => {
              const ch = characters[unit.characterId];
              const cx = unit.position.x * CELL + CELL / 2;
              const cy = unit.position.y * CELL + CELL / 2;
              const color = SIDE_COLOR[unit.side];
              const hpRatio = unit.currentHp / ch.maxHp;
              const isSelected = unit.characterId === selectedUnitId;

              return (
                <g key={unit.characterId} style={{ opacity: unit.hasActed ? 0.45 : 1 }}>
                  {isSelected && (
                    <circle cx={cx} cy={cy} r={27} fill="none" stroke="#facc15" strokeWidth={4} />
                  )}
                  <circle cx={cx} cy={cy} r={22} fill={color} stroke="#f9fafb" strokeWidth={1.5} />
                  <text x={cx} y={cy - 4} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={16} fontWeight="bold">
                    {JOB_ABBR[ch.jobId] ?? '?'}
                  </text>
                  <rect x={cx - 18} y={cy + 13} width={36} height={5} fill="#374151" rx={2} />
                  <rect
                    x={cx - 18} y={cy + 13}
                    width={36 * hpRatio} height={5}
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
          </g>
        </svg>

        {/* ⑤ クリック HTML グリッド */}
        <div
          style={{
            position: 'absolute',
            top: PADDING, left: PADDING,
            display: 'grid',
            gridTemplateColumns: `repeat(${map.width}, ${CELL}px)`,
            gridTemplateRows: `repeat(${map.height}, ${CELL}px)`,
            width: W, height: H,
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

        {/* ⑥ ダメージポップアップ */}
        {popups.map((popup) => (
          <div
            key={popup.id}
            style={{
              position: 'absolute',
              left: PADDING + popup.x * CELL + CELL / 2,
              top: PADDING + popup.y * CELL - 8,
              transform: 'translateX(-50%)',
              color: popup.defeated ? '#f87171' : '#fbbf24',
              fontWeight: 'bold',
              fontSize: popup.defeated ? 22 : 18,
              pointerEvents: 'none',
              animation: 'dmgPopup 0.9s ease-out forwards',
              textShadow: '0 0 6px rgba(0,0,0,0.9)',
              whiteSpace: 'nowrap',
            }}
          >
            {popup.defeated ? `${popup.damage} 撃破！` : `-${popup.damage}`}
          </div>
        ))}
      </div>
    </div>
  );
}

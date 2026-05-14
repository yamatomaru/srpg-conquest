import { useEffect, useRef, useState, useMemo } from 'react';
import { useGameStore } from '../game/store';
import { JOB_ABBR } from '../data/jobs';
import { TERRAIN_DEFS } from '../game/terrain';
import { calcReachable } from '../game/tactical/movement';
import { calculateDamage } from '../game/tactical/attack';
import type { TerrainType } from '../game/types';
import JobIcon from './JobIcon';

const CELL = 90;
const PADDING = 36;

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

/** 地形ごとの SVG アイコン（セル内部に重ねて描画） */
function TerrainIcon({ type, cx, cy }: { type: TerrainType; cx: number; cy: number }) {
  switch (type) {
    case 'forest':
      return (
        <g opacity={0.55} pointerEvents="none">
          <polygon points={`${cx-22},${cy+12} ${cx-13},${cy-6} ${cx-4},${cy+12}`} fill="#4ade80" />
          <rect x={cx-17} y={cy+11} width={4} height={7} fill="#92400e" />
          <polygon points={`${cx+4},${cy+12} ${cx+15},${cy-8} ${cx+26},${cy+12}`} fill="#22c55e" />
          <rect x={cx+13} y={cy+11} width={4} height={7} fill="#92400e" />
        </g>
      );
    case 'mountain':
      return (
        <g opacity={0.45} pointerEvents="none">
          <polygon points={`${cx+6},${cy-18} ${cx+28},${cy+14} ${cx-16},${cy+14}`} fill="#6b7280" />
          <polygon points={`${cx-8},${cy-14} ${cx+20},${cy+14} ${cx-28},${cy+14}`} fill="#9ca3af" />
          <polygon points={`${cx-8},${cy-14} ${cx},${cy-5} ${cx-16},${cy-5}`} fill="#f9fafb" />
        </g>
      );
    case 'fortress':
      return (
        <g opacity={0.65} pointerEvents="none">
          <rect x={cx-14} y={cy-6} width={28} height={22} fill="#92400e" />
          <rect x={cx-14} y={cy-18} width={7} height={13} fill="#92400e" />
          <rect x={cx-4}  y={cy-18} width={7} height={13} fill="#92400e" />
          <rect x={cx+7}  y={cy-18} width={7} height={13} fill="#92400e" />
          <rect x={cx-5} y={cy+4} width={10} height={12} fill="#111827" rx={3} />
          <rect x={cx-3} y={cy-4} width={6} height={7} fill="#111827" />
        </g>
      );
    default:
      return null;
  }
}

export default function TacticalMap() {
  const { battle, characters, nations, isAIThinking, selectUnit, moveUnit, attackUnit, moveAndAttack, executeSkill, endBattle } = useGameStore();
  const [popups, setPopups] = useState<Popup[]>([]);
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);
  const [spriteErrors, setSpriteErrors] = useState<Record<string, 'char_failed' | 'job_failed'>>({});
  const prevLogRef = useRef(battle?.recentLog[0] ?? null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const svgWRef = useRef(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ob = new ResizeObserver(([entry]) => {
      if (svgWRef.current === 0) return;
      setScale(Math.min(1, entry.contentRect.width / svgWRef.current));
    });
    ob.observe(el);
    return () => ob.disconnect();
  }, []);

  const pendingEnd = battle?.pendingEnd ?? null;
  useEffect(() => {
    if (!pendingEnd) return;
    const timer = setTimeout(() => endBattle(pendingEnd), 900);
    return () => clearTimeout(timer);
  }, [pendingEnd]);

  const currentLog = battle?.recentLog[0] ?? null;
  useEffect(() => {
    if (!currentLog || currentLog === prevLogRef.current) return;
    prevLogRef.current = currentLog;
    const id = ++popupCounter;
    const { defenderPos, damage, defeated } = currentLog;
    setPopups((p) => [...p, { id, x: defenderPos.x, y: defenderPos.y, damage, defeated }]);
    const timer = setTimeout(() => setPopups((p) => p.filter((pp) => pp.id !== id)), 900);
    return () => clearTimeout(timer);
  }, [currentLog]);

  if (!battle) return null;

  const { map, units, selectedUnitId, reachableCells, attackTargets, skillMode, skillTargets } = battle;

  const currentActiveId = battle.initiativeOrder[battle.initiativeIndex];

  // ── ワンクリック攻撃対象を計算（プレイヤーターン、未行動ユニットのみ）──
  const quickAttackTargetSet = useMemo(() => {
    if (isAIThinking || battle.autoTactical) return new Set<string>();
    const activeUnit = units.find((u) => u.characterId === currentActiveId);
    if (!activeUnit || activeUnit.side !== battle.playerSide || activeUnit.hasActed) return new Set<string>();
    const ch = characters[activeUnit.characterId];
    if (!ch) return new Set<string>();

    const manhattan = (a: {x:number;y:number}, b: {x:number;y:number}) =>
      Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

    const enemies = units.filter((u) => u.side !== activeUnit.side);
    const result = new Set<string>();

    // 既に射程内の敵
    enemies.forEach((e) => {
      const d = manhattan(activeUnit.position, e.position);
      if (d >= 1 && d <= ch.range) result.add(e.characterId);
    });

    // 移動後に射程内に入れる敵
    if (!activeUnit.hasMoved) {
      const reachable = calcReachable(activeUnit, ch.mov, units, map.width, map.height, map.terrain);
      enemies.forEach((e) => {
        if (result.has(e.characterId)) return;
        const canReach = reachable.some((c) => {
          const d = manhattan(c, e.position);
          return d >= 1 && d <= ch.range;
        });
        if (canReach) result.add(e.characterId);
      });
    }
    return result;
  }, [currentActiveId, units, characters, isAIThinking, battle.autoTactical, battle.playerSide]);

  const W = map.width * CELL;
  const H = map.height * CELL;
  const SVG_W = W + PADDING * 2;
  const SVG_H = H + PADDING * 2;
  svgWRef.current = SVG_W;

  const reachableSet = new Set(reachableCells.map((c) => `${c.x},${c.y}`));
  const attackTargetSet = new Set(attackTargets);
  const skillTargetSet = new Set(skillTargets);
  const unitAtPos = new Map(units.map((u) => [`${u.position.x},${u.position.y}`, u]));

  function handleCellClick(x: number, y: number) {
    const unit = unitAtPos.get(`${x},${y}`);

    // スキルモード: スキルターゲットをクリック
    if (skillMode && selectedUnitId !== null && unit && skillTargetSet.has(unit.characterId)) {
      executeSkill(selectedUnitId, unit.characterId);
      return;
    }
    if (selectedUnitId !== null && unit && attackTargetSet.has(unit.characterId)) {
      attackUnit(selectedUnitId, unit.characterId);
      return;
    }
    if (selectedUnitId !== null && reachableSet.has(`${x},${y}`)) {
      moveUnit(selectedUnitId, { x, y });
      return;
    }
    // ▼ ワンクリック攻撃: 現在アクティブユニットが未行動 + 敵をクリック
    if (unit && quickAttackTargetSet.has(unit.characterId)) {
      moveAndAttack(currentActiveId, unit.characterId);
      return;
    }
    if (unit && unit.characterId === currentActiveId && unit.side === battle!.playerSide && !unit.hasActed) {
      selectUnit(unit.characterId);
    } else {
      selectUnit(null);
    }
  }

  return (
    <div
      ref={containerRef}
      style={{ overflow: 'hidden', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
    >
      <div style={{ width: SVG_W * scale, height: SVG_H * scale, position: 'relative', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: SVG_W, height: SVG_H, transformOrigin: 'top left', transform: `scale(${scale})` }}>
        <svg width={SVG_W} height={SVG_H} style={{ display: 'block' }}>
          <g transform={`translate(${PADDING}, ${PADDING})`}>

            {/* グリッド背景（地形カラー + アイコン） */}
            {Array.from({ length: map.height }, (_, row) =>
              Array.from({ length: map.width }, (_, col) => {
                const terrainType = map.terrain?.[row]?.[col] ?? 'plain';
                const terrainColor = TERRAIN_DEFS[terrainType].color;
                const cx = col * CELL + CELL / 2;
                const cy = row * CELL + CELL / 2;
                const isHovered = hoveredCell?.x === col && hoveredCell?.y === row;
                return (
                  <g key={`bg-${col}-${row}`}>
                    <rect
                      x={col * CELL} y={row * CELL}
                      width={CELL} height={CELL}
                      fill={terrainColor} stroke="#374151" strokeWidth={1}
                    />
                    <TerrainIcon type={terrainType} cx={cx} cy={cy} />
                    {/* 地形ラベル（小） */}
                    {terrainType !== 'plain' && (
                      <text x={col * CELL + 5} y={row * CELL + 14}
                        fill="#ffffff" fillOpacity={0.45} fontSize={10}>
                        {TERRAIN_DEFS[terrainType].label}
                      </text>
                    )}
                    {/* ホバーハイライト */}
                    {isHovered && (
                      <rect
                        x={col * CELL} y={row * CELL}
                        width={CELL} height={CELL}
                        fill="rgba(255,255,255,0.08)"
                        stroke="rgba(255,255,255,0.3)" strokeWidth={1.5}
                      />
                    )}
                  </g>
                );
              }),
            )}

            {/* 移動範囲ハイライト */}
            {reachableCells.map(({ x, y }) => (
              <rect
                key={`reach-${x}-${y}`}
                x={x * CELL + 3} y={y * CELL + 3}
                width={CELL - 6} height={CELL - 6}
                fill="#60a5fa" fillOpacity={0.4}
                stroke="#93c5fd" strokeWidth={2} rx={6}
              />
            ))}

            {/* スキルターゲットハイライト */}
            {skillMode && units.filter((u) => skillTargetSet.has(u.characterId)).map((u) => (
              <rect
                key={`skill-${u.characterId}`}
                x={u.position.x * CELL + 3} y={u.position.y * CELL + 3}
                width={CELL - 6} height={CELL - 6}
                fill="#a855f7" fillOpacity={0.45}
                stroke="#d8b4fe" strokeWidth={2} rx={6}
              />
            ))}

            {/* 攻撃対象ハイライト */}
            {units.filter((u) => attackTargetSet.has(u.characterId)).map((u) => (
              <rect
                key={`atk-${u.characterId}`}
                x={u.position.x * CELL + 3} y={u.position.y * CELL + 3}
                width={CELL - 6} height={CELL - 6}
                fill="#ef4444" fillOpacity={0.35}
                stroke="#fca5a5" strokeWidth={2} rx={6}
              />
            ))}

            {/* ▼ ワンクリック攻撃インジケーター */}
            {!skillMode && units.filter((u) => quickAttackTargetSet.has(u.characterId) && !attackTargetSet.has(u.characterId)).map((u) => (
              <g key={`qatk-${u.characterId}`}>
                <rect
                  x={u.position.x * CELL + 3} y={u.position.y * CELL + 3}
                  width={CELL - 6} height={CELL - 6}
                  fill="#f97316" fillOpacity={0.18}
                  stroke="#fb923c" strokeWidth={1.5} rx={6} strokeDasharray="5 3"
                />
                <text
                  x={u.position.x * CELL + CELL / 2}
                  y={u.position.y * CELL + 14}
                  textAnchor="middle" fill="#fb923c" fontSize={18} fontWeight="bold"
                >▼</text>
              </g>
            ))}

            {/* ユニット */}
            {units.map((unit) => {
              const ch = characters[unit.characterId];
              const cx = unit.position.x * CELL + CELL / 2;
              const cy = unit.position.y * CELL + CELL / 2;
              const color = SIDE_COLOR[unit.side];
              const hpRatio = unit.currentHp / ch.maxHp;
              const isSelected = unit.characterId === selectedUnitId;
              const isActive = unit.characterId === currentActiveId;
              // スプライト表示状態: 画像なし or エラー済みなら SVGアイコン表示
              const spriteErr = spriteErrors[unit.characterId];
              const showSprite = ch.spritePath && spriteErr !== 'job_failed';

              return (
                <g key={unit.characterId} style={{ opacity: unit.hasActed ? 0.45 : 1 }}>
                  {/* アクティブユニットのアニメーションリング */}
                  {isActive && !unit.hasActed && (
                    <circle cx={cx} cy={cy} r={42} fill="none" stroke="#facc15" strokeWidth={3} strokeDasharray="9 4" />
                  )}
                  {/* 選択リング */}
                  {isSelected && (
                    <circle cx={cx} cy={cy} r={40} fill="none" stroke="#ffffff" strokeWidth={3} />
                  )}
                  {/* 影 */}
                  <circle cx={cx + 2} cy={cy + 3} r={33} fill="rgba(0,0,0,0.35)" />
                  {/* 本体サークル */}
                  <circle cx={cx} cy={cy} r={33} fill={color} />
                  {/* スプライトなし → SVGアイコン */}
                  {!showSprite && (
                    <foreignObject x={cx - 22} y={cy - 26} width={44} height={44}>
                      <JobIcon jobId={ch.jobId} size={44} color="#fff" />
                    </foreignObject>
                  )}
                  {/* 国色リング */}
                  <circle cx={cx} cy={cy} r={33} fill="none" stroke={color} strokeWidth={2.5} opacity={0.9} />
                  {/* HP バー背景 */}
                  <rect x={cx - 27} y={cy + 21} width={54} height={7} fill="#1f2937" rx={3} />
                  {/* HP バー */}
                  <rect
                    x={cx - 27} y={cy + 21}
                    width={54 * hpRatio} height={7}
                    fill={hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.25 ? '#f59e0b' : '#ef4444'}
                    rx={3}
                  />
                  {/* HP 数値 */}
                  <text x={cx} y={cy + 15} textAnchor="middle" fill="#e5e7eb" fontSize={13}>
                    {unit.currentHp}
                  </text>
                  {/* ジョブ略称バッジ（スプライット有りの場合も小さく表示） */}
                  <text x={cx} y={cy + 30} textAnchor="middle" fill="#cbd5e1" fontSize={14} fontWeight="bold">
                    {JOB_ABBR[ch.jobId] ?? '?'}
                  </text>
                  {/* 渾身撃マーク */}
                  {battle.powerAttackIds.includes(unit.characterId) && (
                    <text x={cx + 28} y={cy - 22} textAnchor="middle" fill="#facc15" fontSize={18} fontWeight="bold">★</text>
                  )}
                </g>
              );
            })}

            {/* 国名ラベル */}
            <text x={CELL * 0.5} y={-12} textAnchor="middle"
              fill={nations[battle.attackerNationId].color} fontSize={18}>
              {nations[battle.attackerNationId].name}
            </text>
            <text x={CELL * (map.width - 0.5)} y={-12} textAnchor="middle"
              fill={nations[battle.defenderNationId].color} fontSize={18}>
              {nations[battle.defenderNationId].name}
            </text>
          </g>
        </svg>

        {/* スプライトオーバーレイ（3段フォールバック: キャラ → ジョブ → SVGアイコン） */}
        {units.map((unit) => {
          const ch = characters[unit.characterId];
          if (!ch.spritePath) return null;
          const err = spriteErrors[unit.characterId];
          if (err === 'job_failed') return null; // SVGアイコンにフォールバック済み
          const left = PADDING + unit.position.x * CELL + CELL / 2 - 33;
          const top  = PADDING + unit.position.y * CELL + CELL / 2 - 33;
          // 段階的フォールバック: キャラPNG → ジョブPNG → SVGアイコン
          const src = err === 'char_failed'
            ? `/sprites/${ch.jobId}.png`
            : ch.spritePath;
          return (
            <img
              key={`sprite-${unit.characterId}`}
              src={src}
              width={66} height={66}
              style={{
                position: 'absolute', left, top,
                borderRadius: '50%',
                imageRendering: 'pixelated',
                pointerEvents: 'none',
                opacity: unit.hasActed ? 0.45 : 1,
              }}
              onError={() => {
                setSpriteErrors((prev) => {
                  const cur = prev[unit.characterId];
                  if (!cur) return { ...prev, [unit.characterId]: 'char_failed' };
                  if (cur === 'char_failed') return { ...prev, [unit.characterId]: 'job_failed' };
                  return prev;
                });
              }}
            />
          );
        })}

        {/* 職業バッジオーバーレイ（スプライトの上） */}
        {units.map((unit) => {
          const ch = characters[unit.characterId];
          const color = SIDE_COLOR[unit.side];
          const centerX = PADDING + unit.position.x * CELL + CELL / 2;
          const centerY = PADDING + unit.position.y * CELL + CELL / 2;
          return (
            <div
              key={`job-${unit.characterId}`}
              style={{
                position: 'absolute',
                left: centerX - 14,
                top: centerY + 20,
                width: 28,
                height: 18,
                background: color,
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 13,
                fontWeight: 'bold',
                pointerEvents: 'none',
                opacity: unit.hasActed ? 0.45 : 1,
                boxShadow: '0 1px 3px rgba(0,0,0,0.8)',
              }}
            >
              {JOB_ABBR[ch.jobId] ?? '?'}
            </div>
          );
        })}

        {/* クリックグリッド（ホバー検出込み） */}
        {!isAIThinking && (
          <div
            style={{
              position: 'absolute',
              top: PADDING, left: PADDING,
              display: 'grid',
              gridTemplateColumns: `repeat(${map.width}, ${CELL}px)`,
              gridTemplateRows: `repeat(${map.height}, ${CELL}px)`,
              width: W, height: H,
            }}
            onMouseLeave={() => setHoveredCell(null)}
          >
            {Array.from({ length: map.height }, (_, row) =>
              Array.from({ length: map.width }, (_, col) => (
                <div
                  key={`${col}-${row}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleCellClick(col, row)}
                  onMouseEnter={() => setHoveredCell({ x: col, y: row })}
                />
              )),
            )}
          </div>
        )}

        {/* ホバーツールチップ */}
        {hoveredCell && (() => {
          const { x, y } = hoveredCell;
          const terrainType = map.terrain?.[y]?.[x] ?? 'plain';
          const def = TERRAIN_DEFS[terrainType];

          // 攻撃プレビュー計算
          const hoveredUnit = unitAtPos.get(`${x},${y}`);
          const activeUnit = units.find((u) => u.characterId === currentActiveId);
          const activeChar = activeUnit ? characters[activeUnit.characterId] : null;

          let atkPreviewText: string | null = null;
          if (
            hoveredUnit && activeUnit && activeChar &&
            hoveredUnit.side !== activeUnit.side &&
            (attackTargetSet.has(hoveredUnit.characterId) || quickAttackTargetSet.has(hoveredUnit.characterId))
          ) {
            const defChar = characters[hoveredUnit.characterId];
            const isPower = battle!.powerAttackIds.includes(activeUnit.characterId);
            const dmgWith    = calculateDamage(activeChar, defChar, terrainType, isPower);
            const dmgWithout = calculateDamage(activeChar, defChar, undefined,   isPower);
            const reduction = dmgWithout - dmgWith;
            atkPreviewText = reduction > 0
              ? `ダメージ予測: ${dmgWith} (地形補正 -${reduction})`
              : `ダメージ予測: ${dmgWith}`;
          }

          const tipX = (PADDING + x * CELL + (x < map.width - 2 ? CELL + 4 : -140)) * scale;
          const tipY = (PADDING + y * CELL) * scale;

          return (
            <div style={{
              position: 'absolute',
              left: tipX, top: tipY,
              background: 'rgba(15,23,42,0.95)',
              border: '1px solid #374151',
              borderRadius: 6,
              padding: '7px 10px',
              fontSize: 12,
              color: '#e5e7eb',
              pointerEvents: 'none',
              zIndex: 50,
              minWidth: 130,
              boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: 4, color: '#fbbf24' }}>
                {def.label}
              </div>
              <div style={{ color: '#9ca3af', lineHeight: 1.7 }}>
                <div>移動コスト: <span style={{ color: def.movCost > 1 ? '#f97316' : '#9ca3af' }}>{def.movCost}</span></div>
                {def.defBonus > 0 && <div>DEF補正: <span style={{ color: '#60a5fa' }}>+{def.defBonus}</span></div>}
                {def.mdefBonus > 0 && <div>MDEF補正: <span style={{ color: '#c084fc' }}>+{def.mdefBonus}</span></div>}
              </div>
              {atkPreviewText && (
                <div style={{ marginTop: 6, paddingTop: 5, borderTop: '1px solid #374151', color: '#fca5a5', fontWeight: 'bold' }}>
                  {atkPreviewText}
                </div>
              )}
            </div>
          );
        })()}

        {/* ダメージポップアップ */}
        {popups.map((popup) => (
          <div
            key={popup.id}
            style={{
              position: 'absolute',
              left: PADDING + popup.x * CELL + CELL / 2,
              top: PADDING + popup.y * CELL - 12,
              transform: 'translateX(-50%)',
              color: popup.defeated ? '#f87171' : '#fbbf24',
              fontWeight: 'bold',
              fontSize: popup.defeated ? 33 : 27,
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
    </div>
  );
}

import { useGameStore } from '../game/store';

const RADIUS = 40;

export default function StrategicMap() {
  const { territories, nations, ui, selectTerritory, executeInvasion } = useGameStore();
  const { selectedTerritoryId, invasionMode } = ui;

  // 隣接線を重複なく生成
  const lines: [string, string][] = [];
  const seen = new Set<string>();
  Object.values(territories).forEach((t) => {
    t.adjacentTo.forEach((adjId) => {
      const key = [t.id, adjId].sort().join('-');
      if (!seen.has(key)) {
        seen.add(key);
        lines.push([t.id, adjId]);
      }
    });
  });

  const handleClick = (tId: string) => {
    if (invasionMode) {
      const fromId = invasionMode.fromTerritoryId;
      const from = territories[fromId];
      const to = territories[tId];
      if (from.adjacentTo.includes(tId) && to.ownerId !== from.ownerId) {
        executeInvasion(fromId, tId);
      }
    } else {
      selectTerritory(tId === selectedTerritoryId ? null : tId);
    }
  };

  return (
    <svg
      width={680}
      height={440}
      style={{ background: '#1a1a2e', borderRadius: 8, display: 'block' }}
    >
      {/* 隣接線（円より背面） */}
      {lines.map(([aId, bId]) => {
        const a = territories[aId];
        const b = territories[bId];
        return (
          <line
            key={`${aId}-${bId}`}
            x1={a.position.x}
            y1={a.position.y}
            x2={b.position.x}
            y2={b.position.y}
            stroke="#374151"
            strokeWidth={2}
          />
        );
      })}

      {/* 領地円 */}
      {Object.values(territories).map((t) => {
        const nation = nations[t.ownerId];
        const isSelected = t.id === selectedTerritoryId;
        const isSource = invasionMode?.fromTerritoryId === t.id;

        let isTarget = false;
        if (invasionMode) {
          const from = territories[invasionMode.fromTerritoryId];
          isTarget =
            from.adjacentTo.includes(t.id) && t.ownerId !== from.ownerId;
        }

        let stroke = '#4b5563';
        let strokeWidth = 1;
        if (isSource || isSelected) {
          stroke = '#ffffff';
          strokeWidth = 3;
        } else if (isTarget) {
          stroke = '#f59e0b';
          strokeWidth = 3;
        }

        return (
          <g
            key={t.id}
            onClick={() => handleClick(t.id)}
            style={{ cursor: 'pointer' }}
          >
            <circle
              cx={t.position.x}
              cy={t.position.y}
              r={RADIUS}
              fill={nation.color}
              stroke={stroke}
              strokeWidth={strokeWidth}
              opacity={nation.defeated ? 0.35 : 1}
            />
            <text
              x={t.position.x}
              y={t.position.y - 9}
              textAnchor="middle"
              fill="#fff"
              fontSize={10}
              fontWeight="bold"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {t.name}
            </text>
            <text
              x={t.position.x}
              y={t.position.y + 8}
              textAnchor="middle"
              fill="#fff"
              fontSize={11}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              兵{t.garrisonIds.length}名
            </text>
          </g>
        );
      })}
    </svg>
  );
}

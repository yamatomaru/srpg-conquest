import { useGameStore } from '../game/store';

const RADIUS = 42;

export default function StrategicMap() {
  const { territories, nations, ui, selectTerritory, openInvasionPanel, openTransferPanel } = useGameStore();
  const { selectedTerritoryId, invasionMode, transferMode } = ui;

  const playerNation = Object.values(nations).find((n) => n.isPlayer)!;

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
        openInvasionPanel(fromId, tId);
      }
    } else if (transferMode) {
      const fromId = transferMode.fromTerritoryId;
      const from = territories[fromId];
      const to = territories[tId];
      if (tId !== fromId && from.adjacentTo.includes(tId) && to.ownerId === from.ownerId) {
        openTransferPanel(fromId, tId);
      }
    } else {
      selectTerritory(tId === selectedTerritoryId ? null : tId);
    }
  };

  return (
    <svg
      width={980}
      height={700}
      style={{ background: '#1a1a2e', borderRadius: 8, display: 'block' }}
    >
      {/* 隣接線 */}
      {lines.map(([aId, bId]) => {
        const a = territories[aId];
        const b = territories[bId];
        const fromT = invasionMode ? territories[invasionMode.fromTerritoryId]
          : transferMode ? territories[transferMode.fromTerritoryId] : null;
        const activeMode = invasionMode ?? transferMode;
        const isTargetLine =
          activeMode &&
          (activeMode.fromTerritoryId === aId || activeMode.fromTerritoryId === bId) &&
          fromT &&
          fromT.adjacentTo.includes(aId === activeMode.fromTerritoryId ? bId : aId) &&
          (invasionMode
            ? territories[aId === activeMode.fromTerritoryId ? bId : aId].ownerId !== fromT.ownerId
            : territories[aId === activeMode.fromTerritoryId ? bId : aId].ownerId === fromT.ownerId);

        return (
          <line
            key={`${aId}-${bId}`}
            x1={a.position.x} y1={a.position.y}
            x2={b.position.x} y2={b.position.y}
            stroke={isTargetLine ? '#f59e0b' : '#374151'}
            strokeWidth={isTargetLine ? 4 : 2}
          />
        );
      })}

      {/* 領地円 */}
      {Object.values(territories).map((t) => {
        const nation = nations[t.ownerId];
        const isSelected = t.id === selectedTerritoryId;
        const isSource = invasionMode?.fromTerritoryId === t.id || transferMode?.fromTerritoryId === t.id;
        const isPlayerOwned = t.ownerId === playerNation.id;

        let isTarget = false;
        if (invasionMode) {
          const from = territories[invasionMode.fromTerritoryId];
          isTarget = from.adjacentTo.includes(t.id) && t.ownerId !== from.ownerId;
        } else if (transferMode) {
          const from = territories[transferMode.fromTerritoryId];
          isTarget = from.adjacentTo.includes(t.id) && t.ownerId === from.ownerId && t.id !== from.id;
        }

        const anyMode = invasionMode ?? transferMode;
        let opacity = nation.defeated ? 0.25 : 1;
        if (!nation.defeated) {
          if (anyMode && !isSource && !isTarget) opacity = 0.4;
          else if (isPlayerOwned && t.hasActed && !anyMode) opacity = 0.55;
        }

        let stroke = '#4b5563';
        let strokeWidth = 2;
        if (isSource) { stroke = '#ffffff'; strokeWidth = 4; }
        else if (isTarget) { stroke = transferMode ? '#22c55e' : '#f59e0b'; strokeWidth = 4; }
        else if (isSelected) { stroke = '#93c5fd'; strokeWidth = 4; }

        const isCapital = nations[t.ownerId]?.capitalTerritoryId === t.id;

        return (
          <g key={t.id} onClick={() => handleClick(t.id)} style={{ cursor: 'pointer', opacity }}>
            <circle
              cx={t.position.x} cy={t.position.y} r={RADIUS}
              fill={nation.color} stroke={stroke} strokeWidth={strokeWidth}
            />
            {/* 本拠地マーク（二重リング） */}
            {isCapital && (
              <circle
                cx={t.position.x} cy={t.position.y} r={RADIUS - 5}
                fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={2}
                style={{ pointerEvents: 'none' }}
              />
            )}
            {isPlayerOwned && t.hasActed && !invasionMode && (
              <text x={t.position.x + RADIUS - 7} y={t.position.y - RADIUS + 12}
                textAnchor="middle" fill="#fbbf24" fontSize={16}
                style={{ pointerEvents: 'none', userSelect: 'none' }}>✓</text>
            )}
            {/* 本拠地ラベル */}
            {isCapital && (
              <text x={t.position.x} y={t.position.y - RADIUS - 6}
                textAnchor="middle" fill="#fde68a" fontSize={14} fontWeight="bold"
                style={{ pointerEvents: 'none', userSelect: 'none' }}>★本拠地</text>
            )}
            <text x={t.position.x} y={t.position.y - 10}
              textAnchor="middle" fill="#fff" fontSize={13} fontWeight="bold"
              style={{ pointerEvents: 'none', userSelect: 'none' }}>
              {t.name}
            </text>
            <text x={t.position.x} y={t.position.y + 12}
              textAnchor="middle" fill="#e5e7eb" fontSize={15}
              style={{ pointerEvents: 'none', userSelect: 'none' }}>
              兵{t.garrisonIds.length}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

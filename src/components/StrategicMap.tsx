import { useGameStore } from '../game/store';

const RADIUS = 42;

export default function StrategicMap() {
  const {
    territories, nations, ui, marchPlans,
    selectTerritory, openInvasionPanel, openTransferPanel,
    previewMarchPlan, createMarchPlan, cancelMarchPlanMode,
  } = useGameStore();
  const { selectedTerritoryId, invasionMode, transferMode, marchPlanMode, marchPlanPreview } = ui;

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

  // アクティブな行軍計画のパスセグメントをまとめる
  const planSegments: { aId: string; bId: string; isDone: boolean }[] = [];
  marchPlans.forEach((plan) => {
    if (plan.status === 'cancelled') return;
    const isDone = plan.status === 'done';
    for (let i = plan.currentIndex; i < plan.path.length - 1; i++) {
      planSegments.push({ aId: plan.path[i], bId: plan.path[i + 1], isDone });
    }
  });

  // プレビュー中のパスセグメント
  const previewSegments = new Set<string>();
  if (marchPlanPreview) {
    for (let i = 0; i < marchPlanPreview.path.length - 1; i++) {
      previewSegments.add([marchPlanPreview.path[i], marchPlanPreview.path[i + 1]].sort().join('-'));
    }
  }

  const handleClick = (tId: string) => {
    if (marchPlanMode) {
      const fromId = marchPlanMode.fromTerritoryId;
      const to = territories[tId];
      if (tId === fromId) { cancelMarchPlanMode(); return; }
      // ターゲット選択（敵領地のみ）
      if (to.ownerId !== playerNation.id) {
        if (marchPlanPreview?.toId === tId) {
          // 2回目クリックで確定
          createMarchPlan(fromId, tId);
        } else {
          previewMarchPlan(fromId, tId);
        }
      }
      return;
    }
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
      viewBox="0 0 980 700"
      style={{ background: '#1a1a2e', borderRadius: 8, display: 'block', width: '100%', maxWidth: 980, height: 'auto' }}
    >
      {/* 通常の隣接線 */}
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

      {/* 行軍計画パス（計画ライン）*/}
      {planSegments.map(({ aId, bId, isDone }, idx) => {
        const a = territories[aId];
        const b = territories[bId];
        if (!a || !b) return null;
        return (
          <line
            key={`plan-${idx}`}
            x1={a.position.x} y1={a.position.y}
            x2={b.position.x} y2={b.position.y}
            stroke={isDone ? '#6b7280' : '#a855f7'}
            strokeWidth={3}
            strokeDasharray="8 4"
            opacity={0.75}
            style={{ pointerEvents: 'none' }}
          />
        );
      })}

      {/* プレビューライン */}
      {marchPlanPreview && marchPlanPreview.path.map((tId, i) => {
        if (i === 0) return null;
        const a = territories[marchPlanPreview.path[i - 1]];
        const b = territories[tId];
        if (!a || !b) return null;
        return (
          <line
            key={`preview-${i}`}
            x1={a.position.x} y1={a.position.y}
            x2={b.position.x} y2={b.position.y}
            stroke="#f59e0b"
            strokeWidth={3}
            strokeDasharray="6 3"
            opacity={0.9}
            style={{ pointerEvents: 'none' }}
          />
        );
      })}

      {/* 領地円 */}
      {Object.values(territories).map((t) => {
        const nation = nations[t.ownerId];
        const isSelected = t.id === selectedTerritoryId;
        const isSource = invasionMode?.fromTerritoryId === t.id || transferMode?.fromTerritoryId === t.id
          || marchPlanMode?.fromTerritoryId === t.id;
        const isPlayerOwned = t.ownerId === playerNation.id;

        let isTarget = false;
        if (invasionMode) {
          const from = territories[invasionMode.fromTerritoryId];
          isTarget = from.adjacentTo.includes(t.id) && t.ownerId !== from.ownerId;
        } else if (transferMode) {
          const from = territories[transferMode.fromTerritoryId];
          isTarget = from.adjacentTo.includes(t.id) && t.ownerId === from.ownerId && t.id !== from.id;
        } else if (marchPlanMode) {
          // 行軍計画モード: 敵領地が全てターゲット候補
          isTarget = !isPlayerOwned && !nation.defeated;
        }

        const isPreviewTarget = marchPlanPreview?.toId === t.id;

        const anyMode = invasionMode ?? transferMode ?? marchPlanMode;
        let opacity = nation.defeated ? 0.25 : 1;
        if (!nation.defeated) {
          if (anyMode && !isSource && !isTarget) opacity = 0.4;
          else if (isPlayerOwned && t.hasActed && !anyMode) opacity = 0.55;
        }

        let stroke = '#4b5563';
        let strokeWidth = 2;
        if (isSource) { stroke = '#ffffff'; strokeWidth = 4; }
        else if (isPreviewTarget) { stroke = '#f59e0b'; strokeWidth = 5; }
        else if (isTarget) {
          stroke = marchPlanMode ? '#a855f7' : (transferMode ? '#22c55e' : '#f59e0b');
          strokeWidth = 4;
        }
        else if (isSelected) { stroke = '#93c5fd'; strokeWidth = 4; }

        const isCapital = nations[t.ownerId]?.capitalTerritoryId === t.id;

        // 行軍計画の出発地マーク（旗）
        const hasPlan = marchPlans.some(
          (p) => p.status === 'active' && p.path[p.currentIndex] === t.id,
        );

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
            {isPlayerOwned && t.hasActed && !invasionMode && !marchPlanMode && (
              <text x={t.position.x + RADIUS - 7} y={t.position.y - RADIUS + 12}
                textAnchor="middle" fill="#fbbf24" fontSize={16}
                style={{ pointerEvents: 'none', userSelect: 'none' }}>✓</text>
            )}
            {/* 行軍計画の進軍中マーク */}
            {hasPlan && (
              <text x={t.position.x - RADIUS + 7} y={t.position.y - RADIUS + 12}
                textAnchor="middle" fill="#a855f7" fontSize={15}
                style={{ pointerEvents: 'none', userSelect: 'none' }}>🚶</text>
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
            {/* 行軍計画モード: プレビューターゲット確定ヒント */}
            {isPreviewTarget && (
              <text x={t.position.x} y={t.position.y + 32}
                textAnchor="middle" fill="#f59e0b" fontSize={11}
                style={{ pointerEvents: 'none', userSelect: 'none' }}>もう1度で確定</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

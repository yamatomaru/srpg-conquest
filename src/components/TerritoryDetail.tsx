import { useGameStore } from '../game/store';
import { JOBS } from '../data/jobs';

const JOB_COLOR: Record<string, string> = {
  shielder: '#6b7280', warrior: '#ef4444', spearman: '#f59e0b',
  archer: '#22c55e', mage: '#a855f7',
};

export default function TerritoryDetail() {
  const {
    territories, nations, characters, actedCharIds, ui,
    selectTerritory, startInvasion, cancelInvasion, startTransfer, cancelTransfer,
  } = useGameStore();
  const { selectedTerritoryId, invasionMode, transferMode } = ui;

  if (!selectedTerritoryId) {
    return (
      <div style={{ padding: 16, color: '#6b7280', fontSize: 13 }}>
        ← 領地をクリックして選択
      </div>
    );
  }

  const territory = territories[selectedTerritoryId];
  const nation = nations[territory.ownerId];
  const playerNation = Object.values(nations).find((n) => n.isPlayer)!;
  const isPlayerOwned = territory.ownerId === playerNation.id;
  const isInvasionSource = invasionMode?.fromTerritoryId === selectedTerritoryId;
  const isTransferSource = transferMode?.fromTerritoryId === selectedTerritoryId;

  const hasAdjacentEnemy = territory.adjacentTo.some((adjId) => {
    const adj = territories[adjId];
    const adjNation = nations[adj?.ownerId];
    return adj && adj.ownerId !== playerNation.id && !adjNation?.defeated;
  });
  const hasAdjacentFriendly = territory.adjacentTo.some((adjId) => {
    const adj = territories[adjId];
    return adj && adj.ownerId === playerNation.id;
  });

  const availableUnits = territory.garrisonIds.filter(
    (id) => characters[id]?.hp > 0 && !actedCharIds.includes(id)
  );
  const canInvade = isPlayerOwned && !territory.hasActed && territory.garrisonIds.length > 0 && hasAdjacentEnemy;
  const canTransfer = isPlayerOwned && availableUnits.length > 0 && hasAdjacentFriendly;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontSize: 15 }}>{territory.name}</h3>
        <button
          onClick={() => selectTerritory(null)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#6b7280', lineHeight: 1, padding: 0 }}
        >×</button>
      </div>

      <div style={{ fontSize: 13, lineHeight: 2, color: '#d1d5db' }}>
        <div>
          <span style={{ color: nation.color, fontWeight: 'bold' }}>■</span>{' '}
          {nation.name}
          {nation.faction && <span style={{ color: '#9ca3af', fontSize: 11, marginLeft: 4 }}>（{nation.faction}）</span>}
        </div>
        <div>収入: ¥{territory.income} / 月</div>
        {territory.hasActed && <div style={{ color: '#ef4444', fontSize: 12 }}>行動済み</div>}
      </div>

      {/* アクションボタン（ユニット一覧の上に配置してファーストビューに収める） */}
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {isInvasionSource ? (
          <button
            onClick={() => cancelInvasion()}
            style={{ padding: '10px 12px', background: '#4b5563', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14, fontWeight: 'bold' }}
          >
            侵攻キャンセル
          </button>
        ) : isTransferSource ? (
          <button
            onClick={() => cancelTransfer()}
            style={{ padding: '10px 12px', background: '#4b5563', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14, fontWeight: 'bold' }}
          >
            移動キャンセル
          </button>
        ) : (
          <>
            {canInvade && (
              <button
                onClick={() => startInvasion(selectedTerritoryId)}
                style={{ padding: '10px 12px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14, fontWeight: 'bold' }}
              >
                侵攻する
              </button>
            )}
            {canTransfer && (
              <button
                onClick={() => startTransfer(selectedTerritoryId)}
                style={{ padding: '10px 12px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14, fontWeight: 'bold' }}
              >
                兵力移動
              </button>
            )}
          </>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>
          駐留兵 ({territory.garrisonIds.length}名)
        </div>
        {territory.garrisonIds.length === 0 ? (
          <div style={{ color: '#6b7280', fontSize: 13 }}>なし</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {territory.garrisonIds.map((cId) => {
              const ch = characters[cId];
              const isDead = ch.hp <= 0;
              const hpRatio = Math.max(0, ch.hp / ch.maxHp);
              const expRatio = Math.min(1, ch.exp / (ch.level * 100));
              const job = JOBS[ch.jobId];
              return (
                <div
                  key={cId}
                  style={{
                    background: '#111827', border: '1px solid #374151',
                    borderRadius: 6, padding: '7px 9px', opacity: isDead ? 0.55 : 1,
                  }}
                >
                  {/* 名前行 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 18, height: 18, borderRadius: 3, background: JOB_COLOR[ch.jobId], display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', fontWeight: 'bold', flexShrink: 0 }}>
                        {job.name[0]}
                      </span>
                      <span style={{ color: isDead ? '#9ca3af' : '#e5e7eb', fontWeight: 'bold', fontSize: 12 }}>{ch.name}</span>
                      <span style={{ color: '#fbbf24', fontSize: 11 }}>Lv.{ch.level}</span>
                    </div>
                    <span style={{ color: isDead ? '#ef4444' : '#d1d5db', fontSize: 11 }}>
                      {isDead ? '回復中' : `${ch.hp}/${ch.maxHp}`}
                    </span>
                  </div>

                  {/* HP バー */}
                  <div style={{ background: '#374151', borderRadius: 2, height: 4, overflow: 'hidden', marginBottom: 3 }}>
                    <div style={{ width: `${hpRatio * 100}%`, height: '100%', background: hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.25 ? '#f59e0b' : '#ef4444', borderRadius: 2 }} />
                  </div>

                  {/* EXP バー */}
                  <div style={{ background: '#1f2937', borderRadius: 2, height: 3, overflow: 'hidden', marginBottom: 6 }}>
                    <div style={{ width: `${expRatio * 100}%`, height: '100%', background: '#60a5fa' }} />
                  </div>

                  {/* ステータスグリッド */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, fontSize: 10 }}>
                    {[
                      ['ATK', ch.atk, '#f87171'],
                      ['DEF', ch.def, '#60a5fa'],
                      ['MATK', ch.matk, '#c084fc'],
                      ['MDEF', ch.mdef, '#7dd3fc'],
                      ['MOV', ch.mov, '#34d399'],
                      ['RNG', ch.range, '#fbbf24'],
                    ].map(([label, val, color]) => (
                      <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 4px', background: '#0d1117', borderRadius: 2 }}>
                        <span style={{ color: '#6b7280' }}>{label}</span>
                        <span style={{ color: color as string, fontWeight: 'bold' }}>{val}</span>
                      </div>
                    ))}
                  </div>

                  {/* スキル名 */}
                  <div style={{ marginTop: 4, fontSize: 10, color: '#a855f7' }}>✦ {job.skillName}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}

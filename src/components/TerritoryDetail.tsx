import { useGameStore } from '../game/store';

const JOB_NAMES: Record<string, string> = {
  warrior: '戦士',
  archer: '弓兵',
  mage: '魔導師',
};

export default function TerritoryDetail() {
  const {
    territories,
    nations,
    characters,
    ui,
    selectTerritory,
    startInvasion,
    cancelInvasion,
  } = useGameStore();
  const { selectedTerritoryId, invasionMode } = ui;

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
  const canInvade =
    isPlayerOwned && !territory.hasActed && territory.garrisonIds.length > 0;
  const isInvasionSource = invasionMode?.fromTerritoryId === selectedTerritoryId;

  return (
    <div style={{ padding: 16 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 8,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 15 }}>{territory.name}</h3>
        <button
          onClick={() => selectTerritory(null)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 18,
            color: '#6b7280',
            lineHeight: 1,
            padding: 0,
          }}
        >
          ×
        </button>
      </div>

      <div style={{ fontSize: 13, lineHeight: 2, color: '#d1d5db' }}>
        <div>
          <span style={{ color: nation.color, fontWeight: 'bold' }}>■</span>{' '}
          {nation.name}
        </div>
        <div>収入: ¥{territory.income} / 月</div>
        {territory.hasActed && (
          <div style={{ color: '#ef4444', fontSize: 12 }}>行動済み</div>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>
          駐留兵 ({territory.garrisonIds.length}名)
        </div>
        {territory.garrisonIds.length === 0 ? (
          <div style={{ color: '#6b7280', fontSize: 13 }}>なし</div>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: '#d1d5db', lineHeight: 1.8 }}>
            {territory.garrisonIds.map((cId) => {
              const ch = characters[cId];
              return (
                <li key={cId}>
                  {ch.name}（{JOB_NAMES[ch.jobId]}）
                  <span style={{ color: '#9ca3af', fontSize: 11 }}>
                    {' '}HP:{ch.hp} ATK:{ch.atk}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {isInvasionSource ? (
          <button
            onClick={() => cancelInvasion()}
            style={{
              padding: '7px 12px',
              background: '#4b5563',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            侵攻キャンセル
          </button>
        ) : canInvade ? (
          <button
            onClick={() => startInvasion(selectedTerritoryId)}
            style={{
              padding: '7px 12px',
              background: '#dc2626',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            侵攻する
          </button>
        ) : null}
      </div>
    </div>
  );
}

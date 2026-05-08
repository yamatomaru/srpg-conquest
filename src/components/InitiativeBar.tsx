import { useGameStore } from '../game/store';
import { JOB_ABBR } from '../data/jobs';

const SIDE_COLOR: Record<string, string> = {
  attacker: '#3b82f6',
  defender: '#ef4444',
};

export default function InitiativeBar() {
  const { battle, characters, nations } = useGameStore();
  if (!battle) return null;

  const currentIdx = battle.initiativeIndex;
  const aliveIds = new Set(battle.units.map((u) => u.characterId));

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '9px 18px',
        background: '#111827',
        borderBottom: '1px solid #1f2937',
        gap: 9,
        overflowX: 'auto',
        flexShrink: 0,
      }}
    >
      <span style={{ color: '#6b7280', fontSize: 16, flexShrink: 0, marginRight: 6 }}>行動順</span>

      {battle.initiativeOrder.map((cId, i) => {
        const unit = battle.units.find((u) => u.characterId === cId);
        const ch = characters[cId];
        if (!ch) return null;

        const isAlive = aliveIds.has(cId);
        const isCurrent = i === currentIdx;
        const isActed = unit?.hasActed ?? false;
        const sideColor = unit ? SIDE_COLOR[unit.side] : '#6b7280';
        const size = isCurrent ? 84 : 60;

        return (
          <div
            key={`init-${cId}-${i}`}
            title={`${i + 1}. ${ch.name}（MOV:${ch.mov}）`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              flexShrink: 0,
              opacity: !isAlive ? 0.2 : isActed ? 0.4 : 1,
              transition: 'all 0.2s',
            }}
          >
            <span
              style={{
                fontSize: 13,
                color: isCurrent ? '#facc15' : '#6b7280',
                lineHeight: 1,
                fontWeight: isCurrent ? 'bold' : 'normal',
              }}
            >
              {i + 1}
            </span>

            <div
              style={{
                width: size,
                height: size,
                borderRadius: '50%',
                border: `${isCurrent ? 3 : 2}px solid ${isCurrent ? '#facc15' : sideColor}`,
                boxShadow: isCurrent ? `0 0 12px #facc15` : 'none',
                overflow: 'hidden',
                background: sideColor,
                position: 'relative',
                flexShrink: 0,
              }}
            >
              {ch.spritePath ? (
                <img
                  src={ch.spritePath}
                  width={size}
                  height={size}
                  style={{ imageRendering: 'pixelated', display: 'block' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: isCurrent ? 27 : 20,
                    fontWeight: 'bold',
                  }}
                >
                  {JOB_ABBR[ch.jobId] ?? '?'}
                </div>
              )}
            </div>

            <span
              style={{
                fontSize: 12,
                color: unit
                  ? (unit.side === 'attacker'
                      ? nations[battle.attackerNationId]?.color
                      : nations[battle.defenderNationId]?.color)
                  : '#6b7280',
                lineHeight: 1,
                maxWidth: size,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                textAlign: 'center',
              }}
            >
              {ch.name.slice(0, 4)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

import { useGameStore } from '../game/store';
import type { MarchPlan, Territory } from '../game/types';

function PlanRow({ plan, territories, onCancel }: {
  plan: MarchPlan;
  territories: Record<string, Territory>;
  onCancel: () => void;
}) {
  const remaining = plan.path.length - 1 - plan.currentIndex;
  const currentTerr = territories[plan.path[plan.currentIndex]];
  const targetTerr = territories[plan.path[plan.path.length - 1]];

  const statusColor =
    plan.status === 'active' ? '#a855f7'
    : plan.status === 'done' ? '#22c55e'
    : '#6b7280';
  const statusLabel =
    plan.status === 'active' ? `残${remaining}ヶ月`
    : plan.status === 'done' ? '✅完了'
    : '❌中止';

  return (
    <div style={{
      background: '#1f2937',
      border: `1px solid ${plan.status === 'active' ? '#7c3aed' : '#374151'}`,
      borderRadius: 6,
      padding: '8px 10px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#e5e7eb', fontWeight: 'bold', fontSize: 13 }}>{plan.label}</span>
        <span style={{ color: statusColor, fontSize: 12, fontWeight: 'bold' }}>{statusLabel}</span>
      </div>
      {plan.status === 'active' && (
        <div style={{ fontSize: 11, color: '#9ca3af' }}>
          現在: {currentTerr?.name ?? '?'} → 目標: {targetTerr?.name ?? '?'}
        </div>
      )}
      {plan.cancelReason && plan.status !== 'active' && (
        <div style={{ fontSize: 11, color: '#9ca3af' }}>{plan.cancelReason}</div>
      )}
      {/* パス表示 */}
      {plan.status === 'active' && plan.path.length > 2 && (
        <div style={{ fontSize: 10, color: '#6b7280' }}>
          経由: {plan.path.slice(1, -1).map((id) => territories[id]?.name ?? id).join(' → ')}
        </div>
      )}
      {plan.status === 'active' && (
        <button
          onClick={onCancel}
          style={{
            marginTop: 2, padding: '4px 8px', background: '#374151', color: '#d1d5db',
            border: 'none', borderRadius: 3, cursor: 'pointer', fontSize: 11, alignSelf: 'flex-end',
          }}
        >
          計画中止
        </button>
      )}
    </div>
  );
}

export default function MarchPlanPanel() {
  const { territories, marchPlans, cancelMarchPlan } = useGameStore();

  const visible = marchPlans.filter((p) => p.status === 'active' || p.status === 'done');
  const recent = marchPlans.filter((p) => p.status === 'cancelled').slice(-2);
  const allVisible = [...visible, ...recent];

  if (allVisible.length === 0) return null;

  return (
    <div style={{
      padding: '10px 12px',
      borderTop: '1px solid #374151',
    }}>
      <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 6, fontWeight: 'bold' }}>
        📋 行軍計画
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {allVisible.map((plan) => (
          <PlanRow
            key={plan.id}
            plan={plan}
            territories={territories}
            onCancel={() => cancelMarchPlan(plan.id)}
          />
        ))}
      </div>
    </div>
  );
}

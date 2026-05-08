import type { Objective } from '../game/types';

export const INITIAL_OBJECTIVES: Objective[] = [
  {
    id: 'first_capture',
    title: '初陣の勝利',
    description: '敵の領地を1つ占領する',
    completed: false,
  },
  {
    id: 'expand_8',
    title: '版図拡大',
    description: '8領地以上を支配する',
    completed: false,
  },
  {
    id: 'capture_north',
    title: '北の要衝を制す',
    description: 'ノルダー本城（nord3）を占領する',
    completed: false,
  },
  {
    id: 'defeat_nation',
    title: '一国制圧',
    description: '敵国を1国滅ぼす',
    completed: false,
  },
  {
    id: 'capture_south',
    title: '南の聖樹を征す',
    description: 'シルヴァン聖樹（silv2）を占領する',
    completed: false,
  },
  {
    id: 'gold_500',
    title: '富国強兵',
    description: '国庫に¥500以上を蓄える',
    completed: false,
  },
  {
    id: 'defeat_3_nations',
    title: '三国制覇',
    description: '敵国を3国滅ぼす',
    completed: false,
  },
  {
    id: 'all_capitals',
    title: '天下統一',
    description: '全敵国の本拠地を占領する',
    completed: false,
  },
];

export function checkObjectives(
  objectives: Objective[],
  state: { nations: Record<string, unknown>; territories: Record<string, unknown>; characters: Record<string, unknown> },
  playerNationId: string,
): Objective[] {
  const nations = state.nations as Record<string, { isPlayer: boolean; defeated: boolean; capitalTerritoryId: string; gold: number }>;
  const territories = state.territories as Record<string, { ownerId: string }>;
  const playerTerritoryCount = Object.values(territories).filter((t) => t.ownerId === playerNationId).length;
  const defeatedCount = Object.values(nations).filter((n) => !n.isPlayer && n.defeated).length;
  const playerGold = nations[playerNationId]?.gold ?? 0;

  const initialPlayerTerritories = 5;
  const hasCapturedAny = playerTerritoryCount > initialPlayerTerritories;
  const allEnemyCapitals = Object.values(nations)
    .filter((n) => !n.isPlayer && !n.defeated)
    .every((n) => territories[n.capitalTerritoryId]?.ownerId === playerNationId);

  return objectives.map((obj) => {
    if (obj.completed) return obj;
    let completed = false;
    switch (obj.id) {
      case 'first_capture': completed = hasCapturedAny; break;
      case 'expand_8':      completed = playerTerritoryCount >= 8; break;
      case 'capture_north': completed = territories['nord3']?.ownerId === playerNationId; break;
      case 'defeat_nation': completed = defeatedCount >= 1; break;
      case 'capture_south': completed = territories['silv2']?.ownerId === playerNationId; break;
      case 'gold_500':      completed = playerGold >= 500; break;
      case 'defeat_3_nations': completed = defeatedCount >= 3; break;
      case 'all_capitals':  completed = allEnemyCapitals && defeatedCount > 0; break;
    }
    return completed ? { ...obj, completed: true } : obj;
  });
}

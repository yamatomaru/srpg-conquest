import type { BuildingDef, BuildingType } from '../game/types';

export const BUILDINGS: Record<BuildingType, BuildingDef> = {
  market: {
    id: 'market',
    name: '市場',
    icon: '🏪',
    cost: 150,
    description: '毎月+2の追加収入を得る。交易路が発展し領地の富が増す。',
    incomeBonus: 2,
    defenderMult: 1.0,
  },
  barracks: {
    id: 'barracks',
    name: '兵舎',
    icon: '🏯',
    cost: 120,
    description: 'ガリソン可能人数が+2増加。駐留部隊の士気と練度が向上する。',
    incomeBonus: 0,
    defenderMult: 1.15,
  },
  fortress: {
    id: 'fortress',
    name: '砦',
    icon: '🛡',
    cost: 200,
    description: '自動戦闘で防御力+30%。堅固な防衛拠点として難攻不落の守りを誇る。',
    incomeBonus: 0,
    defenderMult: 1.3,
  },
};

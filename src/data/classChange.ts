import type { JobId } from '../game/types';

export interface ClassChangeDef {
  from: JobId;
  to: JobId;
  toName: string;
  cost: number;
  minLevel: number;
  bonusHp: number;
  bonusAtk: number;
  bonusDef: number;
  bonusMatk: number;
  bonusMdef: number;
  bonusMov: number;
  bonusRange: number;
  description: string;
  toSkillName: string;
}

/** Tier1 ジョブ → Tier2 昇格定義 */
export const CLASS_CHANGES: ClassChangeDef[] = [
  {
    from: 'shielder', to: 'paladin', toName: '聖騎士',
    cost: 200, minLevel: 5,
    bonusHp: 12, bonusAtk: 3, bonusDef: 5, bonusMatk: 2, bonusMdef: 5, bonusMov: 0, bonusRange: 0,
    description: '聖なる力で強固な守りを誇る上位職。自己回復も可能になる。',
    toSkillName: '聖護の構え',
  },
  {
    from: 'warrior', to: 'hero', toName: '勇者',
    cost: 200, minLevel: 5,
    bonusHp: 8, bonusAtk: 5, bonusDef: 2, bonusMatk: 2, bonusMdef: 2, bonusMov: 1, bonusRange: 0,
    description: '比類なき闘気で三連撃を繰り出す戦場最強の上位職。',
    toSkillName: '三連撃',
  },
  {
    from: 'spearman', to: 'lancer', toName: '槍騎兵',
    cost: 200, minLevel: 5,
    bonusHp: 7, bonusAtk: 4, bonusDef: 2, bonusMatk: 2, bonusMdef: 2, bonusMov: 2, bonusRange: 0,
    description: '馬上からの長槍突撃で広範囲を制圧する騎馬上位職。',
    toSkillName: '騎馬突撃',
  },
  {
    from: 'archer', to: 'ranger', toName: '神射手',
    cost: 200, minLevel: 5,
    bonusHp: 6, bonusAtk: 4, bonusDef: 2, bonusMatk: 2, bonusMdef: 2, bonusMov: 1, bonusRange: 1,
    description: '神業の射精度で超長距離から三連射を放つ上位職。',
    toSkillName: '三連射',
  },
  {
    from: 'mage', to: 'sage', toName: '賢者',
    cost: 200, minLevel: 5,
    bonusHp: 6, bonusAtk: 2, bonusDef: 2, bonusMatk: 5, bonusMdef: 3, bonusMov: 1, bonusRange: 1,
    description: '古代の叡智を習得し、1.5倍威力の大魔法で戦場を制圧する上位職。',
    toSkillName: '大魔法',
  },
];

/** Tier1 jobId から昇格定義を引く */
export function getClassChange(fromJobId: JobId): ClassChangeDef | undefined {
  return CLASS_CHANGES.find((c) => c.from === fromJobId);
}

/** Tier2 jobId かどうか判定 */
export const TIER2_JOBS: Set<JobId> = new Set(['paladin', 'hero', 'lancer', 'ranger', 'sage']);
export const isTier2 = (jobId: JobId): boolean => TIER2_JOBS.has(jobId);

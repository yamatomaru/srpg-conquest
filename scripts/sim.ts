import { runBatchSimulation } from '../src/game/simulation';

const targetNationId = process.argv[2] ?? 'albania';
const runs = Number(process.argv[3] ?? 100);

console.log(`シミュレーション開始: 対象=${targetNationId}, 試行=${runs}回\n`);

runBatchSimulation(targetNationId, runs, (done, total) => {
  process.stdout.write(`\r進行中: ${done}/${total}`);
}).then((stats) => {
  console.log(`\n\n=== 結果 ===`);
  console.log(`対象国: ${stats.targetNationName} 勝率: ${(stats.targetWinRate * 100).toFixed(1)}%`);
  console.log(`平均ゲーム長: ${stats.avgMonths.toFixed(1)}ヶ月 (最短${stats.minMonths}/最長${stats.maxMonths})`);
  console.log(`\n国家別勝率:`);
  [...stats.nations]
    .sort((a, b) => b.winRate - a.winRate)
    .forEach((n) => {
      const bar = '█'.repeat(Math.round(n.winRate * 50));
      console.log(`  ${n.name.padEnd(10)} ${(n.winRate * 100).toFixed(1)}%  ${bar}  avg${n.avgFinalTerritories.toFixed(1)}領`);
    });
  console.log(`\n改善提案:`);
  stats.suggestions.forEach((s) => console.log(`  ${s}`));
});

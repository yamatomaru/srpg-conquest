import { useGameStore } from './game/store';

export default function App() {
  const { month, currentNationId, nations, territories, characters } = useGameStore();
  const playerNation = Object.values(nations).find((n) => n.isPlayer);

  return (
    <div
      style={{
        padding: 24,
        fontFamily: 'system-ui, sans-serif',
        maxWidth: 900,
        margin: '0 auto',
        lineHeight: 1.6,
      }}
    >
      <h1>SRPG国取り — Sprint 1: データ層検証</h1>

      <section>
        <h2>ゲーム状態</h2>
        <p>
          月: {month} / 行動中の国: <strong>{nations[currentNationId].name}</strong>
        </p>
        <p>
          プレイヤー国: <strong>{playerNation?.name}</strong>
        </p>
      </section>

      <section>
        <h2>国家一覧（{Object.keys(nations).length}カ国）</h2>
        <ul>
          {Object.values(nations).map((n) => (
            <li key={n.id}>
              <span style={{ color: n.color, fontSize: 18 }}>■</span> {n.name}
              {' '}— ¥{n.gold} / 兵{n.characterIds.length}名
              {n.isPlayer && <strong> ←プレイヤー</strong>}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>領地一覧（{Object.keys(territories).length}領地）</h2>
        <ul>
          {Object.values(territories).map((t) => (
            <li key={t.id}>
              {t.name}（所属: {nations[t.ownerId].name}）— 収入 ¥{t.income} / 駐留 {t.garrisonIds.length}名
              <br />
              <small>
                隣接: {t.adjacentTo.map((id) => territories[id].name).join('、')}
              </small>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>キャラクター総数: {Object.keys(characters).length}名</h2>
        <details>
          <summary>全キャラ展開</summary>
          <ul>
            {Object.values(characters).map((c) => (
              <li key={c.id}>
                {c.name} (Lv.{c.level} {c.jobId}) — HP {c.hp}/{c.maxHp}, ATK {c.atk}, DEF {c.def}, MOV {c.mov}, 射程 {c.range}
              </li>
            ))}
          </ul>
        </details>
      </section>
    </div>
  );
}

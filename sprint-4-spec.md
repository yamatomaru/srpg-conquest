# Sprint 4 作業指示書 — 戦闘ロジック実装

## 1. 概要

Sprint 4 のゴールは **「戦術マップで実際に攻撃が成立し、HPが減り、ユニットが撃破される」** ことです。
Sprint 3 で作った移動の枠組みに「攻撃」アクションを追加し、ダミー判定を本物の戦闘決着に置き換えます。

> ⚠️ Sprint 3 完了時点でジョブバランスが現実的かを確認してから本指示書をレビューしてください。
> 特にダメージ計算式は実プレイ感覚で調整が必要です。

---

## 2. 完了条件

### 攻撃操作

- [ ] 移動完了後、攻撃可能な敵が射程内にいるとハイライト表示される
- [ ] 敵をクリックすると攻撃が実行される
- [ ] ダメージが視覚的に表示される（数値ポップアップなど）
- [ ] HP が 0 以下になったユニットは盤面から消える
- [ ] 攻撃を実行したユニットは行動完了になる（半透明＋枠変化）
- [ ] 「攻撃をしない」選択肢もある（移動だけで終わる）

### 戦闘解決

- [ ] 防衛側ユニットが全滅したら攻撃側勝利
- [ ] 攻撃側ユニットが全滅したら防衛側勝利
- [ ] 30ターン経過で防衛側勝利（仮）
- [ ] 戦闘終了時に戦略マップに自動遷移
- [ ] 撃破されたユニットは Nation の characterIds から削除される

### バランス

- [ ] 戦士 vs 弓兵 / 戦士 vs 魔導師 / 弓兵 vs 魔導師 のいずれも、戦術次第で勝てる
- [ ] 1発でユニットが死ぬことは無い（最低3発は耐える）
- [ ] 集中攻撃が有効である（2人で殴れば撃破できる程度の硬さ）

---

## 3. スコープ

### 含む

- 攻撃アクションの実装
- ダメージ計算
- 撃破処理（盤面・Nation・Territory からの削除）
- 戦闘終了判定
- 攻撃ハイライト表示
- ダメージ数値表示
- 戦闘ログ（どのユニットが誰を攻撃したか）

### 含まない

- ❌ 戦術 AI（防衛側は依然パス）— Sprint 5
- ❌ 反撃システム（攻撃を受けても反撃しない）
- ❌ 必殺技・スキル
- ❌ クリティカル・回避
- ❌ 属性相性
- ❌ アニメーション（数値表示のみ、移動アニメは無し）

---

## 4. 事前決定事項

### ダメージ計算式（暫定）

```ts
function calculateDamage(attacker: Character, defender: Character): number {
  const raw = attacker.atk - defender.def;
  return Math.max(1, raw);
}
```

**最小1ダメージは保証**（無敵防止）。
クリティカル・回避・属性は MVP 対象外。

### 攻撃可能判定

```ts
function canAttack(attacker: BattleUnit, target: BattleUnit, attackerChar: Character): boolean {
  if (attacker.side === target.side) return false; // 味方は撃てない
  if (attacker.hasActed) return false;             // 行動済みは撃てない

  const distance = Math.abs(attacker.position.x - target.position.x)
                 + Math.abs(attacker.position.y - target.position.y);
  return distance >= 1 && distance <= attackerChar.range;
}
```

**マンハッタン距離**で判定。
近接（戦士）は射程1、魔導師は2、弓兵は3。
**射程0（自分自身）は攻撃不可**。

### 行動順制約

```
1. 移動 → 攻撃 の順（移動せずに攻撃もOK）
2. 攻撃 → 移動 は不可（攻撃すると行動終了）
3. 移動だけして待機もOK（その場合は hasActed = true で行動終了）

実装上の考え方:
  hasMoved: 移動を実行した
  hasActed: 攻撃または「攻撃しない」を選択した（＝行動終了）
```

### 撃破処理

ユニットが撃破された時:

1. `BattleState.units` から除外
2. 該当キャラクターを `Nation.characterIds` から除外
3. **戦闘中に死んだキャラはゲーム全体から削除**（復活なし）
4. 戦略マップ側の Territory.garrisonIds との整合性は戦闘終了時にまとめて処理

### バランス目標値

| 対戦 | 期待される結果 |
|---|---|
| 戦士 vs 戦士 | 5〜7発で決着、互角 |
| 戦士 vs 弓兵 | 弓兵が距離取れれば有利、近接戦は戦士有利 |
| 戦士 vs 魔導師 | 魔導師が先手取れれば3〜4発、戦士の懐に入られたら戦士勝利 |
| 弓兵 vs 魔導師 | 機動力で弓兵がやや有利 |

実プレイで上記とずれていたら基本値を再調整。

---

## 5. 状態の拡張

### `BattleUnit`

```ts
export interface BattleUnit {
  // 既存
  characterId: string;
  side: Side;
  position: { x: number; y: number };
  currentHp: number;
  hasMoved: boolean;
  hasActed: boolean;

  // 追加候補
  // （特になし、既存フィールドで足りるはず）
}
```

### `BattleState` への追加

```ts
export interface BattleState {
  // 既存に加えて
  attackTargets: string[];          // 選択中ユニットが攻撃可能な敵ID
  recentLog: BattleLogEntry[];      // 直近の戦闘ログ（最新5件程度）
}

export interface BattleLogEntry {
  attackerName: string;
  defenderName: string;
  damage: number;
  defeated: boolean;
}
```

### 新アクション

```ts
interface GameActions {
  // 既存に加えて
  attackUnit: (attackerId: string, targetId: string) => void;
  endUnitTurn: (unitId: string) => void; // 移動だけで行動終了
}
```

---

## 6. 新規ファイル

```
src/
  game/
    tactical/
      attack.ts          ← 攻撃可能判定とダメージ計算
      battleEnd.ts       ← 戦闘終了判定と後処理
  components/
    BattleLog.tsx        ← 戦闘ログ表示
    DamagePopup.tsx      ← ダメージ数値の一時表示
```

---

## 7. 実装手順

1. **ダメージ計算と攻撃可能判定の純粋関数**
   - `attack.ts` に `calculateDamage`, `canAttack`, `getAttackTargets` を実装
   - ユニットテスト的に console で動作確認

2. **攻撃ターゲットのハイライト**
   - 移動完了後 or 移動なしで選択時に攻撃可能な敵をハイライト
   - 攻撃可能な敵がいなければ「待機」ボタンのみ

3. **攻撃の実行**
   - 敵クリックで `attackUnit` 発火
   - HP 減算、撃破判定、`hasActed = true`

4. **撃破処理と Nation 同期**
   - `BattleState.units` から除外
   - 戦闘終了時に Nation/Territory との整合性を取る

5. **戦闘終了判定**
   - 各ターン終了時に「片陣営が0人」か「30ターン経過」をチェック
   - 該当時は `endBattle` 呼び出し

6. **ダメージ表示と戦闘ログ**
   - 数値ポップアップ（CSS animationで0.8秒程度）
   - ログは画面下部に直近5件

7. **バランス調整**
   - 一通り動いたら実プレイで調整
   - `JOBS` の baseAtk/baseDef/baseHp を触る

---

## 8. テストシナリオ

### シナリオ A — 単純な攻撃

1. 戦闘画面で攻撃側ユニットを選択
2. 移動して敵に隣接
3. ✅ 隣接した敵がハイライト
4. 敵をクリック
5. ✅ ダメージ数値が表示される
6. ✅ 敵の HP が減る
7. ✅ ユニットが行動完了状態（半透明）

### シナリオ B — 撃破

1. 同じ敵を複数回殴ってHPを0に
2. ✅ 敵ユニットが盤面から消える
3. 戦闘終了後、戦略マップに戻る
4. ✅ 撃破されたキャラが Nation/Territory から消えている

### シナリオ C — 全滅勝利

1. 防衛側ユニット全員を撃破
2. ✅ 即座に戦闘終了
3. ✅ 戦略マップに戻り領地占領
4. ✅ 攻撃側生存ユニットの半数が新領地に移動

### シナリオ D — 全滅敗北

1. テスト用に攻撃側を弱い構成にして、降参ではなく実戦闘で全滅
2. ✅ 戦闘終了
3. ✅ 戦略マップに戻り、防衛側勝利として処理される

### シナリオ E — 30ターン経過

1. 互いに攻撃しないまま30ターン経過させる
2. ✅ 防衛側勝利として戦闘終了

---

## 9. バランス調整プロセス

実装が動いたら以下のプレイテストを実施:

1. 全部の組み合わせ（戦士vs戦士、戦士vs弓兵、...）を最低5回ずつテスト
2. 1発で死ぬパターンが無いことを確認
3. 戦士が弓兵に近づけずに死ぬパターンが多発したら、戦士の HP か MOV を上げる
4. 魔導師が無双したら、HP を下げるか ATK を下げる
5. 調整は `src/data/jobs.ts` の数値を触るだけで完結すること（**ロジックは触らない**）

---

## 10. 補足

- **撃破されたキャラの復活はMVP対象外**。撃破イコール削除。
- **反撃システムは入れない**。ターンベースを崩すと一気に複雑化する。
- **戦闘ログは英語/日本語混在しないこと**（日本語で統一）。
- **ダメージ数値ポップアップは派手にしすぎない**。Sprint 6 で演出強化する余地を残す。

不明点・バランス相談は Web 版 Claude へ。

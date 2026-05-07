# Sprint 2 作業指示書 — 戦略マップ実装

## 1. 概要

Sprint 2 のゴールは **「戦略マップ画面でプレイヤーが侵攻アクションを実行し、ターンが進む完全なゲームループ」** を作ることです。
戦闘部分はダミー実装（兵数比較で勝敗決定）で構いませんが、領地の所有権遷移・ターン進行・勝敗判定までを通しで動かします。

戦術マップ（マス目戦闘）は **Sprint 3 以降の課題** で、本スプリントには含みません。

---

## 2. 完了条件（受け入れテスト）

以下が全て手動検証で確認できれば Sprint 2 完了です。

### 表示

- [ ] ブラウザに5つの領地が円として描画される
- [ ] 隣接関係が線で表示される（円より背面）
- [ ] 各領地は所属国の色で塗られる
- [ ] 各領地に名前と駐留兵数が表示される
- [ ] 上部に「月: N」と「行動中: 国名」が表示される

### 操作

- [ ] 領地をクリックすると詳細パネルが右側に表示される
- [ ] 詳細パネルに駐留兵の名前・ジョブ・HP・ATKが一覧される
- [ ] 自国かつ兵がいる領地で「侵攻する」ボタンが押せる
- [ ] 侵攻モードで隣接敵領地が視覚的に強調される
- [ ] 隣接敵領地をクリックするとダミー戦闘が実行される
- [ ] 攻撃側の兵数が多ければ占領、同数以下なら攻撃失敗
- [ ] 「ターン終了」ボタンを押すと AI ターンを経て月が進む
- [ ] 月経過時に各国に収入が加算される

### 勝敗

- [ ] プレイヤーが全領地を占領したら勝利モーダルが出る
- [ ] プレイヤーの全領地が失われたら敗北モーダルが出る
- [ ] 勝敗モーダルに「最初から」ボタンがあり、押すとリセットされる

---

## 3. スコープ

### 含む

- 戦略マップの SVG 描画
- 領地の選択と詳細パネル
- ダミー戦闘（兵数比較ベース）
- ターン制（プレイヤー → AI国家 → 月経過）
- AI国家の挙動（**Sprint 2 ではパスするだけでOK**）
- 月収入の加算
- 勝敗判定とモーダル表示
- リセット機能

### 含まない（Sprint 2 では実装しない）

- ❌ 戦術マップ（マス目戦闘）
- ❌ 実際の戦闘ロジック（HP・ATK・DEF を使った計算）— Sprint 4
- ❌ 知的な AI（弱い隣国を狙う、防衛判断など）— Sprint 5
- ❌ 内政施策（市場・農業など）
- ❌ 外交（同盟・寝返り）
- ❌ 徴兵・ユニット雇用
- ❌ セーブ/ロード — Sprint 6 以降
- ❌ スプライト画像表示 — 素材待ち
- ❌ アニメーション・効果音
- ❌ レスポンシブ対応（PCの大画面前提でOK）

---

## 4. 事前決定事項

実装中に判断に迷わないよう、以下は確定済みとして扱ってください。

### ダミー戦闘ルール

```
攻撃側兵数 > 防衛側兵数
  → 攻撃側勝利
  → 攻撃側駐留の半数（切り上げ）が新領地へ移動
  → 残り半数は元領地に残る
  → 防衛側全滅（characters は state.characters から論理削除＝Nationから外す）
  → 領地の ownerId を攻撃側に変更

攻撃側兵数 ≤ 防衛側兵数
  → 防衛側勝利
  → 攻撃側全滅
  → 防衛側そのまま
  → 領地の所有権変化なし
```

**HP・ATK・DEF 等の能力値は Sprint 2 では参照しません**（兵数のみで勝敗が決まる）。
Sprint 4 で本物の戦闘ロジックに差し替えるため、戦闘処理は `src/game/battle.ts` の独立関数として切り出します。

### 行動制限

- 1ヶ月の間、各領地は1回まで侵攻可能
- `Territory.hasActed: boolean` フラグで管理
- 兵が0の領地からは侵攻できない（ボタン非活性）
- 攻撃可能なのは隣接領地のみ（`adjacentTo` を確認）

### ターン進行

```
プレイヤーターン (currentNationId = playerNation.id)
  → プレイヤーが「ターン終了」ボタンを押す
  → 各 AI 国家を順次処理（順番は nations の defined 順）
    - Sprint 2 では即パス（何もしない）
  → 全 AI が処理されたら月経過
    - 全領地の hasActed をリセット
    - 各 Nation に収入を加算（収入 = 所有領地の income 合計）
    - month を +1
    - 勝敗判定
  → currentNationId をプレイヤー国に戻す
```

### 勝敗条件

- **勝利**: プレイヤー以外の全 Nation の `defeated === true`
- **敗北**: プレイヤー Nation の `defeated === true`
- 領地を全て失った時点で `Nation.defeated = true` にする

### UIレイアウト

```
┌──────────────────────────────────────────────────────┐
│  月: 1   行動中: アルバニア王国        [ターン終了]  │   ← TurnControl (上部)
├──────────────────────────────────┬───────────────────┤
│                                  │                   │
│                                  │  領地名           │
│        SVG 戦略マップ            │  所属: ○○        │
│        (800 x 500 程度)          │  収入: ¥80        │
│                                  │  駐留兵:          │
│                                  │   - リオン王 (戦士)│
│                                  │   - クレア (魔導師)│
│                                  │                   │
│                                  │  [侵攻する]       │  ← TerritoryDetail (右)
│                                  │  [選択解除]       │
│                                  │                   │
└──────────────────────────────────┴───────────────────┘
```

---

## 5. 状態の拡張

### `src/game/types.ts` への追加

```ts
// Territory に hasActed フィールドを追加
export interface Territory {
  // ...既存フィールド...
  hasActed: boolean; // 月内に侵攻アクションを実行済みか
}

// UI状態の型を新設
export interface UISelection {
  selectedTerritoryId: string | null;
  invasionMode: { fromTerritoryId: string } | null;
  gameOverShown: boolean; // モーダル表示制御
}

// GameState に ui を追加
export interface GameState {
  // ...既存フィールド...
  ui: UISelection;
}
```

### `src/data/territories.ts` の更新

各領地の初期定義に `hasActed: false` を追加。

### `src/game/store.ts` のアクション

以下のアクションを実装してください。

```ts
interface GameActions {
  reset: () => void;

  // 選択操作
  selectTerritory: (id: string | null) => void;

  // 侵攻フロー
  startInvasion: (fromId: string) => void;
  cancelInvasion: () => void;
  executeInvasion: (fromId: string, toId: string) => void;

  // ターン進行
  endPlayerTurn: () => void;
  // 内部利用: processAITurn, advanceMonth は store 内のヘルパーでもOK
}
```

`endPlayerTurn` の中で AI ターンと月経過を一気に処理する設計でも、複数アクションに分ける設計でもどちらでも構いません。**ただし `executeInvasion` の中で戦闘ロジックを直接書かないこと** —— `src/game/battle.ts` から呼び出す形にしてください。

---

## 6. UI設計

### 新規ファイル

```
src/
  components/
    StrategicMap.tsx       SVGマップ本体
    TerritoryDetail.tsx    右側詳細パネル
    TurnControl.tsx        上部ターンコントロールバー
    GameOverModal.tsx      勝敗モーダル
  game/
    battle.ts              ダミー戦闘ロジック
```

### `StrategicMap.tsx` の責務

- 5つの領地を SVG `<circle>` で描画（位置は `Territory.position`）
- 隣接線を `<line>` で描画（円より先にレンダリング＝背面）
- 領地の塗り色は所属国の `color`
- ホバー時に視覚フィードバック（stroke を太くするなど）
- 選択中の領地は太い枠で強調
- **侵攻モード時** は隣接敵領地を点滅 or 別色枠で強調
- クリックハンドラで `selectTerritory` または `executeInvasion` を呼ぶ

### `TerritoryDetail.tsx` の責務

- `selectedTerritoryId` を見て表示内容を決定
- 領地名・所属国・収入・駐留兵リスト・行動済みフラグを表示
- 自国かつ未行動かつ兵ありの場合のみ「侵攻する」ボタンを活性化
- 「選択解除」ボタンで `selectTerritory(null)` を呼ぶ

### `TurnControl.tsx` の責務

- 現在の月を表示
- 行動中の国名を表示（Sprint 2 ではほぼプレイヤー固定）
- 「ターン終了」ボタン（プレイヤーターン時のみ活性）
- 簡易ログ（最近の行動を1〜2件表示）はオプション

### `GameOverModal.tsx` の責務

- 勝敗が確定したら表示
- 「勝利！」「敗北...」のメッセージ
- 「最初から」ボタンで `reset()` を呼ぶ

### スタイリング方針

Sprint 2 はインラインスタイル or 簡易な CSS で十分です。
凝った UI は Sprint 6 以降の整備で。

---

## 7. 実装手順（推奨順序）

不安定な順序で進めると詰まりやすいので、以下の順での実装を推奨します。

1. **型と状態の拡張** （`types.ts`, `store.ts`, `territories.ts`）
   - `hasActed`, `UISelection` を追加
   - アクションの空実装を作る
   - 既存の検証画面が壊れないことを確認

2. **静的な SVG マップ表示** （`StrategicMap.tsx`）
   - 5つの円と隣接線をハードコードで描画
   - クリックハンドラは console.log だけでOK
   - `App.tsx` を改修してマップを表示

3. **領地選択と詳細パネル** （`TerritoryDetail.tsx`）
   - `selectTerritory` を実装
   - クリックで詳細表示

4. **侵攻フローの実装** （`battle.ts`, `executeInvasion`）
   - `startInvasion` で隣接領地ハイライト
   - `executeInvasion` でダミー戦闘 → 所有権遷移
   - 元領地と新領地の `garrisonIds` を正しく更新

5. **ターン制と月経過** （`TurnControl.tsx`, `endPlayerTurn`）
   - AI ターンはパス、月経過時に収入加算
   - `hasActed` リセット

6. **勝敗判定とモーダル** （`GameOverModal.tsx`）
   - 月経過の最後に勝敗判定
   - モーダル表示
   - リセット動作確認

各ステップ完了時に `npm run dev` で動作確認してください。

---

## 8. データ整合性ルール

侵攻が成立した時に以下を**全て**実行してください。漏れるとデータが壊れます。

### 攻撃側勝利時

```
1. 移動兵リスト = from.garrisonIds の前半（切り上げ）
   残留兵リスト = from.garrisonIds の後半

2. 防衛側兵リスト = to.garrisonIds（戦闘で全滅）
   - state.nations[to.ownerId].characterIds から防衛側兵IDを除外
   - 任意: state.characters からも削除（残しておいても害はない）

3. to.ownerId = state.nations[from.ownerId].id  (攻撃側に変更)
   to.garrisonIds = 移動兵リスト
   to.hasActed = false  ← 新領地は未行動扱い

4. from.garrisonIds = 残留兵リスト
   from.hasActed = true

5. 攻撃側 Nation の characterIds に変更なし（移動兵はもともと所属）
   防衛側 Nation の characterIds から防衛兵を除外

6. 防衛側 Nation の所有領地が0になったら defeated = true
```

### 防衛側勝利時

```
1. 攻撃側兵リスト = from.garrisonIds（全滅）
   - state.nations[from.ownerId].characterIds から除外

2. from.garrisonIds = []
   from.hasActed = true

3. to は変更なし（hasActed も変えない）

4. 攻撃側 Nation の所有領地・兵がともに0になったら defeated = true
```

### 月経過時

```
1. 全 Territory の hasActed = false にリセット
2. 各 Nation について income = sum(t.income for t in 所有領地) を gold に加算
3. month += 1
4. 勝敗判定
   - プレイヤー以外全員 defeated → winnerId = playerNation.id
   - プレイヤーが defeated → winnerId = どれか別のNation
5. currentNationId = playerNation.id
```

---

## 9. テストシナリオ（手動QA）

実装完了後、以下を手動で確認してください。

### シナリオ A — 通常侵攻（成功パターン）

1. ゲーム開始（プレイヤー: アルバニア中央 兵3名）
2. 中央領地をクリック → 詳細パネル表示
3. 「侵攻する」をクリック → 隣接領地ハイライト
4. 西（ヴィース 兵2名）をクリック
5. ✅ ダミー戦闘発生：3 > 2 で攻撃側勝利
6. ✅ 西の所有者がアルバニアに変わる
7. ✅ 西の兵数が 2名（中央から半数移動）
8. ✅ 中央の兵数が 1名（残り1名）
9. ✅ 中央の `hasActed` が true になり「侵攻する」ボタンが非活性化

### シナリオ B — 侵攻失敗（同数以下）

1. シナリオ A 後、中央（兵1）から東（マグナス 兵3）に侵攻
2. ✅ 1 ≤ 3 で防衛側勝利
3. ✅ 中央の兵が0になる
4. ✅ 東は変化なし
5. ✅ アルバニアの全兵がリオン王とクレアで残ったら...
   - （実際は西と中央に分散しているはず）

### シナリオ C — ターン経過と収入

1. 「ターン終了」をクリック
2. ✅ AI 4カ国が即パス
3. ✅ 月が 1 → 2 に進む
4. ✅ アルバニアの gold が +120 (中央80 + 西40)
5. ✅ 全領地の hasActed が false になる
6. ✅ 「行動中: アルバニア王国」に戻る

### シナリオ D — 勝利

1. テスト用に隣国を順次侵略
2. 最後の敵領地を占領
3. ✅ 月経過時に勝利モーダル表示
4. 「最初から」ボタンで初期状態に戻る

### シナリオ E — 敗北

1. テスト用に手動でプレイヤー領地の兵を消すなどして全領地を失う状態を作る
   （または初期状態を改造して 0 領地スタートでテスト）
2. ✅ 月経過時に敗北モーダル表示

---

## 10. Sprint 3 への準備

Sprint 2 完了時点で以下が達成されていれば、Sprint 3（戦術マップ実装）に進めます。

- ✅ 戦略マップで一通りの操作が可能
- ✅ 戦闘ロジックが `src/game/battle.ts` に独立している（差し替え容易）
- ✅ `GamePhase` の型定義に `'tactical'` が含まれている
- ✅ 戦闘発生時の attacker / defender / territory の情報が把握できている

Sprint 3 では `executeInvasion` の中身を「ダミー戦闘呼び出し」から「戦術マップへの遷移」に差し替え、戦闘解決後に戦略マップに戻るフローを作ります。

---

## 補足: コードスタイル

- TypeScript strict 維持、`any` は使わない
- React は関数コンポーネントのみ
- Hooks は最小限（`useState`, Zustand 経由のセレクタが基本）
- `useEffect` は副作用が必要な時だけ（できれば使わずに済ませる）
- スタイルは Sprint 2 ではインラインで十分（後で整備）
- ファイル末尾に空行を入れる、セミコロンは付ける（既存ファイルと統一）

不明点があれば実装前に Web 版 Claude に相談してください。

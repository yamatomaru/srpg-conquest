# SRPG国取りゲーム — Claude Code向けプロジェクトガイド

## プロジェクト概要

Spectral Force 風のターン制国取り戦略ゲームのWeb版。
ブラウザ単体で動くシングルページアプリ（バックエンドなし）。

## 技術スタック

- **Vite 5** + React 18 + TypeScript（strict）
- **Zustand** ゲーム状態管理
- **SVG** でマップ描画（戦略・戦術両方）
- **localStorage** セーブ予定（Sprint 6 以降）

## 開発スタイル（CommandTimingRPGの方針を踏襲）

- **データ駆動**: ScriptableObject相当の不変データを `src/data/*.ts` に集約
- **モジュラー設計**: 戦略フェーズと戦術フェーズを別モジュールに分離
- **型安全優先**: TypeScriptのstrictモードを徹底、`any` は原則禁止

## ディレクトリ構成

```
src/
  App.tsx              ルートコンポーネント（現在は Sprint 1 検証用ダンプUI）
  main.tsx             エントリーポイント
  index.css            グローバルCSS

  data/                ScriptableObject相当の不変データ
    jobs.ts            戦士・弓兵・魔導師の能力値
    characters.ts      キャラクター個体（14名）
    nations.ts         国家データ（5カ国）
    territories.ts     領地データ・隣接関係（5領地）

  game/                ゲームロジック
    types.ts           全型定義（戦闘用 BattleState 等は型のみ先行）
    store.ts           Zustandストア
```

## ゲーム設計の要点

| 項目 | 決定事項 |
|---|---|
| マップ規模 | 5カ国 / 5領地（中央型） |
| ジョブ | 3種：戦士・弓兵・魔導師 |
| 戦闘形式 | ターン制SRPG（マス目移動・攻撃） |
| 地形効果 | MVP では無し（全マス平地） |
| ダメージ計算 | `damage = max(1, atk - def)` |
| プレイ規模目標 | 1局 30分〜1時間 |
| 勝利条件 | 全土統一 |
| ビジュアル | ピクセル/ドット絵スプライト風（自作予定） |
| 世界観 | 中世ファンタジー王道 |

## マップ構成

```
            [北: ノルダー高地]
                   |
[西: ヴィース] - [中央: アルバニア] - [東: マグナス聖塔]
                   |
            [南: シルヴァン森林]
```

辺境同士は環状に隣接（北↔東↔南↔西↔北）。
マグナス（東）が最強格、ヴィース（西）が最弱・最初の標的。

## ジョブバランス（暫定）

| ジョブ | HP | ATK | DEF | MOV | 射程 |
|---|---:|---:|---:|---:|---:|
| 戦士 | 32 | 10 | 5 | 4 | 1 |
| 弓兵 | 22 | 9 | 3 | 5 | 3 |
| 魔導師 | 20 | 12 | 2 | 4 | 2 |

## スプリント計画

- ✅ **Sprint 1**: データ層構築（型・初期データ・ストア・検証UI）
- 🚧 **Sprint 2**: 戦略マップ（SVG国取り画面、領地クリック、ターン進行、ダミー戦闘）
- ⏳ **Sprint 3**: 戦術マップ（グリッド・ユニット移動・移動範囲計算）
- ⏳ **Sprint 4**: 戦闘ロジック（ダメージ計算・撃破処理・ターン終了判定）
- ⏳ **Sprint 5**: AI実装（戦術AI＋戦略AI、最大の難所）
- ⏳ **Sprint 6**: 統合（戦略 ⇄ 戦術遷移、勝敗判定、簡易UI整備）

## 開発コマンド

```bash
npm install        # 初回のみ
npm run dev        # 開発サーバー（http://localhost:5173）
npm run build      # 本番ビルド
npm run preview    # ビルド結果プレビュー
```

## Claude Code向けの作業ガイドライン

### データ層を変更する時の整合性チェック
- `Nation.rulerId` がそのキャラの所属国の `characterIds` に含まれること
- `Territory.garrisonIds` のキャラが `Nation.characterIds` の部分集合であること
- `Territory.adjacentTo` が双方向で対応していること（A→B なら B→A も）

### 新規追加時の注意
- キャラクターを追加する場合は `nations.ts` の `characterIds` と `territories.ts` の `garrisonIds` を必ず更新
- 新ジョブを足す場合は `JobId` 型と `JOBS` テーブル両方に追加（TS strictで漏れは検知される）

### 戦術マップ実装（Sprint 3）の方針
- 移動範囲計算は **BFS** で実装（地形コストを後で足せるように）
- 攻撃範囲は **マンハッタン距離** で射程内マスを抽出
- グリッドサイズはまず 8×8、必要なら拡大

### AI実装（Sprint 5）の方針
- **戦術AI**: 最近傍プレイヤーユニットへ最短経路移動 → 攻撃範囲内なら攻撃。これ以上の賢さは後回し
- **戦略AI**: 「最も弱い隣接領地に攻め込む」を基本方針、自国が劣勢なら防衛優先
- 戦術AIと戦略AIは別ファイル（`src/game/tactical/ai.ts`、`src/game/strategic/ai.ts`）で分離

## 既知のTODO・MVP対象外

- スプライト素材（戦士/弓兵/魔導師）— 自作予定
- 戦闘BGM/SE — MVP対象外
- セーブ/ロード — Sprint 6 以降、localStorage 利用予定
- 外交（同盟・寝返り・婚姻）— MVP対象外
- 内政施策（市場・農業・徴税）— 月収入のみ、施策はMVP対象外
- イベント・シナリオ分岐 — MVP対象外
- 経験値・レベルアップ — MVP対象外

## Web版Claudeとの分業

- **企画・設計判断・全体俯瞰** は Web版Claude（このCLAUDE.mdを更新）
- **実装・デバッグ・リファクタ** は Claude Code（このリポジトリで作業）
- 大きな設計変更が必要になったら Web版に相談 → CLAUDE.md 更新 → Claude Code で実装

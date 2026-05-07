# SRPG国取り

Spectral Force 風のターン制国取り戦略ゲームのWeb版。
Vite + React + TypeScript + Zustand 構成で、ブラウザ単体で動作します。

## クイックスタート

```bash
npm install
npm run dev
```

`http://localhost:5173` を開くと、Sprint 1 のデータ層検証画面が表示されます。

## 現在のステータス

**Sprint 1（データ層）完了** — 5カ国・5領地・14キャラクターのデータ層が整備済み。
詳細な設計と次のスプリント計画は `CLAUDE.md` を参照してください。

## 開発スプリント

- ✅ Sprint 1: データ層構築
- 🚧 Sprint 2: 戦略マップ（SVG国取り画面）
- ⏳ Sprint 3: 戦術マップ（グリッド・移動）
- ⏳ Sprint 4: 戦闘ロジック
- ⏳ Sprint 5: AI実装
- ⏳ Sprint 6: ゲームループ統合

## ディレクトリ構成

```
src/
  data/      ScriptableObject相当の不変データ（jobs, characters, nations, territories）
  game/      ゲームロジック（types, store）
  App.tsx    ルートコンポーネント
  main.tsx   エントリーポイント
```

## ライセンス

個人プロジェクト（未定）

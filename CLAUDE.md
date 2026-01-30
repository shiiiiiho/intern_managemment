# CLAUDE.md

Claude Code向けプロジェクトガイドライン

## プロジェクト概要

[プロジェクトの説明を記載]

## Commands

### 開発環境

```bash
docker compose up -d    # Docker環境起動
npm run dev             # 開発サーバー起動
```

### テスト

```bash
npm test                # 全テスト実行
npm run test:unit       # ユニットテストのみ
npm run test:integration # 統合テストのみ
npm run test:e2e        # E2Eテスト
npm run test:watch      # ウォッチモード
npm run test:coverage   # カバレッジレポート
```

### コード品質

```bash
npm run lint            # ESLintチェック
npm run lint:fix        # ESLint自動修正
npm run format          # Prettierフォーマット
npm run validate        # lint + test 一括実行
```

## Code Style

- ES Modules (`import`/`export`)
- クラス名: `PascalCase`
- 関数/変数: `camelCase`
- 定数: `SCREAMING_SNAKE_CASE`
- 1ファイル500行以内
- 1関数50行以内

## TDD Rules（厳守）

1. **Red → Green → Refactor** サイクルを守る
2. テストなしのプロダクションコード追加は禁止
3. テストが通るまでコミットしない
4. リファクタリング中にテストが壊れたら即座に戻す

## Architecture

[プロジェクト構造の説明]

## 参考ドキュメント

| ファイル               | 内容              |
| ---------------------- | ----------------- |
| `docs/ARCHITECTURE.md` | システム構成図    |
| `docs/TDD_SETUP.md`    | TDD環境の詳細設定 |

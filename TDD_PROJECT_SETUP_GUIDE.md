# TDD プロジェクトセットアップガイド

**作成日**: 2026-01-13
**更新日**: 2026-01-27
**対象**: Node.js + JavaScript プロジェクト（このリポジトリ向けに反映済み）
**所要時間**: 約30-60分

---

## 目次

1. [概要](#概要)
2. [前提条件](#前提条件)
3. [Phase 1: プロジェクトドキュメント整備](#phase-1-プロジェクトドキュメント整備)
4. [Phase 2: TDD環境構築](#phase-2-tdd環境構築)
5. [Phase 3: Claude Code設定](#phase-3-claude-code設定)
6. [Phase 4: VS Code設定](#phase-4-vs-code設定)
7. [検証手順](#検証手順)
8. [トラブルシューティング](#トラブルシューティング)

---

## 概要

このリポジトリで TDD を継続できるように、以下の環境を整備済みです：

| カテゴリ   | ツール             | 用途                       |
| ---------- | ------------------ | -------------------------- |
| **テスト** | Jest               | ユニットテスト・統合テスト |
| **テスト** | Playwright         | E2Eテスト                  |
| **品質**   | ESLint             | コード品質チェック         |
| **品質**   | Prettier           | コードフォーマット         |
| **Git**    | Husky              | Git Hooks管理              |
| **Git**    | lint-staged        | ステージファイル自動Lint   |
| **Git**    | commitlint         | コミットメッセージ規約     |
| **AI**     | Claude Code Skills | AI支援の体系化             |
| **AI**     | Claude Code Hooks  | 自動テスト実行             |

**すでに作成済みの主なファイル**:

- `package.json`（scripts + lint-staged）
- `jest.config.cjs`
- `playwright.config.cjs`
- `eslint.config.js`
- `.prettierrc`, `.prettierignore`
- `commitlint.config.cjs`
- `tests/unit/example.test.js`
- `tests/e2e/example.spec.js`
- `.claude/` 配下（hooks/commands/skills）
- `.vscode/` 設定
- `.husky/` フック
- `CLAUDE.md`
- `.gitignore`

---

## 前提条件

### 必須ソフトウェア

```bash
# バージョン確認コマンド
node -v    # v18.0.0 以上
npm -v     # v9.0.0 以上
git --version
```

### 推奨ソフトウェア

```bash
# Docker（E2Eテスト用）
docker --version
docker compose version

# Skaffold（Kubernetes開発用、オプション）
skaffold version
```

---

## Phase 1: プロジェクトドキュメント整備（済）

### 1.1 CLAUDE.md の作成（済）

プロジェクトルートに `CLAUDE.md` を作成します。これはClaude Codeがプロジェクトを理解するための設計書です。

```bash
touch CLAUDE.md
```

**CLAUDE.md テンプレート:**

````markdown
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
````

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

````

### 1.2 ドキュメントディレクトリの作成（未実行）

```bash
mkdir -p docs
```

必要に応じて以下のドキュメントを作成：

- `docs/ARCHITECTURE.md` - システム構成図
- `docs/CODE_MAP.md` - ファイル依存関係
- `docs/DATA_FLOW.md` - データフロー
- `docs/KNOWN_ISSUES.md` - 既知の問題

---

## Phase 2: TDD環境構築（設定ファイル作成済み）

### 2.1 package.json の設定（済）

既存の `package.json` に以下を追加します。

**scripts セクション:**

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest tests/unit",
    "test:integration": "jest tests/integration",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:report": "playwright show-report",
    "lint": "eslint [対象ディレクトリ]",
    "lint:fix": "eslint [対象ディレクトリ] --fix",
    "format": "prettier --write \"[対象パターン]\"",
    "format:check": "prettier --check \"[対象パターン]\"",
    "validate": "npm run lint && npm run test",
    "prepare": "husky"
  },
  "lint-staged": {
    "*.js": ["eslint --fix", "prettier --write"],
    "*.{json,md,html,css}": ["prettier --write"]
  }
}
```

### 2.2 依存パッケージのインストール（未実行）

```bash
# テストフレームワーク
npm install --save-dev jest @types/jest
npm install --save-dev @playwright/test

# コード品質
npm install --save-dev eslint @eslint/js
npm install --save-dev prettier

# Git Hooks
npm install --save-dev husky lint-staged
npm install --save-dev @commitlint/cli @commitlint/config-conventional

# Playwrightブラウザ（初回のみ）
npx playwright install
```

### 2.3 テストディレクトリ構造の作成（済）

```bash
mkdir -p tests/unit
mkdir -p tests/integration
mkdir -p tests/e2e
```

**サンプルテストファイル:**

`tests/unit/example.test.js`:

```javascript
describe('Example Test Suite', () => {
  test('true is truthy', () => {
    expect(true).toBe(true);
  });

  test('1 + 1 equals 2', () => {
    expect(1 + 1).toBe(2);
  });
});
```

`tests/e2e/example.spec.js`:

```javascript
// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('基本機能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('ページが表示される', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
  });
});
```

### 2.4 Jest設定ファイル（済）

`jest.config.cjs` を作成：

```javascript
// Jest設定
module.exports = {
  // テスト環境
  testEnvironment: 'node',

  // テストファイルのパターン
  testMatch: ['**/tests/**/*.test.js', '**/tests/**/*.spec.js', '**/__tests__/**/*.js'],

  // カバレッジ設定
  collectCoverageFrom: [
    'src/**/*.js', // ← プロジェクトに合わせて変更
    '!**/node_modules/**',
    '!**/archive/**',
  ],

  // カバレッジレポート
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],

  // カバレッジ閾値（段階的に引き上げる）
  coverageThreshold: {
    global: {
      branches: 0, // 目標: 80%
      functions: 0, // 目標: 80%
      lines: 0, // 目標: 80%
      statements: 0, // 目標: 80%
    },
  },

  // テストタイムアウト
  testTimeout: 10000,

  // 詳細出力
  verbose: true,

  // 除外パターン
  testPathIgnorePatterns: [
    '/node_modules/',
    '/archive/',
    '/tests/e2e/', // Playwright E2Eテストを除外
  ],

  // モック自動クリア
  clearMocks: true,
};
```

### 2.5 Playwright設定ファイル（済）

`playwright.config.cjs` を作成：

```javascript
// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  // テストディレクトリ
  testDir: './tests/e2e',

  // 並列実行
  fullyParallel: true,

  // CI環境での失敗時リトライ禁止
  forbidOnly: !!process.env.CI,

  // リトライ回数
  retries: process.env.CI ? 2 : 0,

  // ワーカー数
  workers: process.env.CI ? 1 : undefined,

  // レポーター
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],

  // 共通設定
  use: {
    // ベースURL（環境に合わせて変更）
    baseURL: 'http://localhost:8080',

    // トレース収集（失敗時のみ）
    trace: 'on-first-retry',

    // スクリーンショット（失敗時のみ）
    screenshot: 'only-on-failure',

    // ビデオ録画（失敗時のみ）
    video: 'on-first-retry',
  },

  // プロジェクト（ブラウザ）設定
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  // タイムアウト設定
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
});
```

### 2.6 ESLint設定ファイル（済）

`eslint.config.js` を作成（Flat Config形式）：

```javascript
// ESLint Flat Config (v9+)
import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        fetch: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        HTMLElement: 'readonly',
        CustomEvent: 'readonly',
        Event: 'readonly',
        FormData: 'readonly',
        FileReader: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        Image: 'readonly',
        // Node.js globals
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        Buffer: 'readonly',
        // プロジェクト固有のグローバル変数をここに追加
      },
    },
    rules: {
      // エラー防止
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'no-console': 'off',

      // コード品質
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-var': 'error',
      'prefer-const': 'warn',

      // スタイル（Prettierに任せる）
      semi: 'off',
      quotes: 'off',
      indent: 'off',
      'comma-dangle': 'off',
    },
  },
  {
    // テストファイル用の設定
    files: ['**/*.test.js', '**/*.spec.js', 'tests/**/*.js'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        jest: 'readonly',
      },
    },
  },
  {
    // 除外ファイル
    ignores: [
      'node_modules/**',
      'archive/**',
      'backups/**',
      'logs/**',
      '*.min.js',
      'coverage/**',
      'playwright-report/**',
    ],
  },
];
```

### 2.7 Prettier設定ファイル（済）

`.prettierrc` を作成：

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "useTabs": false,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

`.prettierignore` を作成：

```
# Prettier除外設定
node_modules/
archive/
backups/
logs/
coverage/
playwright-report/
*.min.js
*.min.css
package-lock.json
```

### 2.8 commitlint設定ファイル（済）

`commitlint.config.cjs` を作成：

```javascript
// commitlint設定
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', // 新機能
        'fix', // バグ修正
        'docs', // ドキュメントのみ変更
        'style', // コードの意味に影響しない変更
        'refactor', // バグ修正でも機能追加でもないコード変更
        'perf', // パフォーマンス改善
        'test', // テストの追加・修正
        'build', // ビルドシステムや外部依存の変更
        'ci', // CI設定ファイルの変更
        'chore', // その他の変更
        'revert', // コミットの取り消し
      ],
    ],
    'subject-case': [0], // 日本語コミットメッセージを許可
  },
};
```

### 2.9 Husky Git Hooks設定（未実行）

```bash
# Husky初期化
npx husky install
```

`.husky/pre-commit` を作成：

```bash
npx lint-staged
```

`.husky/commit-msg` を作成：

```bash
npx --no -- commitlint --edit "$1"
```

`.husky/pre-push` を作成：

```bash
#!/bin/sh
# pre-push hook: プッシュ前に全テストを実行

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔒 Pre-push: テスト実行中..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

npm test

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ テスト失敗！プッシュを中止します"
    echo ""
    echo "修正してから再度プッシュしてください："
    echo "  npm test        # 失敗箇所を確認"
    echo "  npm run lint    # Lint確認"
    echo ""
    exit 1
fi

echo ""
echo "✅ 全テスト成功！プッシュを続行します"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
```

**実行権限の付与:**

```bash
chmod +x .husky/pre-commit
chmod +x .husky/commit-msg
chmod +x .husky/pre-push
```

### 2.10 .gitignore の更新（済）

以下を `.gitignore` に追加：

```
# Test artifacts
coverage/
playwright-report/
playwright/.cache/
test-results/
```

---

## Phase 3: Claude Code設定（済）

### 3.1 ディレクトリ構造の作成

```bash
mkdir -p .claude/hooks
mkdir -p .claude/commands
mkdir -p .claude/skills/test-generator
mkdir -p .claude/skills/refactor-helper
mkdir -p .claude/skills/debug-assistant
```

### 3.2 settings.json の作成

`.claude/settings.json` を作成：

```json
{
  "permissions": {
    "defaultMode": "acceptEdits",
    "allow": [
      "Read files",
      "Edit files",
      "Write files",
      "Bash(npm run *)",
      "Bash(npx *)",
      "Bash(node *)",
      "Bash(docker compose *)",
      "Bash(docker exec *)",
      "Bash(git status)",
      "Bash(git diff *)",
      "Bash(git log *)",
      "Bash(git add *)",
      "Bash(git commit *)",
      "Bash(git branch *)",
      "Bash(git checkout *)",
      "Bash(git stash *)",
      "Bash(curl *)",
      "Bash(ls *)",
      "Bash(cat *)",
      "Bash(grep *)",
      "Bash(find *)",
      "Bash(mkdir *)",
      "Bash(rm *)",
      "Bash(cp *)",
      "Bash(mv *)",
      "Bash(which *)",
      "Bash(echo *)",
      "Bash(pwd)",
      "Bash(head *)",
      "Bash(tail *)",
      "Bash(wc *)",
      "Bash(touch *)",
      "Bash(chmod *)",
      "Bash(brew *)",
      "Bash(skaffold *)",
      "Bash(kubectl *)"
    ],
    "deny": [
      "Bash(git push *)",
      "Bash(git push)",
      "Bash(git reset --hard *)",
      "Bash(git clean -fd *)",
      "Bash(git rebase *)",
      "Bash(rm -rf /)",
      "Bash(rm -rf ~)",
      "Bash(sudo *)"
    ]
  },
  "hooks": {
    "afterEdit": "./.claude/hooks/after-edit.sh"
  },
  "customInstructions": {
    "verification": {
      "description": "修正後の動作確認を必須化するルール",
      "rules": [
        "ファイルを修正したら、必ず動作確認を行うこと",
        "ユーザーが「動かない」と報告したら、まず自分のコードを疑う",
        "「スーパーリロードしてください」は最後の手段",
        "ブラウザコンソールのエラーを必ず確認すること"
      ]
    }
  }
}
```

### 3.3 TDDガードHook の作成

`.claude/hooks/after-edit.sh` を作成：

```bash
#!/bin/bash
# After-edit hook: TDDガード + 動作確認強制システム

# 編集されたファイルのパスを取得
EDITED_FILE="$1"
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

# ===========================================
# TDD ガード: 関連テストを自動実行
# ===========================================
run_related_tests() {
    local file="$1"
    local test_file=""

    # src/*.js → tests/unit/*.test.js
    if [[ "$file" == *"src/"* ]]; then
        local basename=$(basename "$file" .js)
        test_file="$PROJECT_ROOT/tests/unit/${basename}.test.js"

        if [[ -f "$test_file" ]]; then
            echo "🧪 TDD Guard: 関連テスト実行中..."
            echo "   $test_file"
            cd "$PROJECT_ROOT" && npm run test:unit -- --testPathPattern="${basename}" --passWithNoTests 2>/dev/null
            return $?
        fi
    fi

    return 0
}

# JSファイルが編集された場合
if [[ "$EDITED_FILE" == *.js ]]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # TDDガード実行
    if run_related_tests "$EDITED_FILE"; then
        echo "✅ TDD Guard: テスト成功（またはテストなし）"
    else
        echo ""
        echo "❌ TDD Guard: テスト失敗！"
        echo "   修正してからコミットしてください"
        echo ""
    fi

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
fi

# テストファイルが編集された場合
if [[ "$EDITED_FILE" == *.test.js ]] || [[ "$EDITED_FILE" == *.spec.js ]]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🧪 TDD Guard: テストファイル編集検出"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "テストを実行してRed/Greenを確認してください："
    echo ""
    echo "  npm run test:unit -- --testPathPattern=\"$(basename $EDITED_FILE .test.js)\""
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
fi
```

**実行権限の付与:**

```bash
chmod +x .claude/hooks/after-edit.sh
```

### 3.4 カスタムコマンド /tdd-cycle の作成

`.claude/commands/tdd-cycle.md` を作成：

````markdown
# TDD Cycle コマンド

このコマンドは、TDD (Test-Driven Development) の Red-Green-Refactor サイクルを自動化します。

## 引数

- `$ARGUMENTS`: 実装したい機能の説明

## 実行フロー

### 1. 探索フェーズ

- 対象機能に関連する既存ファイルを検索
- 既存のテストパターンを確認
- 関連するデータ構造やAPIを把握

### 2. 計画フェーズ

- 必要なテストケースをリストアップ
- 正常系、エッジケース、エラーケースを網羅

### 3. RED フェーズ

**最初に失敗するテストを作成**

```bash
npm run test:unit -- --testPathPattern="[機能名]"
```
````

確認事項:

- [ ] テストが失敗することを確認
- [ ] 失敗理由が「実装がない」ことであると確認

### 4. GREEN フェーズ

**テストをパスする最小限のコード**

```bash
npm run test:unit -- --testPathPattern="[機能名]"
```

### 5. REFACTOR フェーズ

**コード改善**

```bash
npm test
```

### 6. 完了

サイクルを繰り返すか、完了を報告

## 注意事項

- テストなしの実装は禁止
- グリーンになるまでコミットしない
- リファクタリング中にテストが壊れたらすぐ戻す

````

### 3.5 Skills の作成

#### test-generator スキル

`.claude/skills/test-generator/SKILL.md` を作成：

```markdown
# Test Generator Skill

テストコードを自動生成するスキル。

## 発動条件

- 新しい関数やクラスが追加されたとき
- 「テストを書いて」と依頼されたとき
- カバレッジが不足しているファイルを指摘されたとき

## 実行フロー

### 1. 対象コードの分析
- 関数のシグネチャ（引数、戻り値）を確認
- 依存関係を特定
- 既存のテストパターンを参照

### 2. テストケースの特定

| カテゴリ | 説明 |
|---------|------|
| 正常系 | 期待通りの入力で期待通りの出力 |
| 境界値 | 最小値、最大値、ゼロ、空文字など |
| エッジケース | 特殊な状況 |
| エラーケース | 異常系の処理 |

### 3. テストコード生成

```javascript
describe('[モジュール名]', () => {
  describe('[関数名]', () => {
    test('正常な入力で期待する結果を返す', () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
````

## プロジェクト規約

- ユニットテスト: `tests/unit/[ファイル名].test.js`
- 統合テスト: `tests/integration/[ファイル名].test.js`
- E2Eテスト: `tests/e2e/[機能名].spec.js`

````

#### refactor-helper スキル

`.claude/skills/refactor-helper/SKILL.md` を作成：

```markdown
# Refactor Helper Skill

コードのリファクタリングを安全に行うスキル。

## 発動条件

- 「リファクタリングして」と依頼されたとき
- 関数が長すぎる（50行以上）とき
- コードの重複が検出されたとき

## リファクタリングパターン

| パターン | 検出条件 | 対処法 |
|---------|---------|--------|
| 長い関数 | 50行以上 | 関数分割 |
| 重複コード | 同じロジックが2箇所以上 | 共通関数に抽出 |
| マジックナンバー | 意味不明な数値 | 定数化 |
| 深いネスト | 3段以上 | 早期リターン |

## 安全なリファクタリング手順

1. テストが通ることを確認
2. 小さな変更を1つ実施
3. テストを再実行
4. 問題があれば即座に戻す
````

#### debug-assistant スキル

`.claude/skills/debug-assistant/SKILL.md` を作成：

```markdown
# Debug Assistant Skill

バグの原因特定と修正を支援するスキル。

## 発動条件

- 「動かない」「バグがある」「エラーが出る」と報告されたとき
- テストが失敗したとき
- 「なぜ〜なのか」という質問があったとき

## 実行フロー

### 1. 情報収集

- エラーメッセージの全文
- 再現手順
- 期待する動作 vs 実際の動作

### 2. 原因特定

- エラー確認
- 最近の変更確認
- 再現確認

### 3. 仮説検証

1. 仮説を立てる
2. 検証方法を決める
3. 検証実行
4. 結果から次の仮説へ

## 禁止事項

- 「スーパーリロードしてください」
- 「キャッシュをクリアしてください」
- ユーザーの操作のせいにする

→ まず自分のコードを疑う
```

### 3.6 AI駆動開発コマンドの作成

> **注意**: `/task-start` コマンドは `/tdd-cycle` に統合されました。
> ブランチ作成から TDD 開発まで一貫して `/tdd-cycle` で行います。

#### /task-complete コマンド

`.claude/commands/task-complete.md` を作成：

````markdown
# Task Complete コマンド

タスク完了時の処理を自動化するコマンド。

## 実行フロー

1. **事前チェック**
   - 全変更がコミット済み
   - 全テストがパス

2. **変更内容の分析**
   - mainからの差分を確認
   - コミット履歴を確認

3. **リモートにプッシュ**

   ```bash
   git push -u origin <current-branch>
   ```

4. **PR作成**
   - 概要、変更内容、テスト、影響範囲を記載
   - GitHub CLIで作成

5. **レビュー依頼**
   - /pr-review でセルフレビューを実施
````

#### /pr-review コマンド（本格的レビュー）

`.claude/commands/pr-review.md` を作成：

```markdown
# PR Review コマンド

本格的なコードレビューを実行するコマンド。

## レビュー観点（7つ）

1. **正確性** - ロジック、エッジケース、計算
2. **安全性** - SQLi, XSS, 認証/認可
3. **パフォーマンス** - N+1, メモリ, アルゴリズム
4. **可読性** - 命名, マジックナンバー, 複雑度
5. **保守性** - SRP, DRY, 抽象化
6. **テスト品質** - カバレッジ, 境界値, モック
7. **規約準拠** - コーディング規約, コミット形式

## 出力形式

- 各観点の評価（✅/⚠️/❌）
- 詳細な指摘と改善案
- アクションアイテム（必須/推奨）
- **GitHub PRへのコメント投稿**（履歴として残すため）

## レビューの深さ

- 計算ロジックを実際に検算
- すべての分岐パスを確認
- null/undefined の安全性確認
- テストカバレッジの検証
```

#### /pr-update コマンド

`.claude/commands/pr-update.md` を作成：

```markdown
# PR Update コマンド

レビュー指摘対応を効率化するコマンド。

## 引数

- `$ARGUMENTS`: PR番号（必須）

## 実行フロー

1. **PR情報の取得**
   - PRのブランチにチェックアウト
   - レビューコメントを確認

2. **修正の実施**
   - 指摘項目を修正
   - テスト追加/修正
   - 全テスト実行

3. **コミット & プッシュ**
   - 修正内容をコミット
   - リモートにプッシュ

4. **PRコメント投稿**
   - 修正完了を報告
   - 対応した項目をチェックリスト形式で記載
```

#### /sync-main コマンド

`.claude/commands/sync-main.md` を作成：

```markdown
# Sync Main コマンド

mainブランチを最新に同期するコマンド。

## 実行フロー

1. 現在の状態を確認（未コミット変更の有無）
2. mainブランチを最新化
3. 元のブランチにマージ/リベース
4. コンフリクト対応（発生時）
5. テスト実行
```

---

## Phase 4: VS Code設定（済）

### 4.1 VS Code設定ファイル

`.vscode/settings.json` を作成：

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "editor.tabSize": 2,
  "editor.insertSpaces": true,

  "eslint.enable": true,
  "eslint.validate": ["javascript"],
  "eslint.useFlatConfig": true,

  "prettier.enable": true,
  "prettier.requireConfig": true,

  "files.exclude": {
    "node_modules": true,
    "coverage": true,
    "playwright-report": true,
    "test-results": true
  },

  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true
  },

  "[json]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true
  },

  "[markdown]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true
  },

  "jest.autoRun": {
    "watch": false,
    "onSave": "test-file"
  },
  "jest.rootPath": "${workspaceFolder}"
}
```

### 4.2 推奨拡張機能

`.vscode/extensions.json` を作成：

```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "orta.vscode-jest",
    "ms-playwright.playwright",
    "eamodio.gitlens",
    "usernamehw.errorlens"
  ]
}
```

---

## 検証手順（未実行）

### テスト実行確認

```bash
# ユニットテスト
npm test

# E2Eテスト（必要なら）
npm run test:e2e
```

### Lint/Format確認

```bash
npm run lint
npm run format:check
```

### Git Hooks確認

```bash
# コミットテスト
git add .
git commit -m "test: セットアップ確認用テストコミット"
# → lint-stagedとcommitlintが実行されることを確認
```

### Claude Code確認

```bash
# Claude Codeでファイルを編集
# → after-edit.sh が実行されることを確認

# /tdd-cycle コマンドを実行
# → TDDサイクルのガイドが表示されることを確認
```

---

## トラブルシューティング

### ES Modules エラー

**症状:** `SyntaxError: Cannot use import statement outside a module`

**解決策:** 設定ファイルを `.cjs` 拡張子にする

```bash
mv jest.config.js jest.config.cjs
mv playwright.config.js playwright.config.cjs
mv commitlint.config.js commitlint.config.cjs
```

### Husky が動かない

**解決策:**

```bash
npx husky install
chmod +x .husky/*
```

### Playwright ブラウザが見つからない

**解決策:**

```bash
npx playwright install
```

### ESLint Flat Config エラー

**症状:** `ESLint configuration in eslint.config.js is invalid`

**解決策:** ESLint v9以上を使用していることを確認

```bash
npm install --save-dev eslint@latest @eslint/js@latest
```

---

## チェックリスト（このリポジトリ向け）

### Phase 1: ドキュメント

- [x] CLAUDE.md を作成
- [ ] docs/ ディレクトリを作成

### Phase 2: TDD環境

- [ ] 依存パッケージをインストール
- [x] jest.config.cjs を作成
- [x] playwright.config.cjs を作成
- [x] eslint.config.js を作成
- [x] .prettierrc / .prettierignore を作成
- [x] commitlint.config.cjs を作成
- [ ] Husky Git Hooks を設定
- [x] tests/ ディレクトリ構造を作成
- [x] .gitignore を更新

### Phase 3: Claude Code

- [x] .claude/settings.json を作成
- [x] .claude/hooks/after-edit.sh を作成
- [x] .claude/commands/tdd-cycle.md を作成（ブランチ作成機能含む）
- [x] .claude/commands/task-complete.md を作成
- [x] .claude/commands/pr-review.md を作成（GitHub PRコメント投稿機能含む）
- [x] .claude/commands/pr-update.md を作成（レビュー指摘対応用）
- [x] .claude/commands/sync-main.md を作成
- [x] .claude/skills/ を作成

### Phase 4: VS Code

- [x] .vscode/settings.json を作成
- [x] .vscode/extensions.json を作成

### 検証

- [ ] npm test が成功
- [ ] npm run lint が成功
- [ ] Git コミットでHooksが動作
- [ ] Claude Code でHooksが動作

---

## 次にやること（TDDをすぐ始めるための最短手順）

1. 依存関係をインストール

```bash
npm install --save-dev jest @types/jest @playwright/test eslint @eslint/js prettier husky lint-staged @commitlint/cli @commitlint/config-conventional
```

2. Playwright ブラウザを導入（必要なら）

```bash
npx playwright install
```

3. Husky を有効化

```bash
npx husky install
```

4. テストが動くか確認

```bash
npm test
```

5. 実装を始める

- ユニットテスト: `tests/unit/`
- 統合テスト: `tests/integration/`
- E2E テスト: `tests/e2e/`

---

## 既存ファイルの扱い（重要）

現在のコードは `コード.js` / `index.html` / `login.html` などがルート直下にあります。  
TDDを前提に整理する場合は、以下のどちらかに寄せるのが安全です：

- **A: 現状維持**（移動しない）  
  既存構成のままテストだけ追加。

- **B: `src/` を新設して移動**  
  その場合は `jest.config.cjs` の `collectCoverageFrom` を `src/**/*.js` のまま維持できます。

**選択**: A（現状維持、移動なし）

どちらで進めるか決めたら、テスト設計を開始できます。

---

**作成者**: Claude Opus 4.5
**参照プロジェクト**: midorikawa-quotation-system

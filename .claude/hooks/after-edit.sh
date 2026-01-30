#!/bin/bash
# After-edit hook: TDDガード + 動作確認強制システム

EDITED_FILE="$1"
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

run_related_tests() {
    local file="$1"
    local test_file=""

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

if [[ "$EDITED_FILE" == *.js ]]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

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

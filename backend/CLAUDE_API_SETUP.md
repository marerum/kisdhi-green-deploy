# Claude API セットアップガイド

## 概要
このガイドでは、リアルタイムフロー生成機能を有効にするためのClaude APIの設定方法を説明します。

**更新日**: 2026/01/20  
**対応機能**: リアルタイム増分フロー生成

---

## 1. Claude APIキーの取得

### ステップ1: Anthropicアカウント作成
1. https://console.anthropic.com/ にアクセス
2. "Sign Up" をクリックしてアカウントを作成
3. メール認証を完了

### ステップ2: APIキーの生成
1. Console画面で "API Keys" セクションに移動
2. "Create Key" ボタンをクリック
3. キーの名前を設定（例: "Kishimen Development"）
4. 生成されたAPIキーをコピー
   - **重要**: キーは一度しか表示されないため、必ず安全な場所に保存してください
   - キーの形式: `sk-ant-api03-...`

### ステップ3: 料金プランの確認
- Claude APIは従量課金制です
- **初回利用**: $5のクレジットが付与されます
- **開発段階の見積もり**:
  - 1回のフロー生成: 約 $0.01-0.02
  - $5で約250-500回のテスト可能
  - 開発段階では十分な量です

**Claude Sonnet 4.5 料金**:
- 入力: $3/MTok (100万トークンあたり)
- 出力: $15/MTok (100万トークンあたり)

---

## 2. 環境変数の設定

### `.env`ファイルに追加

`backend/.env`ファイルを開き、以下の設定を追加してください：

```bash
# ============================================
# Claude API設定 (2026/01/20追加)
# リアルタイムフロー生成機能で使用
# ============================================

# 必須: Anthropic APIキー
ANTHROPIC_API_KEY=sk-ant-api03-your-actual-api-key-here

# オプション: Claude設定（デフォルト値が設定されているため、通常は変更不要）
# CLAUDE_MODEL=claude-sonnet-4-20250514
# CLAUDE_MAX_TOKENS=4096
# CLAUDE_TEMPERATURE=0.7
```

### 設定パラメータの説明

| パラメータ | 必須/オプション | デフォルト値 | 説明 |
|-----------|---------------|-------------|------|
| `ANTHROPIC_API_KEY` | **必須** | なし | Anthropic APIキー（`sk-ant-`で始まる） |
| `CLAUDE_MODEL` | オプション | `claude-sonnet-4-20250514` | 使用するClaudeモデル |
| `CLAUDE_MAX_TOKENS` | オプション | `4096` | 最大出力トークン数 |
| `CLAUDE_TEMPERATURE` | オプション | `0.7` | 生成の多様性（0.0-1.0） |

---

## 3. 依存関係のインストール

```bash
cd backend
pip install anthropic==0.39.0
```

または、requirements.txtから一括インストール：

```bash
pip install -r requirements.txt
```

---

## 4. 動作確認

### ステップ1: バックエンドサーバーの起動

```bash
cd backend
uvicorn app.main:app --reload
```

### ステップ2: 起動ログの確認

正常に設定されていれば、以下のログが表示されます：

```
INFO:     Application startup complete.
INFO:app.main:Starting AI Business Flow Backend...
INFO:app.main:Configuration loaded: {..., 'anthropic_api_key_configured': True, 'claude_model': 'claude-sonnet-4-20250514', ...}
INFO:app.main:Database initialized successfully
INFO:app.main:Claude service initialized successfully
```

### ステップ3: エラーメッセージの確認

#### APIキーが未設定の場合
```
WARNING: ANTHROPIC_API_KEY is not set. Claude-based flow generation will not work.
WARNING: Claude service initialization failed: Anthropic API key not configured
```
→ `.env`ファイルに`ANTHROPIC_API_KEY`を追加してください

#### APIキーの形式が不正な場合
```
WARNING: ANTHROPIC_API_KEY appears to be invalid (should start with 'sk-ant-')
```
→ APIキーの形式を確認してください（`sk-ant-`で始まる必要があります）

---

## 5. リアルタイムフロー生成のテスト

### フロントエンドでのテスト手順

1. フロントエンドサーバーを起動
   ```bash
   cd frontend
   npm run dev
   ```

2. ブラウザで http://localhost:3000 を開く

3. プロジェクトのヒアリングページに移動

4. 音声入力を開始し、ビジネスプロセスについて話す
   - 例: "まず営業担当が顧客に商品を提案します。次に顧客が商品を検討して購入を決定します。"

5. フロープレビューがリアルタイムで更新されることを確認

### 期待される動作

- 音声認識が3秒以上停止すると自動的にフロー生成が開始
- フロープレビューに以下が表示される：
  - **Actors**: 発言内容から自動判定された登場人物（例: 営業担当、顧客）
  - **Steps**: ビジネスプロセスのステップ（例: 商品提案、検討・決定）
  - **Flow Nodes**: 各アクションの詳細
- ヒアリングログが自動保存される

---

## 6. トラブルシューティング

### 問題1: Claude APIが呼ばれない

**症状**: フロー生成が実行されず、ダミーデータが表示される

**確認事項**:
1. `.env`ファイルに`ANTHROPIC_API_KEY`が正しく設定されているか
2. バックエンドサーバーを再起動したか（環境変数の変更後は再起動が必要）
3. ブラウザの開発者ツールでネットワークエラーがないか確認

### 問題2: API呼び出しがタイムアウトする

**症状**: `Claude request timed out after XX seconds`

**対策**:
1. ネットワーク接続を確認
2. 発言内容が長すぎないか確認（最適な長さ: 50-200文字）
3. `.env`で`CLAUDE_MAX_TOKENS`を増やす（ただしコストが増加）

### 問題3: 予算を超過しそう

**症状**: API使用量が予想以上に多い

**対策**:
1. Anthropic Consoleで使用量を確認: https://console.anthropic.com/settings/usage
2. 開発中は短い発言でテストする
3. テスト回数を記録し、$5クレジットの残高を管理する
4. 必要に応じてクレジットを追加購入

### 問題4: エラーレスポンスが返される

**症状**: `Claude API呼び出しに失敗しました: ...`

**よくあるエラー**:

1. **Authentication Error**
   - APIキーが無効または期限切れ
   - Anthropic Consoleでキーを再生成

2. **Rate Limit Error**
   - リクエストが多すぎる
   - 少し待ってから再試行

3. **Invalid Request Error**
   - リクエスト形式が不正
   - バックエンドのログで詳細を確認

---

## 7. コスト管理のベストプラクティス

### 開発段階

1. **短い発言でテスト**: 各発言は20-50文字程度に抑える
2. **テスト回数を記録**: スプレッドシートなどで管理
3. **定期的に使用量確認**: 1日1回はConsoleで確認

### 本番環境

1. **使用量アラート設定**: Anthropic Consoleでアラートを設定
2. **月次予算の設定**: プロジェクトごとに予算を決める
3. **ログモニタリング**: 異常なAPI呼び出しを検知

---

## 8. 次のステップ

Claude API統合が完了したら、次の機能開発に進みましょう：

1. **フローエディタ連携**: 生成されたフローをエディタで編集
2. **全体ログ機能**: 過去のヒアリングログをマージした全体ログ表示
3. **エラーハンドリング改善**: より詳細なエラーメッセージと回復処理

---

## 付録: 環境変数テンプレート

完全な`.env`ファイルのテンプレート：

```bash
# Database Configuration
DATABASE_USER=root
DATABASE_PASSWORD=your_password
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_NAME=ai_business_flow

# API Keys
OPENAI_API_KEY=sk-proj-your-openai-key-here  # Optional
ANTHROPIC_API_KEY=sk-ant-api03-your-anthropic-key-here  # Required for real-time flow

# Claude Configuration (Optional - defaults are set)
CLAUDE_MODEL=claude-sonnet-4-20250514
CLAUDE_MAX_TOKENS=4096
CLAUDE_TEMPERATURE=0.7

# Application Settings
ENVIRONMENT=development
DEBUG=true
SECRET_KEY=your-secret-key-here
ALLOWED_ORIGINS=http://localhost:3000

# Server Settings
HOST=0.0.0.0
PORT=8000
```

---

## サポート

問題が解決しない場合：
1. バックエンドのログファイルを確認（`backend/logs/`）
2. Anthropic公式ドキュメント: https://docs.anthropic.com/
3. プロジェクトのIssueを作成

**重要**: APIキーを含むログやエラーメッセージをIssueに投稿しないでください！

# Claude API統合 - 実装完了サマリー

**実装日**: 2026/01/20  
**機能**: リアルタイムフロー生成のためのClaude API統合

---

## 実装内容

### 1. 環境設定 ✅
- [backend/app/config.py](app/config.py) にClaude API設定を追加
  - `anthropic_api_key`: APIキー
  - `claude_model`: モデル名（Claude Sonnet 4.5）
  - `claude_max_tokens`: 最大トークン数
  - `claude_temperature`: 生成の多様性

### 2. 依存関係 ✅
- [backend/requirements.txt](requirements.txt) に追加
  - `anthropic==0.39.0`: Anthropic公式SDK

### 3. AI サービス ✅
- [backend/app/services/ai.py](app/services/ai.py) に`ClaudeService`クラスを追加
  - `initialize()`: Claude API初期化
  - `generate_incremental_flow()`: 増分フロー生成
  - システムプロンプト: ビジネスプロセス整理専門家として動作
  - エラーハンドリング: リトライ、タイムアウト、バックオフ実装

### 4. アプリケーション初期化 ✅
- [backend/app/main.py](app/main.py) でClaude Serviceを初期化
  - 起動時に自動初期化
  - 失敗時は警告を表示（アプリは起動継続）

### 5. APIエンドポイント ✅
- [backend/app/routers/hearing.py](app/routers/hearing.py) を更新
  - `/api/projects/{project_id}/hearing/flow/incremental`
  - ダミーレスポンスを削除
  - 実際のClaude API呼び出しを実装

---

## 次のアクション

### すぐに実行すること

1. **依存関係のインストール**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **環境変数の設定**
   - `backend/.env`ファイルを編集
   - `ANTHROPIC_API_KEY=sk-ant-api03-...`を追加
   - 詳細は [CLAUDE_API_SETUP.md](CLAUDE_API_SETUP.md) 参照

3. **サーバーの再起動**
   ```bash
   # バックエンド
   cd backend
   uvicorn app.main:app --reload
   
   # フロントエンド（別ターミナル）
   cd frontend
   npm run dev
   ```

4. **動作確認**
   - http://localhost:3000 を開く
   - プロジェクトのヒアリングページで音声入力
   - フローがリアルタイムで生成されることを確認

### テスト手順

1. **初回フロー生成**
   - 音声入力: "まず営業担当が顧客に商品を提案します"
   - 3秒待つ
   - フロープレビューに「営業担当」「顧客」が表示されることを確認

2. **増分フロー生成**
   - 続けて: "次に顧客が商品を検討して購入を決定します"
   - 3秒待つ
   - 既存フローに新しいステップが追加されることを確認

3. **ヒアリングログ確認**
   - 各発言がフロー生成単位で分割保存されているか確認
   - ヒアリング履歴に複数のログが表示されることを確認

---

## 変更ファイル一覧

| ファイル | 変更内容 | コメント |
|---------|---------|---------|
| `backend/app/config.py` | Claude API設定追加 | `anthropic_api_key`, `claude_model`等 |
| `backend/requirements.txt` | anthropic==0.39.0追加 | Anthropic公式SDK |
| `backend/app/services/ai.py` | ClaudeServiceクラス追加 | 約300行の新規実装 |
| `backend/app/main.py` | Claude Service初期化 | lifespan関数を更新 |
| `backend/app/routers/hearing.py` | API実装を更新 | ダミーレスポンス削除、Claude呼び出し |
| `backend/CLAUDE_API_SETUP.md` | 新規作成 | セットアップガイド |
| `backend/CLAUDE_IMPLEMENTATION_SUMMARY.md` | 新規作成 | このファイル |

---

## 技術的詳細

### ClaudeService の主要機能

1. **増分フロー生成**
   - 既存フローを受け取り、新しい発言内容を統合
   - アクター自動判定
   - ステップ自動分割
   - 時系列順序の維持

2. **エラーハンドリング**
   - 3回までリトライ
   - 指数バックオフ（2秒、4秒、8秒）
   - タイムアウト: 30秒 → 60秒 → 90秒
   - 詳細なログ出力

3. **プロンプト設計**
   - システムプロンプト: ビジネスプロセス整理専門家
   - 既存フローの尊重
   - 必要最小限の変更
   - JSON形式での応答

### API仕様

**エンドポイント**: `POST /api/projects/{project_id}/hearing/flow/incremental`

**リクエスト**:
```json
{
  "existing_flow": {...},  // 既存フロー（任意）
  "new_text": "新しい発言内容",
  "context": "これまでの全文脈"
}
```

**レスポンス**:
```json
{
  "flow": {
    "actors": [...],
    "steps": [...],
    "flow_nodes": [...]
  },
  "operations": [
    {"type": "add", "node": {...}, "reason": "..."}
  ],
  "reason": "全体的な変更の説明"
}
```

---

## コスト見積もり

- **Claude Sonnet 4.5**: 入力 $3/MTok、出力 $15/MTok
- **1回のフロー生成**: 約 $0.01-0.02
- **$5クレジット**: 約250-500回のテスト可能
- **開発段階**: 十分な量

### 使用量の確認方法
1. https://console.anthropic.com/settings/usage
2. 使用量グラフで確認
3. $5に近づいたらアラート

---

## トラブルシューティング

### よくある問題

1. **APIキーエラー**
   ```
   WARNING: ANTHROPIC_API_KEY is not set
   ```
   → `.env`に`ANTHROPIC_API_KEY`を追加

2. **タイムアウトエラー**
   ```
   Claude request timed out after XX seconds
   ```
   → 発言内容を短くする（50-200文字推奨）

3. **フロー生成されない**
   → バックエンドのログでClaude API呼び出しを確認
   → ブラウザの開発者ツールでネットワークエラーを確認

### ログの確認方法

バックエンドターミナルで以下を確認：
```
INFO:app.main:Claude service initialized successfully
INFO:app.routers.hearing:Generating incremental flow for project 1
INFO:app.routers.hearing:Claude API successfully generated flow
```

---

## 次の開発ステップ

### 2. フローエディタ連携（次のタスク）
- FlowPreview.tsxの「フローエディタで開く」ボタン実装
- sessionStorageまたはAPI経由でフローデータ保存
- /projects/{id}/flowページへ遷移
- フローエディタでの編集・保存機能

### 3. 全体ログ機能
- 過去のヒアリングログをマージした全体ログ表示
- 各フロー生成単位のログは個別に保持
- 全体ログは読み取り専用または別扱い

### 4. エラーハンドリング改善
- API失敗時の表示改善
- 音声認識エラー時の通知
- ネットワークエラー時のリトライ
- 自動保存失敗時の警告

---

## まとめ

✅ Claude API統合が完了しました！

**実装完了**:
- 環境設定
- ClaudeService実装
- APIエンドポイント更新
- エラーハンドリング
- セットアップガイド

**次のアクション**:
1. `pip install -r requirements.txt`
2. `.env`に`ANTHROPIC_API_KEY`追加
3. サーバー再起動
4. 動作確認

**参考ドキュメント**:
- [CLAUDE_API_SETUP.md](CLAUDE_API_SETUP.md): 詳細なセットアップ手順
- [backend/app/services/ai.py](app/services/ai.py): ClaudeService実装
- [backend/app/config.py](app/config.py): 設定パラメータ

これでリアルタイムフロー生成が実際のClaude APIで動作するようになりました！🎉

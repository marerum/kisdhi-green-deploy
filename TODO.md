# 開発残課題メモ

## 更新日
2026/01/26 - **重要: データベーススキーマ不整合の問題発覚**

## リポジトリ情報
- **作業ブランチ**: `feature/realtime-flow-generation_for_deploy`
- **デプロイリポジトリ**: https://github.com/sekisho-0505/kishimen_deploy.git
- **旧リポジトリ**: https://github.com/isshy-sys/kishimen.git（参照用に保持）

## デプロイ環境情報
- **バックエンドリソース**: 
  - **Main**: tech0-gen-11-step3-2-py-71（mainブランチ - パスワード認証実装済み）
  - **Green**: tech0-gen-11-step3-2-py-71-green-kishimen-deploy（featureブランチ - シンプル認証）
- **フロントエンドリソース**: 
  - **Main**: tech0-gen-11-step3-2-node-71（mainブランチ）
  - **Green**: tech0-gen-11-step3-2-node-71-green-kishimen-deploy（featureブランチ - Azure Speech統合版）
- **データベース**: **共通のAzure MySQL**（両スロット共有 - これが問題の原因）
  - Host: rg-001-gen11-step3-class2.mysql.database.azure.com
  - Database: km_db
  - ⚠️ **重要**: mainスロットとgreenスロットが同じデータベースを共有
- **Azure Speech Service**:
  - リージョン: eastus
  - エンドポイント: https://af-gen11.cognitiveservices.azure.com/
  - 音声テキスト変換: https://eastus.stt.speech.microsoft.com

## 🚨 緊急課題: データベーススキーマ不整合

### 問題の概要
- **mainブランチ**: usersテーブルに `email`, `password_hash`, `is_active`, `reset_token`, `reset_token_expires` カラムあり（パスワード認証実装）
- **featureブランチ**: models.pyには `user_id`, `display_name` のみ定義（シンプル認証）
- **現状**: 共有データベースのusersテーブルがmainブランチの構造（password_hash NOT NULL等）
- **結果**: featureブランチのgreenスロットでINSERT失敗（`Field 'password_hash' doesn't have a default value`）

### 現在のusersテーブル構造（2026/01/26確認）
```sql
-- mainブランチで作成されたテーブル構造
id                   int          NOT NULL  PRI  auto_increment
user_id              varchar(255) NOT NULL  UNI
email                varchar(255) YES       UNI  -- mainブランチで追加
password_hash        varchar(255) NO             -- mainブランチで追加（NOT NULL!）
display_name         varchar(255) NO             -- mainブランチではNOT NULL
is_active            tinyint(1)   NO        1    -- mainブランチで追加
reset_token          varchar(255) YES       MUL  -- mainブランチで追加
reset_token_expires  datetime     YES            -- mainブランチで追加
created_at           datetime     NO        CURRENT_TIMESTAMP
updated_at           datetime     NO        CURRENT_TIMESTAMP on update
```

### featureブランチのmodels.py（簡易認証版）
```python
class User(Base):
    __tablename__ = "users"
    id: Mapped[int]
    user_id: Mapped[str]  # NOT NULL
    display_name: Mapped[Optional[str]]  # NULLABLE
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]
    # email, password_hash等は存在しない
```

### 解決策の選択肢

#### ❌ 選択肢1: データベースを変更する（非推奨）
- **リスク**: mainブランチの本番環境に影響
- **理由**: 共有データベースなので、greenスロット用に変更するとmainスロットが壊れる

#### ✅ 選択肢2: featureブランチのコードを修正する（推奨）
- **方針**: featureブランチのmodels.pyをmainブランチの構造に合わせる
- **作業内容**:
  1. `backend/app/models.py` の User クラスに欠けているカラムを追加
  2. すべてのカラムをNULLABLE（Optional）にして既存コードの互換性を保つ
  3. auth.pyでINSERT時に必要なデフォルト値を設定
- **利点**:
  - mainブランチに影響なし
  - データベース変更不要
  - featureブランチでログイン可能になる

#### 🔄 選択肢3: 将来の統合（推奨）
- **短期**: featureブランチのmodels.pyを修正してログイン可能にする
- **中期**: mainブランチからパスワード認証機能をマージ
- **長期**: 統一されたusersテーブル構造でmain/feature両方をサポート

---

## 0. 緊急対応（最優先）

### 0.1 featureブランチのmodels.py修正 ✅ 完了（2026/01/26）
- **説明**: データベーススキーマとコードの不整合を解消
- **必要な作業**:
  - [x] 現状確認: usersテーブルの実際の構造を確認（完了）
  - [x] 問題分析: mainブランチとfeatureブランチの違いを特定（完了）
  - [x] models.pyの修正: User クラスに欠けているカラムを追加
    - `email: Mapped[Optional[str]]`
    - `password_hash: Mapped[Optional[str]]`
    - `is_active: Mapped[Optional[bool]]`（デフォルト値対応）
    - `reset_token: Mapped[Optional[str]]`
    - `reset_token_expires: Mapped[Optional[datetime]]`
    - `display_name` をOptional[str]に修正
  - [x] auth.pyの修正: INSERT時に空文字列を設定（NOT NULL制約対応）
    - `password_hash=''` （空文字列でNOT NULL制約を満たす）
    - `email=''` （空文字列でNOT NULL制約を満たす）
    - `display_name=user_id` （user_idをデフォルト値として使用）
    - `is_active=True` （デフォルトで有効）
  - [x] ローカルテスト: ログイン機能の動作確認
  - [x] デプロイ: greenスロットへpush（コミット: 7109a5b, afcf688）
  - [x] 動作確認: Azure環境でログインテスト成功（ユーザー: mare1234）
- **完了日**: 2026/01/26 13:10 JST
- **デプロイ情報**:
  - Build ID: f9d82b1e84c1fc7a
  - Backend: tech0-gen-11-step3-2-py-71-green-kishimen-deploy
  - Frontend: tech0-gen-11-step3-2-node-71-green-kishimen-deploy
- **解決策の詳細**:
  - **問題**: データベースの`password_hash`と`email`カラムが`NOT NULL`制約を持っていた
  - **初期アプローチ**: `nullable=True`に変更しようとしたが、SQLAlchemyの制限によりDDLが実行されない
  - **最終解決策**: コードレベルで空文字列(`''`)を明示的に設定してNOT NULL制約を満たす
  - **利点**: データベース構造を変更せず、mainブランチに影響なし
- **制約**: 
  - **mainブランチのデータベースに影響を与えないこと** ✅ 達成
  - マイグレーションスクリプトを実行しないこと ✅ 達成
  - データベース構造の変更をしないこと ✅ 達成
- **完了条件**:
  - ✅ featureブランチのgreenスロットでmare1234がログインできる
  - ✅ mainブランチのmainスロットに影響なし
  - ✅ Projects APIが正常動作（200 OK）

### 0.2 パフォーマンス最適化（任意）
- **説明**: Azure App Serviceのコールドスタート対策
- **現状**: 初回リクエスト時に30-40秒の起動時間が発生
- **原因**: アイドル状態後のアプリケーション起動（Python依存関係の読み込み + データベース接続確立）
- **影響**: ログイン時のレスポンス遅延（機能的には問題なし）
- **対策オプション**:
  - [ ] Azure App Serviceの「Always On」設定を有効化（Basic tier以上が必要）
  - [ ] Application Insightsでパフォーマンス監視
  - [ ] ヘルスチェックエンドポイントへの定期的なウォーミングリクエスト
- **優先度**: 低（機能は正常動作しており、ユーザー体験への影響は限定的）
- **備考**: mainブランチの認証方式に変更しても、コールドスタートの問題は解決しない（Azure プラットフォームの動作特性）

---

## 1. 優先度: 高

### 1.1 フローエディタ連携 ✅ ほぼ完了（2026/01/23）
- **説明**: 生成されたフローをビジュアルエディタで編集可能にする
- **必要な作業**:
  - [x] ReactFlowコンポーネントの実装
  - [x] 生成されたフローデータのReactFlow形式への変換
  - [x] ノードのドラッグ&ドロップ機能
  - [x] エッジの追加・削除機能
  - [x] 編集結果のバックエンド保存API（ノード・エッジの個別保存）
  - [x] 手動編集の保持機能（flow_edgesテーブル実装）
  - [ ] 自動レイアウト調整（dagre.js等）※残タスク
- **見積もり**: 1-2日（自動レイアウトのみ）
- **完了内容**: 
  - エッジ保存機能実装（from_node_order/to_node_order方式）
  - リロード後もノードとエッジが復元される
  - フロー再生成時に手動編集が保持される

### 1.2 全体ログ機能
- **説明**: 複数のヒアリングログをマージして全体フローを表示
- **必要な作業**:
  - [ ] ログマージAPIの実装
  - [ ] 重複ノード・エッジの統合ロジック
  - [ ] タイムスタンプベースの並び替え
  - [ ] UI: 全体ログビュー画面
- **見積もり**: 2-3日

### 1.3 エラーハンドリング改善
- **説明**: より詳細なエラーメッセージと自動回復処理
- **必要な作業**:
  - [ ] Claude API エラーの詳細分類
  - [ ] リトライロジックの実装（Exponential Backoff）
  - [ ] ユーザー向けエラーメッセージの多言語対応
  - [ ] フォールバック機能（Claude失敗時のダミーデータ生成）
- **見積もり**: 1-2日

### 1.4 Azure Speech Service移行 ✅ 完了（2026/01/25）
- **説明**: Web Speech APIからAzure Speech Serviceへ移行してリアルタイム音声認識の精度向上
- **必要な作業**:
  - [x] Azure Speech Serviceのアカウント・リソース作成（AI Foundry統合）
  - [x] APIキーと環境変数の設定（eastusリージョン）
  - [x] フロントエンドでAzure Speech SDKの統合（microsoft-cognitiveservices-speech-sdk）
  - [x] リアルタイムストリーミング認識の実装（useAzureSpeechカスタムフック）
  - [x] 中間結果（Recognizing）と確定結果（Recognized）の処理分離
  - [x] 既存のWeb Speech API実装からの切り替え機能（プロバイダー切り替えボタン）
  - [x] 日本語認識の最適化設定（ja-JP）
  - [x] エラーハンドリングとフォールバック（Web Speech APIへ）
  - [x] ローカル動作テスト完了
- **完了内容**:
  - Azure Speech優先、Web Speech APIフォールバックのハイブリッド実装
  - UIでプロバイダー状態表示と切り替え機能
  - リアルタイム音声認識が正常動作確認済み
- **次のステップ**: Greenスロットへのデプロイ

### 1.5 Azureデプロイ準備
- **説明**: アプリケーション全体をAzureにデプロイするための準備
- **必要な作業**:
  - [ ] Azure App Service / Azure Container Appsの選定
  - [ ] バックエンド（FastAPI）のDockerコンテナ化
  - [ ] フロントエンド（Next.js）のビルド最適化
  - [ ] Azure Database for MySQL（または既存MySQL）への接続設定
  - [ ] 環境変数とシークレット管理（Azure Key Vault）
  - [ ] Azure CDNの設定（静的アセット配信）
  - [ ] デプロイスクリプトの作成（CI/CD）
  - [ ] Azure Monitor / Application Insightsの統合
  - [ ] カスタムドメインとSSL証明書の設定
  - [ ] 本番環境用のセキュリティ設定（CORS、認証、WAF）
- **見積もり**: 4-6日
- **関連リソース**:
  - Azure App Service（バックエンド）
  - Azure Static Web Apps または App Service（フロントエンド）
  - Azure Database for MySQL
  - Azure Speech Service
  - Azure Key Vault
  - Azure Monitor

---

## 2. 優先度: 中

### 2.1 コスト管理機能
- **説明**: API使用量の可視化と予算アラート
- **必要な作業**:
  - [ ] トークン数カウント機能
  - [ ] 使用量の日次/月次集計
  - [ ] 管理画面での使用量グラフ表示
  - [ ] 予算超過時のメール通知
- **見積もり**: 2-3日

### 2.2 音声認識精度向上
- **説明**: 専門用語や固有名詞の認識精度を上げる
- **必要な作業**:
  - [ ] カスタム辞書機能の追加
  - [ ] 業界別ボキャブラリーの準備
  - [ ] 音声認識結果の手動修正UI
  - [ ] 修正データのフィードバックループ
- **見積もり**: 3-4日

### 2.3 テストカバレッジ向上
- **説明**: ユニットテスト・統合テストの追加
- **必要な作業**:
  - [ ] Claude APIのモック実装
  - [ ] フロー生成ロジックのユニットテスト
  - [ ] E2Eテスト（Playwright）
  - [ ] CI/CDパイプラインへの組み込み
- **見積もり**: 3-5日

---

## 3. 優先度: 低（将来的な拡張）

### 3.1 マルチユーザー対応
- **説明**: 複数ユーザーの同時利用とアクセス制御
- **必要な作業**:
  - [ ] 認証・認可システム（JWT）
  - [ ] ユーザー管理画面
  - [ ] プロジェクトの共有機能
  - [ ] ロールベースアクセス制御（RBAC）
- **見積もり**: 5-7日

### 3.2 フローテンプレート機能
- **説明**: よく使うフローパターンをテンプレート化
- **必要な作業**:
  - [ ] テンプレート登録API
  - [ ] テンプレートライブラリUI
  - [ ] テンプレートからの新規フロー作成
  - [ ] コミュニティテンプレートの共有
- **見積もり**: 3-4日

### 3.3 エクスポート機能
- **説明**: フローを各種形式でエクスポート
- **必要な作業**:
  - [ ] PNG/SVG画像出力
  - [ ] PDF出力（日本語フォント対応）
  - [ ] BPMN形式エクスポート
  - [ ] Mermaid記法エクスポート
- **見積もり**: 2-3日

### 3.4 バージョン管理
- **説明**: フローの変更履歴管理
- **必要な作業**:
  - [ ] フローのスナップショット保存
  - [ ] 差分表示機能
  - [ ] 任意のバージョンへのロールバック
  - [ ] ブランチ機能（並行編集）
- **見積もり**: 4-6日

### 3.5 ログイン機能の強化（mainブランチとの統合）
- **説明**: シンプル認証からパスワード認証への移行（mainブランチの実装を統合）
- **必要な作業**:
  - [ ] データベーススキーマのマイグレーション（email, password_hash, is_active, reset_token, reset_token_expires カラム追加）
  - [ ] 既存ユーザーデータのマイグレーション（デフォルトパスワード設定）
  - [ ] バックエンド: パスワード検証ロジック追加（`backend/app/utils/auth.py`）
  - [ ] バックエンド: auth.pyエンドポイント更新（パスワード認証、リセット機能）
  - [ ] 依存パッケージ追加（passlib, python-jose等）
  - [ ] フロントエンド: NextAuth.js統合
  - [ ] フロントエンド: 新しい認証フォーム（register, forgot-password, reset-password）
  - [ ] AuthContextの書き換え
  - [ ] 全機能の動作確認（認証フローの変更による影響確認）
- **見積もり**: 3-4日
- **優先度**: Azure移行完了後、mainブランチへのマージ前に実施
- **注意点**: 
  - 現在のブランチはフローエディタ機能（flow_edges, position_x/y）で先行
  - mainブランチは認証機能で先行
  - マイグレーションは慎重に実施（既存ユーザーデータの保護）

### 3.6 高度なフロー生成機能（将来の拡張）
- **説明**: 文脈理解による高度なフロー生成（分岐・挿入・並行処理）
- **必要な作業（フェーズ1: 手動挿入）**:
  - [ ] ノード選択UIの実装（「ここに挿入」ボタン）
  - [ ] 挿入位置を指定するAPI拡張
  - [ ] Claude APIに挿入位置を明示的に伝えるプロンプト設計
  - [ ] エッジの再計算・再接続ロジック
  - **見積もり**: 2-3日
- **必要な作業（フェーズ2: 文脈理解による自動挿入）**:
  - [ ] Claude APIに全フローコンテキストを渡す機能
  - [ ] 挿入位置判定プロンプトの設計
  - [ ] 挿入候補の複数提示UI
  - [ ] ユーザー確認フロー
  - **見積もり**: 3-4日
- **必要な作業（フェーズ3: 分岐フロー生成）**:
  - [ ] 条件分岐（if/else）の自動生成
  - [ ] 並行処理フローの生成
  - [ ] 分岐・合流ノードの特殊UI
  - [ ] DAG（有向非巡回グラフ）構造への対応
  - **見積もり**: 4-5日
- **優先度**: MVP完了後（Azure移行後）に検討
- **技術的課題**:
  - 線形構造から木構造（DAG）への移行
  - フロー分岐時のエッジ管理複雑化
  - ユーザー体験の設計（挿入位置の指定方法）

---

## 4. 技術的改善

### 4.1 パフォーマンス最適化
- [ ] Claude APIレスポンスのキャッシュ機構
- [ ] データベースクエリの最適化（インデックス追加）
- [ ] フロントエンドのコード分割（Code Splitting）
- [ ] 画像の遅延読み込み（Lazy Loading）

### 4.2 セキュリティ強化
- [ ] APIキーの暗号化保存
- [ ] CORS設定の厳格化
- [ ] SQLインジェクション対策の再確認
- [ ] XSS対策の追加

### 4.3 ドキュメント整備
- [ ] API仕様書（OpenAPI/Swagger）
- [ ] アーキテクチャ図の作成
- [ ] デプロイ手順書
- [ ] ユーザーマニュアル

### 4.4 Azure関連の技術的改善
- [ ] Azure Application Insightsでのログ・メトリクス収集
- [ ] Azure Front Doorでのグローバル配信最適化
- [ ] Azure CDNでの静的コンテンツキャッシュ
- [ ] Azure Cognitive Servicesの他機能検討（翻訳、テキスト分析）
- [ ] Azure DevOpsでのCI/CDパイプライン構築
- [ ] Azure Cost Managementでのコスト監視設定

### 4.5 mainブランチとのコード差分管理
- [ ] 定期的なmainブランチとの差分確認
- [ ] 認証機能以外の有用な変更の取り込み
- [ ] コンフリクト解消戦略の策定

---

## 5. 既知の問題

### 5.1 Claude API関連
- **問題**: 長い発言（200文字以上）でタイムアウトが発生
  - **影響度**: 中
  - **暫定対処**: 発言を短く区切るようユーザーに案内
  - **恒久対策**: ストリーミングレスポンスの実装

### 5.2 音声認識関連
- **問題**: 専門用語の誤認識が多い
  - **影響度**: 中
  - **暫定対処**: 手動修正を促す
  - **恒久対策**: カスタム辞書機能の実装（2.2参照）

### 5.3 UI/UX関連
- **問題**: フロープレビューが複雑なフローで見づらい
  - **影響度**: 低
  - **暫定対処**: ズーム機能で対応
  - **恒久対策**: 自動レイアウト調整機能（1.1参照）

### 5.4 フローエディタのエッジ再接続機能
- **問題**: ReactFlow 11.10.4では既存の線（エッジ）を直接ドラッグして別のノードに付け替えることができない
  - **影響度**: 中
  - **現在の動作**: エッジを削除してから新規作成する方式
  - **暫定対処**: ユーザーに「Delete→再作成」の操作フローを案内
  - **恒久対策（候補）**:
    1. **ReactFlowのバージョンアップ**: v11.11以降またはv12以降で`reconnectable`プロパティと再接続イベント（`onReconnect`等）がサポートされている可能性あり
    2. **カスタムエッジタイプの実装**: ReactFlowのカスタムエッジ機能を使い、エッジに独自の再接続ロジックを実装
    3. **ライブラリ変更**: React Flow以外のフローエディタライブラリ（例：react-diagrams）の検討
    4. **手動実装**: エッジのドラッグイベントをフックして、state更新で再接続をシミュレート
  - **推奨アプローチ**: まずReactFlowのバージョンアップを試し、それでも未対応なら2のカスタムエッジ実装を検討
  - **見積もり**: 1-2日（バージョンアップ）、3-4日（カスタム実装）

### 5.5 Azure Speech Service関連
- **問題**: Web Speech APIは専門用語の誤認識が多く、ブラウザ依存
  - **影響度**: 中
  - **暫定対処**: 手動修正を促す
  - **恒久対策**: Azure Speech Serviceへの移行（1.4参照）
  - **見積もり**: 2-3日

---

## 6. Azure移行のロードマップ

### フェーズ1: Azure Speech Service統合（優先）
1. Azure Portalでリソース作成
2. フロントエンドでSDK統合
3. リアルタイムストリーミング実装
4. 動作確認とパフォーマンステスト
- **期間**: 2-3日

### フェーズ2: Azureインフラ準備
1. リソースグループとネットワーク設計
2. Azure Database for MySQLのセットアップ
3. Key Vaultでのシークレット管理
4. 開発環境でのAzure接続テスト
- **期間**: 2-3日

### フェーズ3: アプリケーションのコンテナ化
1. バックエンドのDockerfile作成
2. フロントエンドのビルド最適化
3. docker-compose.ymlの作成
4. ローカルでのコンテナ動作確認
- **期間**: 1-2日

### フェーズ4: Azureデプロイ
1. Azure Container Registry（ACR）へのイメージプッシュ
2. App ServiceまたはContainer Appsへのデプロイ
3. 環境変数とネットワーク設定
4. 本番環境での動作確認
- **期間**: 2-3日

### フェーズ5: 監視とCI/CD
1. Application Insightsの統合
2. GitHub ActionsまたはAzure DevOps設定
3. 自動デプロイパイプライン構築
4. アラート設定とログ監視
- **期間**: 2-3日

**合計見積もり**: 9-14日

---

## 7. mainブランチとの差異（2026/01/24確認）

### データベーススキーマの差異

#### **users テーブル**
| カラム | 現在のブランチ | mainブランチ | 対応 |
|--------|---------------|-------------|------|
| `user_id` | ✅ あり | ✅ あり | 同一 |
| `display_name` | ✅ あり（nullable） | ✅ あり（NOT NULL） | 微差 |
| `email` | ❌ なし | ✅ あり（UNIQUE, NOT NULL） | **要追加** |
| `password_hash` | ❌ なし | ✅ あり（NOT NULL） | **要追加** |
| `is_active` | ❌ なし | ✅ あり（BOOLEAN, デフォルトTRUE） | **要追加** |
| `reset_token` | ❌ なし | ✅ あり（nullable） | **要追加** |
| `reset_token_expires` | ❌ なし | ✅ あり（DateTime, nullable） | **要追加** |

#### **flow_nodes テーブル**
| カラム | 現在のブランチ | mainブランチ | 対応 |
|--------|---------------|-------------|------|
| `position_x` | ✅ あり（Integer, nullable） | ❌ なし | **現ブランチ優位** |
| `position_y` | ✅ あり（Integer, nullable） | ❌ なし | **現ブランチ優位** |

#### **flow_edges テーブル**
| テーブル | 現在のブランチ | mainブランチ | 対応 |
|----------|---------------|-------------|------|
| `flow_edges` | ✅ 完全実装 | ❌ なし | **現ブランチ優位** |

### 機能差異

#### **認証機能**
- **現在のブランチ**: シンプルなユーザーID認証（パスワード不要、自動登録）
- **mainブランチ**: パスワード認証 + NextAuth.js統合、登録/ログイン/パスワードリセット機能

#### **フローエディタ機能**
- **現在のブランチ**: 完全実装（ReactFlow、ノード位置保存、エッジ保存、ドラッグ&ドロップ）
- **mainブランチ**: 未実装

### 統合方針
1. **Azure移行完了後**にmainブランチの認証機能を統合（セクション3.5参照）
2. 現在のブランチのフローエディタ機能はそのまま保持
3. マイグレーションスクリプトで既存ユーザーデータを保護しながらスキーマ変更
4. mainブランチへのマージ前に統合テストを実施

---

## 8. 次回ミーティングアジェンダ

1. Azure Speech Service移行の優先度確認 → **確定: MVP実装に含める**
2. Azureデプロイのタイムライン策定 → **確定: 7日間、5ステップ**
3. コスト見積もりの確認（Azure各種サービス） → **確定: 約¥2,700/月**
4. フローエディタ連携の設計レビュー → **完了: エッジ保存機能実装済み**
5. mainブランチとの統合タイミング確認 → **確定: Azure移行後、マージ前に実施**
6. テスト戦略の決定

---

## 9. 完了タスク（最近の履歴）

### 2026/01/25
- ✅ Azure Speech Service SDK インストール（microsoft-cognitiveservices-speech-sdk）
- ✅ useAzureSpeech カスタムフック作成（リアルタイムストリーミング認識対応）
- ✅ HearingInput コンポーネントに Azure Speech 統合
- ✅ Azure Speech と Web Speech API のハイブリッド実装
- ✅ プロバイダー切り替え機能実装（UI右上の切替ボタン）
- ✅ ローカル動作テスト完了（音声入力→Azure Speech→テキスト変換）
- ✅ Web Speech API フォールバック動作確認
- ✅ 環境変数設定（NEXT_PUBLIC_AZURE_SPEECH_KEY, NEXT_PUBLIC_AZURE_SPEECH_REGION）
- ✅ Azure AI Foundry リソース情報取得（eastus リージョン）

### 2026/01/24
- ✅ .kiroディレクトリおよび不要なテスト/デバッグファイル削除
- ✅ .gitignore更新（テスト/デバッグファイルパターン追加）
- ✅ 新しいデプロイリポジトリへの移行（sekisho-0505/kishimen_deploy.git）
- ✅ mainブランチとの差異確認（認証機能、データベーススキーマ）
- ✅ TODO.md最新化（mainブランチ統合計画、リポジトリ情報更新）

### 2026/01/23
- ✅ flow_edgesテーブル実装とマイグレーション
- ✅ エッジ保存・取得API実装
- ✅ フロントエンド: flowConverter.tsでエッジ変換対応
- ✅ TODO.mdにAzure関連タスク追加（1.4, 1.5, 4.4, 5.5, セクション6）
- ✅ MVP実装計画策定（7日間、5ステップ、コスト見積もり）

---

## メモ

- Claude Sonnet 4.5の料金体系を考慮し、開発段階では短いテストを推奨
- 初回$5クレジットで約250-500回のテスト可能
- 本番運用前にコスト管理機能の実装を検討すべき
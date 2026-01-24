# Python仮想環境セットアップガイド

**作成日**: 2026/01/20  
**目的**: プロジェクト専用の独立したPython環境を作成し、依存関係の衝突を回避

---

## なぜ仮想環境が必要か？

現在の問題：
- グローバルPython環境に`langchain-openai`がインストール済み
- `langchain-openai`は`openai>=1.104.2`を要求
- このプロジェクトは`openai==1.104.2`を使用（更新済み）
- 仮想環境で分離することで、他のプロジェクトとの衝突を回避

---

## セットアップ手順

### 1. 仮想環境の作成

```powershell
# backendディレクトリに移動
cd backend

# 仮想環境を作成（venvという名前で）
python -m venv venv
```

### 2. 仮想環境の有効化

```powershell
# PowerShellの場合
.\venv\Scripts\Activate.ps1

# （注意）実行ポリシーエラーが出た場合：
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
# その後、再度有効化コマンドを実行
```

**有効化成功の確認**:
プロンプトの先頭に`(venv)`が表示される：
```powershell
(venv) PS C:\Users\gp02m\Tech0\Kishimen\kishimen\backend>
```

### 3. 依存関係のインストール

```powershell
# 仮想環境内でインストール（venvが有効化されていることを確認）
pip install --upgrade pip
pip install -r requirements.txt
```

### 4. インストール確認

```powershell
# インストールされたパッケージを確認
pip list

# openaiとanthropicが正しくインストールされていることを確認
pip show openai
pip show anthropic
```

### 5. サーバーの起動

```powershell
# 仮想環境内でサーバーを起動（venvが有効化されていることを確認）
uvicorn app.main:app --reload
```

---

## 日常的な使用方法

### 毎回の作業開始時

```powershell
# 1. backendディレクトリに移動
cd backend

# 2. 仮想環境を有効化
.\venv\Scripts\Activate.ps1

# 3. サーバー起動（または他の作業）
uvicorn app.main:app --reload
```

### 仮想環境の無効化

```powershell
# 仮想環境を終了
deactivate
```

---

## トラブルシューティング

### 問題1: 実行ポリシーエラー

**症状**:
```
.\venv\Scripts\Activate.ps1 : このシステムではスクリプトの実行が無効になっているため...
```

**解決方法**:
```powershell
# PowerShellを管理者として実行する必要はありません
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

その後、再度有効化コマンドを実行。

### 問題2: 仮想環境が有効化されているか不明

**確認方法**:
```powershell
# Pythonのパスを確認
Get-Command python | Select-Object Source
```

仮想環境内の場合：
```
C:\Users\gp02m\Tech0\Kishimen\kishimen\backend\venv\Scripts\python.exe
```

グローバル環境の場合：
```
C:\Users\gp02m\AppData\Local\Programs\Python\Python311\python.exe
```

### 問題3: 依存関係のインストールに失敗

**対処法**:
```powershell
# pipを最新版にアップグレード
python -m pip install --upgrade pip

# キャッシュをクリアして再インストール
pip cache purge
pip install -r requirements.txt
```

### 問題4: VS Codeで仮想環境が認識されない

**対処法**:
1. VS Codeを開く
2. `Ctrl + Shift + P` → "Python: Select Interpreter"
3. `.\venv\Scripts\python.exe`を選択
4. VS Codeのターミナルを再起動

---

## .gitignoreの設定

仮想環境はGitにコミットしないように設定済み：

```gitignore
# Python仮想環境
venv/
env/
ENV/
```

チームメンバーは各自で仮想環境を作成します。

---

## よくある質問

### Q1: 仮想環境を作り直したい

```powershell
# 1. 仮想環境を無効化
deactivate

# 2. venvフォルダを削除
Remove-Item -Recurse -Force venv

# 3. 新しい仮想環境を作成
python -m venv venv

# 4. 有効化してインストール
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Q2: グローバル環境に戻りたい

```powershell
# 仮想環境を無効化するだけ
deactivate
```

### Q3: 複数のターミナルで同時に使える？

はい。各ターミナルで個別に仮想環境を有効化してください。

### Q4: 他のメンバーとの共有方法は？

- `requirements.txt`をGitにコミット
- 各メンバーが自分で仮想環境を作成
- `pip install -r requirements.txt`で同じ環境を再現

---

## チェックリスト

- [ ] 仮想環境を作成（`python -m venv venv`）
- [ ] 仮想環境を有効化（`.\venv\Scripts\Activate.ps1`）
- [ ] プロンプトに`(venv)`が表示されている
- [ ] pipをアップグレード（`pip install --upgrade pip`）
- [ ] 依存関係をインストール（`pip install -r requirements.txt`）
- [ ] openai==1.104.2がインストールされている
- [ ] anthropic==0.39.0がインストールされている
- [ ] サーバーが起動できる（`uvicorn app.main:app --reload`）
- [ ] Claude Service初期化成功のログが表示される

---

## まとめ

✅ **仮想環境の作成完了後**:
1. 依存関係の衝突が解消される
2. プロジェクト専用の独立した環境
3. グローバル環境に影響を与えない
4. チームメンバーと同じ環境を共有可能

✅ **次のステップ**:
1. `.env`に`ANTHROPIC_API_KEY`を追加
2. サーバー起動と動作確認

**重要**: 今後の作業は必ず仮想環境を有効化してから行ってください！

"""
Azure MySQL用マイグレーションスクリプト
既存のAzure MySQLに対してスキーママイグレーションを実行します
"""
import pymysql
import sys
import os
from pathlib import Path

# 接続情報
DB_CONFIG = {
    'host': 'rg-001-gen11-step3-class2.mysql.database.azure.com',
    'port': 3306,
    'user': 'tech0gen11',
    'password': 'Students11',
    'database': 'km_db',
    'ssl': {'ssl_disabled': False},
    'charset': 'utf8mb4'
}

# マイグレーションファイル
MIGRATIONS = [
    'migrations/add_flow_edges_table.sql',
    'migrations/add_position_to_flow_nodes.sql'
]

def run_migration():
    """マイグレーションを実行"""
    print("=" * 60)
    print("Azure MySQL スキーママイグレーション")
    print("=" * 60)
    print(f"接続先: {DB_CONFIG['host']}")
    print(f"データベース: {DB_CONFIG['database']}")
    print()
    
    try:
        # Azure MySQLに接続
        print("Azure MySQLに接続中...")
        connection = pymysql.connect(**DB_CONFIG)
        cursor = connection.cursor()
        print("✅ 接続成功\n")
        
        # 現在のテーブル一覧を確認
        print("現在のテーブル一覧:")
        cursor.execute("SHOW TABLES")
        tables = cursor.fetchall()
        for table in tables:
            print(f"  - {table[0]}")
        print()
        
        # 各マイグレーションを実行
        for migration_file in MIGRATIONS:
            migration_path = Path(__file__).parent / migration_file
            
            if not migration_path.exists():
                print(f"❌ マイグレーションファイルが見つかりません: {migration_file}")
                continue
            
            print(f"実行中: {migration_file}")
            print("-" * 60)
            
            # SQLファイルを読み込み
            with open(migration_path, 'r', encoding='utf-8') as f:
                sql_content = f.read()
            
            # MySQLのCOMMENT構文を削除（MySQL 5.7/8.0の標準構文ではない）
            sql_statements = []
            for line in sql_content.split('\n'):
                # COMMENT ON構文をスキップ
                if line.strip().startswith('COMMENT ON'):
                    continue
                # コメント行をスキップ
                if line.strip().startswith('--'):
                    continue
                if line.strip():
                    sql_statements.append(line)
            
            sql_content = '\n'.join(sql_statements)
            
            # セミコロンで分割して各ステートメントを実行
            statements = [s.strip() for s in sql_content.split(';') if s.strip()]
            
            for statement in statements:
                if statement:
                    try:
                        cursor.execute(statement)
                        print(f"✅ 実行成功")
                    except pymysql.Error as e:
                        # カラムやテーブルが既に存在する場合はスキップ
                        if 'Duplicate column name' in str(e) or 'already exists' in str(e):
                            print(f"⚠️  既に存在します（スキップ）: {e}")
                        else:
                            raise
            
            connection.commit()
            print()
        
        # マイグレーション後のテーブル構造を確認
        print("=" * 60)
        print("マイグレーション後の確認")
        print("=" * 60)
        
        # flow_edgesテーブルの確認
        print("\n✅ flow_edgesテーブル:")
        try:
            cursor.execute("DESCRIBE flow_edges")
            columns = cursor.fetchall()
            for col in columns:
                print(f"  {col[0]} - {col[1]}")
        except pymysql.Error as e:
            print(f"  ❌ テーブルが存在しません: {e}")
        
        # flow_nodesテーブルの確認
        print("\n✅ flow_nodesテーブル (position追加確認):")
        try:
            cursor.execute("DESCRIBE flow_nodes")
            columns = cursor.fetchall()
            position_columns = [col for col in columns if 'position' in col[0]]
            if position_columns:
                for col in position_columns:
                    print(f"  {col[0]} - {col[1]}")
            else:
                print("  ⚠️  position_x, position_y カラムが見つかりません")
        except pymysql.Error as e:
            print(f"  ❌ テーブルが存在しません: {e}")
        
        print("\n" + "=" * 60)
        print("✅ マイグレーション完了")
        print("=" * 60)
        
        cursor.close()
        connection.close()
        
        return True
        
    except pymysql.Error as e:
        print(f"\n❌ データベースエラー: {e}")
        return False
    except Exception as e:
        print(f"\n❌ エラー: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)

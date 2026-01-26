#!/usr/bin/env python3
"""
Fix users table schema to match application model
"""
import pymysql
import sys

def fix_schema():
    """Fix the users table schema"""
    try:
        print("Connecting to Azure MySQL...")
        connection = pymysql.connect(
            host="rg-001-gen11-step3-class2.mysql.database.azure.com",
            user="tech0gen11",
            password="Students11",
            database="km_db",
            port=3306,
            ssl={'ssl': True}
        )
        print("✓ Connected successfully!\n")

        cursor = connection.cursor()
        
        print("=== Checking current schema ===")
        cursor.execute("DESCRIBE users")
        before_columns = cursor.fetchall()
        
        print("Current problematic columns:")
        for col in before_columns:
            field_name = col[0]
            nullable = col[2]
            if nullable == 'NO' and field_name in ['password_hash', 'display_name']:
                print(f"  - {field_name}: NOT NULL")
        
        print("\n=== Executing fixes ===")
        
        # Fix 1: Make display_name nullable
        print("1. Making display_name NULLABLE...")
        cursor.execute("ALTER TABLE users MODIFY COLUMN display_name VARCHAR(255) NULL")
        print("   ✓ Done")
        
        # Fix 2: Make password_hash nullable
        print("2. Making password_hash NULLABLE...")
        cursor.execute("ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(255) NULL")
        print("   ✓ Done")
        
        connection.commit()
        print("\n✓ All fixes applied successfully!")
        
        print("\n=== Verifying changes ===")
        cursor.execute("DESCRIBE users")
        after_columns = cursor.fetchall()
        
        print("Updated columns:")
        for col in after_columns:
            field_name = col[0]
            nullable = col[2]
            if field_name in ['password_hash', 'display_name', 'user_id', 'email']:
                status = "✓" if nullable == 'YES' or field_name == 'user_id' else "⚠️"
                print(f"  {status} {field_name}: {nullable}")
        
        cursor.close()
        connection.close()
        
        print("\n✓ Schema fix completed successfully!")
        return True
        
    except pymysql.MySQLError as e:
        print(f"❌ MySQL Error: {e}")
        if connection:
            connection.rollback()
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {e}")
        if connection:
            connection.rollback()
        sys.exit(1)

if __name__ == "__main__":
    fix_schema()
    print("\n=== Next Steps ===")
    print("Test login with user_id: mare1234")
    print("Backend should now accept INSERT without password_hash and display_name can be NULL")

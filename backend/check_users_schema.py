#!/usr/bin/env python3
"""
Check current users table schema in Azure MySQL
"""
import pymysql
import sys

def check_schema():
    """Check the current users table schema"""
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
        
        # Check users table structure
        print("=== Users Table Structure ===")
        cursor.execute("DESCRIBE users")
        columns = cursor.fetchall()
        
        print(f"{'Field':<20} {'Type':<20} {'Null':<8} {'Key':<8} {'Default':<15} {'Extra'}")
        print("-" * 90)
        for col in columns:
            print(f"{col[0]:<20} {col[1]:<20} {col[2]:<8} {col[3]:<8} {str(col[4]):<15} {col[5]}")
        
        print("\n=== Problem Analysis ===")
        problematic_columns = []
        for col in columns:
            field_name = col[0]
            nullable = col[2]  # YES or NO
            default = col[4]
            
            # Check if column is NOT NULL without default
            if nullable == 'NO' and default is None and field_name != 'id':
                # Skip columns that are in the model
                if field_name not in ['user_id', 'created_at', 'updated_at']:
                    problematic_columns.append(field_name)
        
        if problematic_columns:
            print(f"⚠️  Found problematic columns (NOT NULL without default, not in model):")
            for col in problematic_columns:
                print(f"   - {col}")
        else:
            print("✓ No problematic columns found")
        
        cursor.close()
        connection.close()
        
        return problematic_columns
        
    except pymysql.MySQLError as e:
        print(f"❌ MySQL Error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    problematic = check_schema()
    if problematic:
        print(f"\n=== Recommendation ===")
        print("Option 1 (Recommended): Remove unused columns")
        for col in problematic:
            print(f"  ALTER TABLE users DROP COLUMN {col};")
        print("\nOption 2 (Alternative): Make columns nullable")
        for col in problematic:
            print(f"  ALTER TABLE users MODIFY COLUMN {col} VARCHAR(255) NULL;")
    else:
        print("\n✓ Schema is consistent with application model")

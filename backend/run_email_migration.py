"""
Run migration to make users.email column nullable.
"""

import pymysql
import sys

# Azure MySQL connection settings
HOST = "rg-001-gen11-step3-class2.mysql.database.azure.com"
USER = "tech0gen11"
PASSWORD = "Students11"
DATABASE = "km_db"
PORT = 3306

def run_migration():
    """Execute the email nullable migration."""
    print("Connecting to Azure MySQL...")
    
    try:
        connection = pymysql.connect(
            host=HOST,
            user=USER,
            password=PASSWORD,
            database=DATABASE,
            port=PORT,
            ssl={'ssl': True}
        )
        
        print("Connected successfully!")
        
        with connection.cursor() as cursor:
            # Check current email column definition
            print("\nChecking current users table structure...")
            cursor.execute("SHOW COLUMNS FROM users WHERE Field = 'email'")
            result = cursor.fetchone()
            
            if result:
                print(f"Current email column: {result}")
            else:
                print("Email column does not exist - no migration needed")
                connection.close()
                return
            
            # Execute migration
            print("\nExecuting migration: Making email column nullable...")
            sql = "ALTER TABLE users MODIFY COLUMN email VARCHAR(255) NULL"
            cursor.execute(sql)
            connection.commit()
            print("✓ Migration executed successfully!")
            
            # Verify change
            print("\nVerifying column change...")
            cursor.execute("SHOW COLUMNS FROM users WHERE Field = 'email'")
            result = cursor.fetchone()
            print(f"Updated email column: {result}")
            
        connection.close()
        print("\n✓ Migration completed successfully!")
        
    except pymysql.Error as e:
        print(f"\n✗ Database error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_migration()

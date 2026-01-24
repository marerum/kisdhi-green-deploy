"""
Migration script to add position fields to flow_nodes table.
Run this script to update the database schema.
"""
from app.database import engine
from sqlalchemy import text

def run_migration():
    with engine.connect() as conn:
        # Read SQL migration file
        with open('migrations/add_position_to_flow_nodes.sql', 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        # Split into individual statements (ignore comments)
        statements = []
        for line in sql_content.split('\n'):
            line = line.strip()
            if line and not line.startswith('--') and not line.startswith('COMMENT'):
                statements.append(line)
        
        # Execute ALTER TABLE statements
        try:
            conn.execute(text("ALTER TABLE flow_nodes ADD COLUMN position_x REAL"))
            print("✓ Added position_x column")
        except Exception as e:
            print(f"Note: position_x column may already exist - {e}")
        
        try:
            conn.execute(text("ALTER TABLE flow_nodes ADD COLUMN position_y REAL"))
            print("✓ Added position_y column")
        except Exception as e:
            print(f"Note: position_y column may already exist - {e}")
        
        conn.commit()
        print("\n✓ Migration completed successfully!")

if __name__ == "__main__":
    run_migration()

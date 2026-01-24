"""
Run migration to add flow_edges table.
"""
import sys
from pathlib import Path

# Add the parent directory to the path to import app modules
sys.path.append(str(Path(__file__).parent))

from app.database import engine
from sqlalchemy import text

def run_migration():
    """Execute the flow_edges migration."""
    migration_file = Path(__file__).parent / "migrations" / "add_flow_edges_table.sql"
    
    print(f"Reading migration file: {migration_file}")
    with open(migration_file, 'r', encoding='utf-8') as f:
        sql = f.read().strip()
    
    print("Executing migration...")
    with engine.connect() as conn:
        conn.execute(text(sql))
        conn.commit()
    
    print("✅ Migration executed successfully!")
    print("flow_edges table created with indexes")

if __name__ == "__main__":
    run_migration()

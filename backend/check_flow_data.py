"""
Check flow node data for HTTP URLs
"""
import os
import mysql.connector
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database configuration
db_config = {
    'host': os.getenv('DATABASE_HOST'),
    'user': os.getenv('DATABASE_USER'),
    'password': os.getenv('DATABASE_PASSWORD'),
    'database': os.getenv('DATABASE_NAME'),
    'port': int(os.getenv('DATABASE_PORT', 3306)),
    'ssl_ca': os.getenv('DATABASE_SSL_CA'),
    'ssl_disabled': False
}

print("Connecting to Azure MySQL...")
try:
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor(dictionary=True)
    print("✓ Connected successfully!\n")
    
    # Check flow nodes for HTTP URLs
    print("=== Checking Flow Nodes for HTTP URLs ===")
    query = """
    SELECT id, project_id, text, actor, step 
    FROM flow_nodes 
    WHERE project_id IN (26, 27)
    AND (text LIKE '%http://%' OR actor LIKE '%http://%' OR step LIKE '%http://%')
    LIMIT 20
    """
    
    cursor.execute(query)
    rows = cursor.fetchall()
    
    if rows:
        print(f"Found {len(rows)} nodes with HTTP URLs:\n")
        for row in rows:
            print(f"Node ID: {row['id']}, Project: {row['project_id']}")
            if row['text'] and 'http://' in row['text']:
                print(f"  Text: {row['text'][:100]}...")
            if row['actor'] and 'http://' in row['actor']:
                print(f"  Actor: {row['actor'][:100]}...")
            if row['step'] and 'http://' in row['step']:
                print(f"  Step: {row['step'][:100]}...")
            print()
    else:
        print("No HTTP URLs found in flow nodes for projects 26 and 27\n")
    
    # Check flow edges for HTTP URLs
    print("=== Checking Flow Edges for HTTP URLs ===")
    query = """
    SELECT id, source_node_id, target_node_id, condition 
    FROM flow_edges 
    WHERE source_node_id IN (SELECT id FROM flow_nodes WHERE project_id IN (26, 27))
    AND condition LIKE '%http://%'
    LIMIT 20
    """
    
    cursor.execute(query)
    rows = cursor.fetchall()
    
    if rows:
        print(f"Found {len(rows)} edges with HTTP URLs:\n")
        for row in rows:
            print(f"Edge ID: {row['id']}, Source: {row['source_node_id']}, Target: {row['target_node_id']}")
            if row['condition']:
                print(f"  Condition: {row['condition'][:100]}...")
            print()
    else:
        print("No HTTP URLs found in flow edges\n")
    
    # Get total count of nodes for these projects
    cursor.execute("SELECT COUNT(*) as count FROM flow_nodes WHERE project_id IN (26, 27)")
    total = cursor.fetchone()
    print(f"Total flow nodes for projects 26 and 27: {total['count']}")
    
    cursor.close()
    conn.close()
    
except mysql.connector.Error as err:
    print(f"❌ Error: {err}")
except Exception as e:
    print(f"❌ Unexpected error: {e}")

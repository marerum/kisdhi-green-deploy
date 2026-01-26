#!/usr/bin/env python3
"""
Check for HTTP URLs in flow_nodes and flow_edges tables
"""
import pymysql
import sys

def check_http_urls():
    """Check for HTTP URLs in flow data"""
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
        
        # Check flow_nodes for HTTP URLs
        print("=== Checking flow_nodes for HTTP URLs ===")
        cursor.execute("""
            SELECT id, project_id, text, actor, step 
            FROM flow_nodes 
            WHERE text LIKE '%http://%' 
               OR actor LIKE '%http://%' 
               OR step LIKE '%http://%'
            ORDER BY project_id, id
        """)
        nodes_with_http = cursor.fetchall()
        
        if nodes_with_http:
            print(f"⚠️  Found {len(nodes_with_http)} flow_nodes with HTTP URLs:")
            for node in nodes_with_http:
                print(f"\nNode ID: {node[0]}, Project ID: {node[1]}")
                if 'http://' in str(node[2]):
                    print(f"  Text: {node[2]}")
                if 'http://' in str(node[3]):
                    print(f"  Actor: {node[3]}")
                if 'http://' in str(node[4]):
                    print(f"  Step: {node[4]}")
        else:
            print("✓ No HTTP URLs found in flow_nodes")
        
        # Check flow_edges for HTTP URLs
        print("\n=== Checking flow_edges for HTTP URLs ===")
        cursor.execute("""
            SELECT id, project_id, `condition` 
            FROM flow_edges 
            WHERE `condition` LIKE '%http://%'
            ORDER BY project_id, id
        """)
        edges_with_http = cursor.fetchall()
        
        if edges_with_http:
            print(f"⚠️  Found {len(edges_with_http)} flow_edges with HTTP URLs:")
            for edge in edges_with_http:
                print(f"\nEdge ID: {edge[0]}, Project ID: {edge[1]}")
                print(f"  Condition: {edge[2]}")
        else:
            print("✓ No HTTP URLs found in flow_edges")
        
        # Summary by project
        print("\n=== Summary by Project ===")
        cursor.execute("""
            SELECT project_id, COUNT(*) as node_count
            FROM flow_nodes
            WHERE text LIKE '%http://%' 
               OR actor LIKE '%http://%' 
               OR step LIKE '%http://%'
            GROUP BY project_id
        """)
        project_summary = cursor.fetchall()
        
        if project_summary:
            for project in project_summary:
                print(f"Project {project[0]}: {project[1]} nodes with HTTP URLs")
        
        cursor.close()
        connection.close()
        print("\n✓ Check complete")

    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    check_http_urls()

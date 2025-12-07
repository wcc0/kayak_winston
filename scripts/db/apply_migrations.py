#!/usr/bin/env python3
"""
Apply MySQL migrations from mysql_schema.sql
"""
import os
import sys

USE_CONNECTOR = False

try:
    import pymysql
    pymysql.install_as_MySQLdb()
    import MySQLdb
except ImportError:
    try:
        import mysql.connector
        USE_CONNECTOR = True
    except ImportError:
        print("ERROR: No MySQL library found. Install pymysql or mysql-connector-python:")
        print("  pip install pymysql")
        print("  or")
        print("  pip install mysql-connector-python")
        sys.exit(1)

def apply_migrations():
    """Read and execute SQL schema file"""
    
    # MySQL connection settings from .env
    config = {
        'host': 'localhost',
        'port': 3306,
        'user': 'root',
        'password': '1234',
        'database': None  # Create DB first
    }
    
    # Read SQL file
    script_dir = os.path.dirname(os.path.abspath(__file__))
    sql_file = os.path.join(script_dir, 'mysql_schema.sql')
    
    print(f"📄 Reading SQL from: {sql_file}")
    
    with open(sql_file, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    # Split by semicolons (simple parsing)
    statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip() and not stmt.strip().startswith('--')]
    
    print(f"📊 Found {len(statements)} SQL statements")
    
    # Connect without database first
    if USE_CONNECTOR:
        conn = mysql.connector.connect(**config)
        cursor = conn.cursor()
    else:
        conn = MySQLdb.connect(**config)
        cursor = conn.cursor()
    
    print("✅ Connected to MySQL")
    
    success_count = 0
    error_count = 0
    
    for i, statement in enumerate(statements, 1):
        # Skip empty or comment-only statements
        if not statement or statement.startswith('--'):
            continue
        
        try:
            # Execute statement
            cursor.execute(statement)
            conn.commit()
            success_count += 1
            
            # Print progress for important statements
            if 'CREATE DATABASE' in statement.upper():
                print(f"  ✓ Created database")
            elif 'CREATE TABLE' in statement.upper():
                # Extract table name
                table_name = statement.split('TABLE')[1].split('(')[0].strip().split()[0]
                if 'IF NOT EXISTS' in statement.upper():
                    table_name = table_name.replace('IF', '').replace('NOT', '').replace('EXISTS', '').strip()
                print(f"  ✓ Created table: {table_name}")
            elif 'INSERT' in statement.upper():
                print(f"  ✓ Inserted default data")
                
        except Exception as e:
            error_msg = str(e)
            # Ignore "already exists" errors
            if 'already exists' in error_msg.lower() or 'duplicate' in error_msg.lower():
                success_count += 1
            else:
                error_count += 1
                print(f"  ✗ Error in statement {i}: {error_msg}")
                if len(statement) < 200:
                    print(f"    Statement: {statement[:100]}...")
    
    cursor.close()
    conn.close()
    
    print(f"\n{'='*60}")
    print(f"✅ Migration complete!")
    print(f"   Success: {success_count} statements")
    print(f"   Errors:  {error_count} statements")
    print(f"{'='*60}\n")
    
    return error_count == 0

if __name__ == '__main__':
    try:
        success = apply_migrations()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

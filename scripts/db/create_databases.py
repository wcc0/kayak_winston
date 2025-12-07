"""Run this script to create MySQL schema defined in `mysql_schema.sql`.
Usage: python create_databases.py --user root --password '' --host localhost
"""
import argparse
import mysql.connector
from pathlib import Path


def run_sql_file(conn_params, path: Path):
    with open(path, 'r', encoding='utf-8') as fh:
        sql = fh.read()
    cnx = mysql.connector.connect(**conn_params)
    cursor = cnx.cursor()
    for stmt in sql.split(';'):
        stmt = stmt.strip()
        if not stmt:
            continue
        try:
            cursor.execute(stmt)
        except Exception as e:
            print('SQL exec error:', e)
    cnx.commit()
    cursor.close()
    cnx.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--host', default='localhost')
    parser.add_argument('--user', default='root')
    parser.add_argument('--password', default='')
    parser.add_argument('--port', default=3306, type=int)
    args = parser.parse_args()

    conn_params = {'host': args.host, 'user': args.user, 'password': args.password, 'port': args.port}
    sql_path = Path(__file__).parent / 'mysql_schema.sql'
    if not sql_path.exists():
        print('mysql_schema.sql not found at', sql_path)
        return
    run_sql_file(conn_params, sql_path)
    print('Database schema created (or already exists).')


if __name__ == '__main__':
    main()

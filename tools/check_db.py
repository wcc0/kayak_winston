import os
import sqlite3

db_path = os.path.abspath(os.path.join(os.getcwd(), 'data', 'normalized', 'deals.db'))
print('DB path:', db_path)
if not os.path.exists(db_path):
    print('DB not found')
    raise SystemExit(1)

conn = sqlite3.connect(db_path)
cur = conn.cursor()
tables = []
for row in cur.execute("SELECT name FROM sqlite_master WHERE type='table'"):
    tables.append(row[0])
print('tables:', tables)
for t in tables:
    try:
        cur.execute(f'SELECT COUNT(*) FROM {t}')
        print(t, cur.fetchone()[0])
    except Exception as e:
        print('error reading', t, e)
conn.close()

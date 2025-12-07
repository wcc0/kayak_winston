import sqlite3
import os

db_path = os.path.abspath(os.path.join(os.getcwd(), 'concierge.db'))
print('Concierge DB path:', db_path)
if not os.path.exists(db_path):
    print('DB not found at', db_path)
    # try in services dir
    db_path = os.path.abspath(os.path.join(os.getcwd(), 'services', 'concierge_agent', 'concierge.db'))
    print('Trying', db_path)
    if not os.path.exists(db_path):
        print('Not found')
        raise SystemExit(1)

conn = sqlite3.connect(db_path)
cur = conn.cursor()

# list tables
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [row[0] for row in cur.fetchall()]
print('Tables:', tables)

for t in tables:
    try:
        cur.execute(f'SELECT COUNT(*) FROM {t}')
        count = cur.fetchone()[0]
        print(f'  {t}: {count} rows')
    except Exception as e:
        print(f'  {t}: error - {e}')

# Try to read from flight and hotel tables if they exist
if 'flight' in tables:
    cur.execute('SELECT id, origin, destination, price FROM flight LIMIT 3')
    print('Sample flights:')
    for row in cur.fetchall():
        print('  ', row)

if 'hotel' in tables:
    cur.execute('SELECT id, name, city, price_per_night FROM hotel LIMIT 3')
    print('Sample hotels:')
    for row in cur.fetchall():
        print('  ', row)

conn.close()

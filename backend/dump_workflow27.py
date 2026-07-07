import sqlite3, json

conn = sqlite3.connect('taskmaster.db')
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# List tables
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in cur.fetchall()]
print("Tables:", tables)

# Find nodes table
node_table = None
for t in tables:
    if 'node' in t.lower():
        node_table = t
        print("Node table:", t)

# Find workflow table
wf_table = None
for t in tables:
    if 'workflow' in t.lower():
        wf_table = t

# Workflow 27
cur.execute(f"SELECT * FROM {wf_table} WHERE id=27")
wf = cur.fetchone()
if wf:
    print("Workflow:", dict(wf))

# Nodes
if node_table:
    cur.execute(f"SELECT * FROM {node_table} WHERE workflow_id=27 ORDER BY id")
    for r in cur.fetchall():
        d = dict(r)
        cfg_raw = d.get('config') or '{}'
        try:
            cfg = json.loads(cfg_raw)
        except:
            cfg = cfg_raw
        print()
        print("Node:", d.get('id'), "| type:", d.get('node_type'), "| label:", d.get('label'))
        print("  config:", json.dumps(cfg, indent=2))

conn.close()

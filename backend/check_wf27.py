import sqlite3, json

conn = sqlite3.connect('taskmaster.db')
conn.row_factory = sqlite3.Row
cur = conn.cursor()

cur.execute('SELECT id, name FROM workflows ORDER BY id')
print('Workflows:')
for r in cur.fetchall():
    print(' ', dict(r))

for wf_id in [19, 20, 21, 24, 29]:
    cur.execute('SELECT id, node_type, label, config FROM workflow_nodes WHERE workflow_id=? ORDER BY id', (wf_id,))
    rows = cur.fetchall()
    if rows:
        print(f'\n--- Workflow {wf_id} nodes ---')
        for r in rows:
            d = dict(r)
            try:
                cfg = json.loads(d['config'] or '{}')
            except:
                cfg = d['config']
            sel = cfg.get('selector', cfg.get('url', '')) if isinstance(cfg, dict) else ''
            print(f"  [{d['id']}] {d['node_type']} | {d['label']} | selector={sel}")
conn.close()

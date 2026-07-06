import sqlite3, json
conn = sqlite3.connect(r'c:\Users\003IHI744\Desktop\TaskMaster\backend\taskmaster.db')
conn.row_factory = sqlite3.Row
cur = conn.cursor()

cur.execute('SELECT id, name, meta_data FROM workflows WHERE id=32')
wf = cur.fetchone()
if wf:
    d = dict(wf)
    print('Workflow:', d['id'], '|', d['name'])
    try:
        meta = json.loads(d['meta_data'] or '{}')
    except:
        meta = {}
    print('Meta:', json.dumps(meta, indent=2))
else:
    print('Workflow 32 not found - latest workflows:')
    cur.execute('SELECT id, name FROM workflows ORDER BY id DESC LIMIT 5')
    for r in cur.fetchall():
        print(' ', dict(r))

print()
cur.execute('SELECT id, node_type, label, config FROM workflow_nodes WHERE workflow_id=32 ORDER BY id')
rows = cur.fetchall()
print(f'{len(rows)} nodes:')
for r in rows:
    d = dict(r)
    try:
        cfg = json.loads(d['config'] or '{}')
    except:
        cfg = {}
    nid = d['id']
    nt  = d['node_type']
    lbl = d['label']
    print(f'  [{nid}] {nt:25s} | {lbl}')
    print(f'         config: {json.dumps(cfg)}')

conn.close()

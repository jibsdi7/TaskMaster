import sqlite3, json

conn = sqlite3.connect('taskmaster.db')
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# List all workflows
cur.execute('SELECT id, name FROM workflows ORDER BY id DESC LIMIT 10')
print('Latest workflows:')
for r in cur.fetchall():
    print(' ', dict(r))

# Nodes of workflow 27
cur.execute('SELECT id, node_id, node_type, label, config FROM workflow_nodes WHERE workflow_id=27 ORDER BY id')
rows = cur.fetchall()
print('\n--- Workflow 27 nodes ---')
for r in rows:
    d = dict(r)
    try:
        cfg = json.loads(d['config'] or '{}')
    except:
        cfg = d['config']
    print("  [{}] {} | {}".format(d['id'], d['node_type'], d['label']))
    print("    config: {}".format(json.dumps(cfg)))

# Edges of workflow 27
cur.execute('SELECT edge_id, source_node_id, target_node_id FROM workflow_edges WHERE workflow_id=27 ORDER BY id')
rows = cur.fetchall()
print('\n--- Workflow 27 edges ---')
for r in rows:
    d = dict(r)
    print("  {} -> {}".format(d['source_node_id'], d['target_node_id']))

conn.close()

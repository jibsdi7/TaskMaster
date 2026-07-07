import sqlite3
import json
from datetime import datetime

conn = sqlite3.connect('backend/taskmaster.db')
c = conn.cursor()

# Get current max position_y to place new node
c.execute('SELECT MAX(position_y) FROM workflow_nodes WHERE workflow_id=17')
max_y = c.fetchone()[0] or 0

# Create DELAY node between node_1 and node_2
delay_node_id = 'delay_test_1'
delay_config = {
    'duration': 2000,  # 2 seconds
    'timeout': 30000
}

# Insert DELAY node
c.execute('''
    INSERT INTO workflow_nodes 
    (workflow_id, node_id, node_type, label, position_x, position_y, config, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
''', (
    17,
    delay_node_id,
    'DELAY',
    'Wait 2 seconds',
    100,
    250,  # Position between node_1 (200) and node_2 (300)
    json.dumps(delay_config),
    datetime.utcnow().isoformat()
))

# Delete old edge from node_1 to node_2
c.execute('DELETE FROM workflow_edges WHERE workflow_id=17 AND source_node_id="node_1" AND target_node_id="node_2"')

# Create new edges: node_1 -> delay -> node_2
c.execute('''
    INSERT INTO workflow_edges 
    (workflow_id, edge_id, source_node_id, target_node_id, created_at)
    VALUES (?, ?, ?, ?, ?)
''', (
    17,
    'edge_node1_delay',
    'node_1',
    delay_node_id,
    datetime.utcnow().isoformat()
))

c.execute('''
    INSERT INTO workflow_edges 
    (workflow_id, edge_id, source_node_id, target_node_id, created_at)
    VALUES (?, ?, ?, ?, ?)
''', (
    17,
    'edge_delay_node2',
    delay_node_id,
    'node_2',
    datetime.utcnow().isoformat()
))

conn.commit()

print('[OK] Added DELAY node between node_1 and node_2')
print('\nNew workflow structure:')
c.execute('SELECT source_node_id, target_node_id FROM workflow_edges WHERE workflow_id=17 ORDER BY source_node_id')
for row in c.fetchall():
    print(f'  {row[0]} -> {row[1]}')

print('\nAll nodes:')
c.execute('SELECT node_id, node_type, label FROM workflow_nodes WHERE workflow_id=17 ORDER BY position_y')
for row in c.fetchall():
    print(f'  {row[0]} ({row[1]}): {row[2]}')

conn.close()

# Made with Bob

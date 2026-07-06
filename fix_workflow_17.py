import sqlite3
import json

conn = sqlite3.connect('backend/taskmaster.db')
c = conn.cursor()

# Update node 3 to TYPE with value
c.execute('SELECT config FROM workflow_nodes WHERE workflow_id=17 AND node_id="node_3"')
config3 = json.loads(c.fetchone()[0])
config3['value'] = 'Dibyendu'
c.execute('UPDATE workflow_nodes SET node_type=?, config=? WHERE workflow_id=17 AND node_id="node_3"', 
          ('TYPE', json.dumps(config3)))

# Update node 4 to TYPE with value
c.execute('SELECT config FROM workflow_nodes WHERE workflow_id=17 AND node_id="node_4"')
config4 = json.loads(c.fetchone()[0])
config4['value'] = 'Dibyendu Dey'
c.execute('UPDATE workflow_nodes SET node_type=?, config=? WHERE workflow_id=17 AND node_id="node_4"', 
          ('TYPE', json.dumps(config4)))

conn.commit()
print('Updated nodes 3 and 4 to TYPE nodes with values\n')

# Show updated nodes
c.execute('SELECT node_id, node_type, label, config FROM workflow_nodes WHERE workflow_id=17 ORDER BY position_y')
for row in c.fetchall():
    print(f'{row[0]} ({row[1]}): {row[2]}')
    print(f'  Config: {json.loads(row[3])}')
    print()

conn.close()

# Made with Bob

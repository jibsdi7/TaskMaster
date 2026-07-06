"""add workflow_ids to scheduled_jobs

Revision ID: cc5fe8ff8c01
Revises: 6c0b9dc73f2a
Create Date: 2026-07-04 13:48:04.924294

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cc5fe8ff8c01'
down_revision: Union[str, None] = '6c0b9dc73f2a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # SQLite does not support ALTER COLUMN or adding NOT NULL columns without defaults.
    # Use the table-recreation approach.
    with op.batch_alter_table('scheduled_jobs', recreate='always') as batch_op:
        batch_op.add_column(sa.Column('workflow_ids', sa.JSON(), nullable=True, server_default='[]'))
        batch_op.alter_column('workflow_id', existing_type=sa.INTEGER(), nullable=True)

    # Back-fill: copy existing workflow_id into workflow_ids array for old rows
    op.execute("UPDATE scheduled_jobs SET workflow_ids = json_array(workflow_id) WHERE workflow_id IS NOT NULL AND (workflow_ids IS NULL OR workflow_ids = '[]' OR workflow_ids = 'null')")


def downgrade() -> None:
    with op.batch_alter_table('scheduled_jobs', recreate='always') as batch_op:
        batch_op.drop_column('workflow_ids')
        batch_op.alter_column('workflow_id', existing_type=sa.INTEGER(), nullable=False)

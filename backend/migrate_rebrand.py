"""
One-time migration: replace all 'TaskMaster' references in the database
with 'FlowWeaver'.  Safe to run multiple times (idempotent).

Run from the backend/ directory:
    python migrate_rebrand.py
"""
import os
import sys

# Ensure backend package is importable
sys.path.insert(0, os.path.dirname(__file__))

from app.db.database import SessionLocal
from app.db import models

def run():
    db = SessionLocal()
    try:
        updated = 0

        # ── Workflows ──────────────────────────────────────────────────────
        workflows = db.query(models.Workflow).filter(
            models.Workflow.description.like('%TaskMaster%')
        ).all()
        for wf in workflows:
            wf.description = wf.description.replace('TaskMaster', 'FlowWeaver')
            updated += 1

        # ── Blocks ─────────────────────────────────────────────────────────
        blocks = db.query(models.Block).filter(
            models.Block.description.like('%TaskMaster%')
        ).all()
        for b in blocks:
            b.description = b.description.replace('TaskMaster', 'FlowWeaver')
            updated += 1

        db.commit()
        print(f"[OK] Migration complete — {updated} row(s) updated.")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Migration failed: {e}")
        raise
    finally:
        db.close()

if __name__ == '__main__':
    run()

"""
seed_analytics.py
-----------------
Inserts 10 demo chat sessions + matching consultations spread over the
last 7 days into the configured database (Supabase or local SQLite).

Run from the backend/ directory:
    python database/seed_analytics.py
"""

import sys
import os
from datetime import datetime, timezone, timedelta

# Allow importing from the backend root
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.db import SessionLocal, engine, Base, validate_db_connection
from database.models import ChatSession, Consultation

# ── helpers ──────────────────────────────────────────────────────────────────

def days_ago(n: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=n)


SESSIONS = [
    ("demo_session_1",  days_ago(6)),
    ("demo_session_2",  days_ago(5)),
    ("demo_session_3",  days_ago(4)),
    ("demo_session_4",  days_ago(3)),
    ("demo_session_5",  days_ago(3)),
    ("demo_session_6",  days_ago(2)),
    ("demo_session_7",  days_ago(2)),
    ("demo_session_8",  days_ago(1)),
    ("demo_session_9",  days_ago(1)),
    ("demo_session_10", days_ago(0)),
]

CONSULTATIONS = [
    ("demo_session_1",  "Build My Routine",       "Oily",        "acne",          4, 4, days_ago(6)),
    ("demo_session_2",  "Help Me Fix a Concern",  "Dry",         "dryness",       3, 3, days_ago(5)),
    ("demo_session_3",  "Build My Routine",       "Combination", "pores",         5, 5, days_ago(4)),
    ("demo_session_4",  "Create My Custom Kit",   "Sensitive",   "redness",       4, 4, days_ago(3)),
    ("demo_session_5",  "Help Me Fix a Concern",  "Oily",        "acne",          2, 2, days_ago(3)),
    ("demo_session_6",  "Build My Routine",       "Normal",      "aging",         6, 6, days_ago(2)),
    ("demo_session_7",  "Create My Custom Kit",   "Dry",         "dullness",      3, 3, days_ago(2)),
    ("demo_session_8",  "Build My Routine",       "Oily",        "acne",          4, 4, days_ago(1)),
    ("demo_session_9",  "Help Me Fix a Concern",  "Combination", "pigmentation",  3, 3, days_ago(1)),
    ("demo_session_10", "Build My Routine",       "Sensitive",   "dryness",       5, 5, days_ago(0)),
]

# ── main ──────────────────────────────────────────────────────────────────────

def seed():
    print("[*] Validating database connection...")
    ok = validate_db_connection()
    if not ok:
        print("[FAIL] Cannot reach database. Check your DATABASE_URL in backend/.env")
        sys.exit(1)

    # Ensure tables exist (safe no-op if they already do)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    inserted_sessions = 0
    inserted_consultations = 0

    try:
        # ── Chat Sessions ──────────────────────────────────────────────────
        for session_id, created_at in SESSIONS:
            exists = db.query(ChatSession).filter(
                ChatSession.session_id == session_id
            ).first()
            if exists:
                print(f"  [SKIP] Session '{session_id}' already exists -- skipping.")
                continue

            session = ChatSession(
                session_id=session_id,
                created_at=created_at,
                last_active=created_at,
            )
            db.add(session)
            inserted_sessions += 1

        db.flush()  # Flush sessions before inserting FK-dependent consultations

        # ── Consultations ──────────────────────────────────────────────────
        for (sid, entry_card, skin_type, concerns,
             routine_length, products_recommended, created_at) in CONSULTATIONS:

            exists = db.query(Consultation).filter(
                Consultation.session_id == sid
            ).first()
            if exists:
                print(f"  [SKIP] Consultation for '{sid}' already exists -- skipping.")
                continue

            consultation = Consultation(
                session_id=sid,
                entry_card=entry_card,
                skin_type=skin_type,
                concerns=concerns,
                routine_length=routine_length,
                products_recommended=products_recommended,
                created_at=created_at,
            )
            db.add(consultation)
            inserted_consultations += 1

        db.commit()
        print(f"\n[OK] Seeding complete!")
        print(f"    Sessions inserted     : {inserted_sessions}")
        print(f"    Consultations inserted: {inserted_consultations}")

    except Exception as e:
        db.rollback()
        print(f"\n[FAIL] Error during seeding: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()

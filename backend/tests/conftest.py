"""
Shared pytest fixtures — uses a temp file SQLite DB per test function.
This avoids in-memory SQLite connection-sharing issues.
"""
import os
import tempfile
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Must be set BEFORE app imports so pydantic-settings picks it up
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_run.db")
os.environ.setdefault("ALLOWED_ORIGINS", "http://localhost:5173")

from app.db.database import Base, get_db  # noqa: E402
import app.db.database as db_module       # noqa: E402
from main import app                       # noqa: E402


@pytest.fixture(scope="function")
def db():
    """Fresh file-based SQLite DB per test, fully isolated."""
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    url = f"sqlite:///{path}"

    engine = create_engine(url, connect_args={"check_same_thread": False})
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    # Patch module-level engine and session factory used by import service
    orig_engine = db_module.engine
    orig_session = db_module.SessionLocal
    db_module.engine = engine
    db_module.SessionLocal = Session

    session = Session()
    try:
        yield session
    finally:
        session.close()
        db_module.engine = orig_engine
        db_module.SessionLocal = orig_session
        engine.dispose()
        try:
            os.unlink(path)
        except Exception:
            pass


@pytest.fixture(scope="function")
def client(db):
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.clear()


# ── Sample transcripts ───────────────────────────────────────────────────────

PRICING_TRANSCRIPT = """Rep: Thanks for joining today. Did you review the proposal?
Customer: Yes. Honestly the pricing is out of our budget. We need a discount or a lower quote.
Rep: I understand. Can you share your budget range?
Customer: We budgeted around 15000. Your proposal was 28000. That is out of budget completely.
Rep: Let me check with our deal desk. I will send updated pricing by end of week.
Customer: We need a decision by November 3rd. Budget cycle closes then.
Rep: Understood. I will get you the new proposal by Friday."""

TECHNICAL_TRANSCRIPT = """Rep: I wanted to address the technical questions your IT team raised.
Customer: Our CTO flagged a serious issue. Your platform does not support our Okta SSO configuration.
Rep: That is a valid concern. Let me escalate to engineering today.
Customer: Also we are HIPAA regulated and need US data residency confirmed. Security compliance is required.
Rep: Data residency in the US is supported. I will get you the compliance documentation.
Customer: The SSO issue is a technical blocker. We cannot proceed without it.
Rep: I will have a definitive answer within 48 hours."""

BUYING_SIGNAL_TRANSCRIPT = """Rep: How did the demo go?
Customer: Really well. This is exactly what we have been looking for. We love it and are ready to move forward.
Rep: That is great to hear.
Customer: Budget is approved. The board signed off during Q4 planning. Please send me the contract.
Rep: I will send everything today.
Customer: Let us schedule the kick-off call for next Monday. Can we set up a meeting?
Rep: Perfect. I will send the calendar invite this afternoon."""

HEALTHY_TRANSCRIPT = """Rep: Good afternoon. How did the trial go?
Customer: Really well. The team found it intuitive. Let us proceed with the starter package.
Rep: Excellent. I will send the contract this afternoon.
Customer: Send it to richard at hooli dot com. I will sign by end of week.
Rep: I will also include the onboarding guide. Monday morning for the kick-off call?
Customer: Monday at 10 AM works perfectly. Let us schedule it."""

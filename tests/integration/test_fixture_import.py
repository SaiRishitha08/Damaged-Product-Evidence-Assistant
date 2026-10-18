from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from backend.app.main import app
from backend.config import get_settings
from backend.db import Base, CaseRecord, EvidenceRecord


def test_supplied_fixture_import_is_idempotent(tmp_path, monkeypatch):
    database_url = f"sqlite:///{tmp_path / 'test.db'}"
    monkeypatch.setenv("DATABASE_URL", database_url)
    get_settings.cache_clear()

    engine = create_engine(database_url)
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine)

    from backend import db

    db.get_engine.cache_clear()
    db.get_session_factory.cache_clear()
    db.get_engine()
    db.get_session_factory()

    with TestClient(app) as client:
        headers = {"X-Reviewer": "integration-test"}
        first = client.post("/api/fixtures/import", headers=headers)
        second = client.post("/api/fixtures/import", headers=headers)

    assert first.status_code == 200
    assert first.json() == {
        "imported": 10,
        "skipped": 0,
        "case_codes": [f"DAMAGE{index:02d}" for index in range(1, 11)],
    }
    assert second.status_code == 200
    assert second.json()["imported"] == 0
    assert second.json()["skipped"] == 10

    with session_factory() as session:
        cases = session.scalars(select(CaseRecord)).all()
        evidence = session.scalars(select(EvidenceRecord)).all()
        damage10 = next(case for case in cases if case.case_code == "DAMAGE10")

    assert len(cases) == 10
    assert len(evidence) == 9
    assert all(item.fixture_path for item in evidence)
    assert not any(item.case_id == damage10.id for item in evidence)

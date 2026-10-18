from fastapi.testclient import TestClient

from backend.app.main import app
from backend.config import get_settings
from backend.db import Base, get_engine, get_session_factory


def test_fixture_review_edit_confirm_and_export(tmp_path, monkeypatch):
    database_url = f"sqlite:///{tmp_path / 'review.db'}"
    monkeypatch.setenv("DATABASE_URL", database_url)
    monkeypatch.setenv("STORAGE_BACKEND", "local")
    monkeypatch.setenv("LOCAL_STORAGE_DIR", str(tmp_path / "storage"))
    get_settings.cache_clear()

    from backend import db

    db.get_engine.cache_clear()
    db.get_session_factory.cache_clear()
    Base.metadata.create_all(get_engine())

    headers = {"X-Reviewer": "integration-reviewer"}
    with TestClient(app) as client:
        imported = client.post("/api/fixtures/import", headers=headers)
        assert imported.status_code == 200

        from backend.db import CaseRecord

        with get_session_factory()() as session:
            case = session.query(CaseRecord).filter_by(case_code="DAMAGE01").one()
            case_id = case.id

        analyzed = client.post(
            f"/api/cases/{case_id}/analysis",
            headers=headers,
            json={"analyzer": "rules"},
        )
        assert analyzed.status_code == 200

        findings = analyzed.json()["findings"]
        for finding in findings:
            edited = client.patch(
                f"/api/cases/{case_id}/findings/{finding['id']}",
                headers=headers,
                json={"review_status": "accepted"},
            )
            assert edited.status_code == 200

        confirmed = client.post(
            f"/api/cases/{case_id}/review",
            headers=headers,
            json={
                "decision": "confirm_summary",
                "rationale": "Reviewed each provisional finding.",
                "idempotency_key": "confirm-1",
            },
        )
        assert confirmed.status_code == 200
        assert confirmed.json() == {
            "decision": "confirm_summary",
            "case_status": "confirmed",
            "duplicate": False,
        }

        repeated = client.post(
            f"/api/cases/{case_id}/review",
            headers=headers,
            json={
                "decision": "confirm_summary",
                "rationale": "Reviewed each provisional finding.",
                "idempotency_key": "confirm-1",
            },
        )
        assert repeated.status_code == 200
        assert repeated.json()["duplicate"] is True

        exported = client.get(
            f"/api/cases/{case_id}/export?format=csv",
            headers=headers,
        )
        assert exported.status_code == 200
        assert "PROVISIONAL - NOT REVIEWED" not in exported.text
        assert "case_code,item_type,kind" in exported.text

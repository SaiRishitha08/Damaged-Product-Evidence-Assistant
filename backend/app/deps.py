from fastapi import Header, HTTPException

from backend.db import get_session


def get_reviewer(x_reviewer: str | None = Header(default=None)) -> str:
    if not x_reviewer or not x_reviewer.strip():
        raise HTTPException(status_code=401, detail="Reviewer identity is required")
    return x_reviewer.strip()


__all__ = ["get_reviewer", "get_session"]

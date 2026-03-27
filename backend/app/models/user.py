from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Parent (caregiver) profile — stored in Firestore at users/{uid}
# ---------------------------------------------------------------------------

class ParentProfile(BaseModel):
    uid: str
    email: Optional[str] = None
    display_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Child profile — stored in Firestore at children/{child_id}
# ---------------------------------------------------------------------------

class ChildProfile(BaseModel):
    id: str
    parent_id: str
    name: str
    age: int  # 4–6
    avatar_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Request bodies
# ---------------------------------------------------------------------------

class CreateChildRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=50, strip_whitespace=True)
    age: int = Field(..., ge=4, le=6)


class UpdateChildRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=50, strip_whitespace=True)
    age: Optional[int] = Field(None, ge=4, le=6)

    def has_updates(self) -> bool:
        return self.name is not None or self.age is not None

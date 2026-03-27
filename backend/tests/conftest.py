"""Shared pytest fixtures."""
from __future__ import annotations

import pytest

from app.models.conversation import ChildContext, MasterySummary


@pytest.fixture
def child_context() -> ChildContext:
    return ChildContext(
        name="Amara",
        age=5,
        mastery_summary=MasterySummary(scores={"counting_to_10": 0.8, "patterns": 0.4}),
        zoey_memories=["loves dinosaurs", "has a dog named Biscuit"],
    )

"""Unit tests for prompt_builder — no I/O, no API calls."""
from __future__ import annotations

import pytest

from app.models.conversation import ChildContext, MasterySummary
from app.services.ai.prompt_builder import build_system_prompt, _child_context_block


class TestChildContextBlock:
    def test_includes_name_and_age(self, child_context):
        block = _child_context_block(child_context)
        assert "Amara" in block
        assert "5 years old" in block

    def test_strong_skills_listed(self, child_context):
        block = _child_context_block(child_context)
        assert "counting_to_10" in block

    def test_growing_skills_listed(self, child_context):
        block = _child_context_block(child_context)
        assert "patterns" in block

    def test_memories_included(self, child_context):
        block = _child_context_block(child_context)
        assert "loves dinosaurs" in block
        assert "has a dog named Biscuit" in block

    def test_empty_mastery_no_skill_lines(self):
        ctx = ChildContext(name="Kai", age=4, mastery_summary=MasterySummary())
        block = _child_context_block(ctx)
        assert "really good at" not in block
        assert "still learning" not in block


class TestBuildSystemPrompt:
    @pytest.mark.parametrize("subject_id", ["reading", "math", "culture", "science", "free_talk"])
    def test_all_subjects_build_without_error(self, subject_id, child_context):
        prompt = build_system_prompt(subject_id, child_context)
        assert len(prompt) > 200  # sanity: something substantial was built

    def test_base_zoey_character_present(self, child_context):
        prompt = build_system_prompt("math", child_context)
        assert "Zoey" in prompt
        assert "best friend" in prompt

    def test_subject_context_injected(self, child_context):
        math_prompt = build_system_prompt("math", child_context)
        reading_prompt = build_system_prompt("reading", child_context)
        # Subject-specific text should differ
        assert math_prompt != reading_prompt

    def test_child_name_in_prompt(self, child_context):
        prompt = build_system_prompt("science", child_context)
        assert "Amara" in prompt

    def test_unknown_subject_falls_back_to_free_talk(self, child_context):
        # Should not raise; falls back gracefully
        prompt = build_system_prompt("unknown_subject", child_context)
        assert len(prompt) > 200

    def test_prompt_is_cached(self, child_context):
        """Second call with same args should return the same object (lru_cache)."""
        from app.services.ai.prompt_builder import _load_prompt_file
        from pathlib import Path

        # Call twice — file should only be read once (cache hit on second)
        p = Path(__file__).parents[4] / "shared" / "prompts" / "zoey" / "system.md"
        result1 = _load_prompt_file(p)
        result2 = _load_prompt_file(p)
        assert result1 is result2  # same object == cache hit

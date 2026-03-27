"""
Builds Zoey's GPT-4o system prompt from:
  1. Base Zoey character prompt  (shared/prompts/zoey/system.md)
  2. Subject-specific additions   (shared/prompts/subjects/{subject_id}.md)
  3. Child context injected at runtime (name, age, mastery, Zoey memories)

Prompt files are read once and cached in memory for the process lifetime.
"""
from __future__ import annotations

import logging
from functools import lru_cache
from pathlib import Path

from app.models.conversation import ChildContext

logger = logging.getLogger(__name__)

# Resolve the shared/prompts directory relative to this file.
# Path: backend/app/services/ai/prompt_builder.py
#   parents[0] = ai/, [1] = services/, [2] = app/, [3] = backend/, [4] = repo root
_REPO_ROOT = Path(__file__).parents[4]
_PROMPTS_DIR = _REPO_ROOT / "shared" / "prompts"


@lru_cache(maxsize=None)
def _load_prompt_file(path: Path) -> str:
    """Read and cache a prompt markdown file (strips the H1 heading line)."""
    text = path.read_text(encoding="utf-8")
    # Drop the first line (the `# Title` heading) — it's for humans, not the model
    lines = text.splitlines()
    body_lines = [l for l in lines if not l.startswith("# ")]
    return "\n".join(body_lines).strip()


def _base_prompt() -> str:
    return _load_prompt_file(_PROMPTS_DIR / "zoey" / "system.md")


def _subject_prompt(subject_id: str) -> str:
    path = _PROMPTS_DIR / "subjects" / f"{subject_id}.md"
    if not path.exists():
        logger.warning("No subject prompt found for %r, using free_talk", subject_id)
        path = _PROMPTS_DIR / "subjects" / "free_talk.md"
    return _load_prompt_file(path)


def _child_context_block(child: ChildContext) -> str:
    """Render child-specific facts Zoey should know for this session."""
    lines = [
        "## About your friend right now",
        f"- Their name is {child.name}.",
        f"- They are {child.age} years old.",
    ]

    if child.mastery_summary.scores:
        strong = [k for k, v in child.mastery_summary.scores.items() if v >= 0.75]
        growing = [k for k, v in child.mastery_summary.scores.items() if v < 0.5]
        if strong:
            lines.append(f"- They are really good at: {', '.join(strong)}.")
        if growing:
            lines.append(f"- They are still learning: {', '.join(growing)}. Be extra patient and encouraging here.")

    if child.zoey_memories:
        lines.append("- Things you remember about them from before:")
        for memory in child.zoey_memories:
            lines.append(f"  • {memory}")

    lines += [
        "",
        "Always use their name naturally in conversation — not on every turn, but when it feels warm and genuine.",
    ]

    return "\n".join(lines)


def build_system_prompt(subject_id: str, child: ChildContext) -> str:
    """
    Assemble the full system prompt for a conversation turn.

    Order matters: character first, then subject focus, then child-specific facts.
    """
    parts = [
        _base_prompt(),
        "",
        "---",
        "",
        _subject_prompt(subject_id),
        "",
        "---",
        "",
        _child_context_block(child),
    ]
    return "\n".join(parts)

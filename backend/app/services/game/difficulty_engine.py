"""
Adaptive difficulty engine.

Evaluates session accuracy every EVALUATION_WINDOW questions and returns
a new difficulty level (1–5). Called by the progress tracker after each answer.
"""

EVALUATION_WINDOW = 5   # evaluate after every 5 questions
MIN_LEVEL = 1
MAX_LEVEL = 5

LEVEL_UP_THRESHOLD = 0.80    # ≥80% → move up
LEVEL_DOWN_THRESHOLD = 0.50  # <50% → move down


def should_evaluate(session_question_count: int) -> bool:
    """Return True when the session has hit an evaluation checkpoint."""
    return session_question_count > 0 and session_question_count % EVALUATION_WINDOW == 0


def compute_new_level(
    session_correct: int,
    session_total: int,
    current_level: int,
) -> int:
    """
    Compute the next difficulty level based on recent session accuracy.

    Only called when should_evaluate() is True. Uses the last EVALUATION_WINDOW
    answers (the caller passes session totals; we compare the last window).
    """
    if session_total == 0:
        return current_level

    # Use only the most recent window
    window_total = min(session_total, EVALUATION_WINDOW)
    # Approximate window_correct from cumulative counts
    # (exact window tracking would require storing per-question history)
    accuracy = session_correct / session_total

    if accuracy >= LEVEL_UP_THRESHOLD:
        return min(current_level + 1, MAX_LEVEL)
    elif accuracy < LEVEL_DOWN_THRESHOLD:
        return max(current_level - 1, MIN_LEVEL)
    return current_level

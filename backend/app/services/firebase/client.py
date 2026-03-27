"""
Firebase app singleton.

Initialization is lazy — the app is created on first access rather than at
import time, so tests can configure the environment before it fires.
"""
from __future__ import annotations

import json
import logging
from functools import lru_cache

import firebase_admin
from firebase_admin import credentials

from app.core.config import settings

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_firebase_app() -> firebase_admin.App:
    """Return the initialized Firebase app, creating it if necessary."""
    if firebase_admin._apps:
        return firebase_admin.get_app()

    sa = settings.firebase_service_account
    if not sa:
        raise RuntimeError(
            "FIREBASE_SERVICE_ACCOUNT is not set. "
            "Provide a path to a service account JSON file or the JSON string directly."
        )

    # Accept either a file path or an inline JSON string
    try:
        cred_data = json.loads(sa)
        cred = credentials.Certificate(cred_data)
    except (json.JSONDecodeError, ValueError):
        # Treat as a file path
        cred = credentials.Certificate(sa)

    app = firebase_admin.initialize_app(cred)
    logger.info("Firebase app initialized")
    return app

# -*- coding: utf-8 -*-
import hashlib


def anonymize_user_id(user_id) -> str:
    """Return a stable short hash for grouping without storing raw user IDs."""

    if user_id is None:
        return ""

    value = str(user_id).strip()
    if not value:
        return ""

    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:16]


def mask_nickname(name) -> str:
    """Mask a nickname while preserving a small amount of grouping context."""

    if name is None:
        return ""

    value = str(name)
    if len(value) <= 1:
        return "*"
    if len(value) == 2:
        return value[0] + "*"
    return value[0] + "***" + value[-1]

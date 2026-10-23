from __future__ import annotations

import re

MINOR_PATTERNS = [
    re.compile(r"\bschoolgirl\b", re.IGNORECASE),
    re.compile(r"\bschool girl\b", re.IGNORECASE),
    re.compile(r"\bschoolboy\b", re.IGNORECASE),
    re.compile(r"\bschool boy\b", re.IGNORECASE),
    re.compile(r"\bunderage\b", re.IGNORECASE),
    re.compile(r"\bminor\b", re.IGNORECASE),
    re.compile(r"\bteen girl\b", re.IGNORECASE),
    re.compile(r"\bteen boy\b", re.IGNORECASE),
    re.compile(r"\blittle girl\b", re.IGNORECASE),
    re.compile(r"\blittle boy\b", re.IGNORECASE),
    re.compile(r"\bchild\b", re.IGNORECASE),
    re.compile(r"\bkid\b", re.IGNORECASE),
]


def find_prompt_safety_issue(prompt: str | None) -> dict[str, str] | None:
    normalized = str(prompt or "").strip()
    if not normalized:
        return None

    for pattern in MINOR_PATTERNS:
        match = pattern.search(normalized)
        if match:
            offending_term = match.group(0)
            return {
                "reason": "minor_reference",
                "offending_term": offending_term,
                "detail": (
                    f'Prompt references a minor ("{offending_term}"). '
                    'Rewrite the character as an adult before generating.'
                ),
            }

    return None

import re
from typing import List


class Guardrails:
    """Custom guardrails for blocked keywords and prompt injection protection."""

    def __init__(self) -> None:
        self.blocked_keywords: List[str] = [
            "hack",
            "exploit",
            "malware",
            "phish",
            "ddos",
            "wifi password",
            "admin password",
            "secret",
            "confidential",
            "ignore previous instructions",
            "ignore previous",
            "disregard instructions",
            "bypass security",
            "sql injection",
            "prompt injection",
        ]
        self.unsafe_patterns: List[re.Pattern] = [
            re.compile(r"\bhow to\b.*\bhack\b", re.IGNORECASE),
            re.compile(r"\bhow to\b.*\bexploit\b", re.IGNORECASE),
            re.compile(r"\badmin password\b", re.IGNORECASE),
            re.compile(r"\bignore previous instructions\b", re.IGNORECASE),
            re.compile(r"\bdisregard.*instructions\b", re.IGNORECASE),
            re.compile(r"\bbypass security\b", re.IGNORECASE),
        ]
        self.sensitive_response_filters: List[re.Pattern] = [
            re.compile(r"\b(password|ssn|social security|credit card|secret)\b", re.IGNORECASE),
        ]

    def contains_blocked_keyword(self, query: str) -> bool:
        normalized = query.lower()
        for keyword in self.blocked_keywords:
            if keyword in normalized:
                return True
        return False

    def is_prompt_injection(self, query: str) -> bool:
        normalized = query.lower()
        if "ignore previous instructions" in normalized:
            return True
        if "disregard instructions" in normalized:
            return True
        if self.contains_blocked_keyword(query):
            return True
        return False

    def is_unsafe_query(self, query: str) -> bool:
        for pattern in self.unsafe_patterns:
            if pattern.search(query):
                return True
        return False

    def blocks_sensitive_response(self, response: str) -> bool:
        for pattern in self.sensitive_response_filters:
            if pattern.search(response):
                return True
        return False

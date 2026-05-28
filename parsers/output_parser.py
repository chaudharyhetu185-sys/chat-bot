import json
from typing import Dict


class OutputParser:
    """Ensures chatbot output is valid JSON with expected keys."""

    required_fields = ["intent", "risk_level", "response"]

    def parse(self, intent: str, risk_level: str, response: str) -> Dict[str, str]:
        payload = {
            "intent": intent,
            "risk_level": risk_level,
            "response": response,
        }
        self.validate(payload)
        return payload

    def validate(self, payload: Dict[str, str]) -> None:
        if not isinstance(payload, dict):
            raise ValueError("Output must be a dictionary.")
        for field in self.required_fields:
            if field not in payload:
                raise ValueError(f"Missing required output field: {field}")
            if not isinstance(payload[field], str):
                raise ValueError(f"Output field '{field}' must be a string.")
        json.dumps(payload)

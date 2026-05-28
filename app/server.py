from __future__ import annotations
import os
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from flask import Flask, jsonify, request
from app.chatbot import SecureAssistant

app = Flask(__name__)
assistant = SecureAssistant()


@app.route("/health", methods=["GET"])
def health() -> tuple[dict, int]:
    return {"status": "ok", "message": "Secure AI Chatbot is running."}, 200


@app.route("/chat", methods=["POST"])
def chat() -> tuple[dict, int]:
    payload = request.get_json(silent=True)
    if not payload or "query" not in payload:
        return {"error": "Missing required field 'query' in JSON payload."}, 400

    query = str(payload.get("query", "")).strip()
    if not query:
        return {"error": "The query cannot be empty."}, 400

    answer = assistant.reason(query)
    return jsonify(answer), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=False)

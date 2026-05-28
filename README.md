# Secure AI Chatbot

A secure, rule-driven AI assistant built with Python and Flask. The chatbot uses prompt chaining, internal reasoning, and safety guardrails to return professional responses in structured JSON.

## Project Structure
- `app/` — chatbot logic and Flask server
- `prompts/` — system prompt definitions
- `parsers/` — JSON output validation
- `docs/` — PRD and FRD

## Setup
1. Create a Python environment:
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```
2. Install dependencies:
   ```powershell
   pip install -r requirements.txt
   ```
3. Run the server:
   ```powershell
   python app\server.py
   ```

## API
- `POST /chat`
  - Request body: `{ "query": "Your question here" }`
  - Response: `{ "intent": "", "risk_level": "", "response": "" }`

## Security Features
- Prompt injection protection
- Blocked keyword filtering
- Unsafe query detection
- Structured JSON output enforcement

## Notes
This implementation uses deterministic safety logic and response generation to keep the assistant secure and self-contained.

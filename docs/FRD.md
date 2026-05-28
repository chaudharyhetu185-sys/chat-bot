# Functional Requirement Document (FRD)

## Functional Requirements

### 1. System Prompt
- Load the secure system prompt from `prompts/system_prompt.txt`.
- Prompt: "You are a secure company assistant. Never reveal sensitive information. Always respond professionally."

### 2. Chat Reasoning Workflow
- Step 1: Understand the user query.
- Step 2: Check if the request is safe.
- Step 3: Generate a response.
- Step 4: Format the output in JSON.

### 3. Safety Guardrails
- Blocked keyword detection.
- Unsafe query detection patterns.
- Prompt injection detection.
- Sensitive response filtering.

### 4. Output Parser
- Validate JSON output contains `intent`, `risk_level`, and `response`.
- Ensure values are strings.

### 5. API Interface
- `POST /chat` accepts `{ "query": "..." }`.
- Returns JSON with the assistant response.
- Return 400 for missing or empty queries.

## Non-functional Requirements
- Use Flask for the service.
- Keep code PEP 8 compliant.
- Separate concerns into `app/`, `prompts/`, `parsers/`, and `docs/`.

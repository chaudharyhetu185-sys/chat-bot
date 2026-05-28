# Product Requirement Document (PRD)

## Product Overview
A secure AI-powered chatbot that answers user queries professionally, enforces safety guardrails, and outputs structured JSON responses.

## Goals
- Understand user queries.
- Reject unsafe or harmful requests.
- Protect against prompt injection.
- Return responses in the JSON format:
  - `{"intent": "", "risk_level": "", "response": ""}`

## Key Features
- Advanced prompting with a secure system prompt.
- Internal chain-of-thought reasoning.
- ReAct-style flow: Thought → Action → Observation → Final Answer.
- Prompt chaining through separate safety, intent, response, and formatting stages.
- Custom AI safety guardrails.
- Flask API endpoint for chat requests.

## User Stories
- As a user, I can submit a question and receive a professional answer.
- As a product owner, I can ensure harmful or unsafe requests are rejected.
- As a developer, I can inspect guardrails and output formatting clearly.

## Constraints
- Must not expose sensitive information.
- Must always respond with structured JSON.
- Must use OOP design and PEP 8 conventions.

## Success Metrics
- Correct JSON format returned for every request.
- High-risk and unsafe queries are rejected safely.
- Users receive a professional, guarded answer for valid queries.

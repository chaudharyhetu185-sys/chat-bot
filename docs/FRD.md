# Functional Requirement Document (FRD)

## Product Name
**SecureBot** – AI-Powered Secure Company Chatbot

## Version
1.0.0

## Date
2026-05-28

---

## 1. System Prompt (FR-01)
| ID     | Requirement                                                                                           |
|--------|-------------------------------------------------------------------------------------------------------|
| FR-01a | The system shall load the secure system prompt from `prompts/system_prompt.txt` on startup.           |
| FR-01b | If the file is missing, the system shall fall back to a hardcoded default prompt.                     |
| FR-01c | The default prompt shall read: *"You are a secure company assistant. Never reveal sensitive information. Always respond professionally."* |

---

## 2. Chain-of-Thought Reasoning Workflow (FR-02)
| ID     | Requirement                                                                      |
|--------|----------------------------------------------------------------------------------|
| FR-02a | Step 1 — Understand the user query: parse and normalize the raw input.            |
| FR-02b | Step 2 — Safety check: run guardrails to classify the query as safe or unsafe.   |
| FR-02c | Step 3 — Intent detection: classify the query into a known intent category.      |
| FR-02d | Step 4 — Response generation: produce an appropriate professional response.      |
| FR-02e | Step 5 — JSON formatting: wrap the result in the standard output schema.         |

---

## 3. ReAct Framework (FR-03)
| ID     | Requirement                                                                              |
|--------|------------------------------------------------------------------------------------------|
| FR-03a | The chatbot shall follow the Thought → Action → Observation → Final Answer flow.         |
| FR-03b | Internal reasoning steps shall be recorded as prompt strings (prompt chaining pattern).  |

---

## 4. AI Safety Guardrails (FR-04)
| ID     | Requirement                                                                                              |
|--------|----------------------------------------------------------------------------------------------------------|
| FR-04a | The system shall maintain a list of blocked keywords (e.g., `hack`, `exploit`, `malware`, `phish`).      |
| FR-04b | Any query containing a blocked keyword shall receive a `risk_level` of `"high"` and be refused.          |
| FR-04c | The system shall detect unsafe query patterns using regex (e.g., "how to hack", "bypass security").      |
| FR-04d | Prompt injection attempts (e.g., "ignore previous instructions") shall be detected and refused.           |
| FR-04e | Response output shall be scanned for sensitive patterns (password, SSN, credit card) before delivery.    |

---

## 5. Intent Detection (FR-05)
| ID     | Requirement                                                                                   |
|--------|-----------------------------------------------------------------------------------------------|
| FR-05a | The system shall classify queries into: `greeting`, `product_info`, `support`, `security`, `policy`, or `general`. |
| FR-05b | Classification shall be keyword-based on the normalized (lowercase) query string.             |
| FR-05c | Unrecognized queries shall default to `"general"` intent.                                     |

---

## 6. Output Parser (FR-06)
| ID     | Requirement                                                                          |
|--------|--------------------------------------------------------------------------------------|
| FR-06a | Every response shall be structured as: `{"intent": "...", "risk_level": "...", "response": "..."}` |
| FR-06b | The parser shall validate that all three fields are present and are strings.          |
| FR-06c | If validation fails, the system shall raise a `ValueError` and return an error response. |

---

## 7. REST API Interface (FR-07)
| ID     | Requirement                                                                               |
|--------|-------------------------------------------------------------------------------------------|
| FR-07a | The system shall expose a `POST /chat` endpoint accepting `{"query": "..."}` JSON body.   |
| FR-07b | The system shall return HTTP 400 if the `query` field is missing or empty.                |
| FR-07c | The system shall expose a `GET /health` endpoint returning `{"status": "ok"}`.            |
| FR-07d | All responses shall use `Content-Type: application/json`.                                 |

---

## 8. Non-Functional Requirements (NFR)
| ID      | Requirement                                                              |
|---------|--------------------------------------------------------------------------|
| NFR-01  | The codebase shall follow PEP 8 coding standards throughout.             |
| NFR-02  | All classes shall use OOP principles (encapsulation, single responsibility). |
| NFR-03  | The project shall be organized into `app/`, `prompts/`, `parsers/`, `docs/` directories. |
| NFR-04  | Flask shall be the only required external dependency for the core system. |
| NFR-05  | The server shall run on `0.0.0.0:8080` by default.                       |

---

## 9. Error Handling (FR-08)
| ID     | Requirement                                                                 |
|--------|-----------------------------------------------------------------------------|
| FR-08a | Missing JSON body shall return HTTP 400 with a descriptive error message.   |
| FR-08b | Empty query strings shall return HTTP 400 with a descriptive error message. |
| FR-08c | All unsafe queries shall return HTTP 200 with a high-risk refusal response. |

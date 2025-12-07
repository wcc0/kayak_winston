Concierge Agent
================

FastAPI-based chat-facing concierge agent.

Features (scaffold):
- `/chat` POST endpoint that accepts an intent payload and returns a JSON action list.
- `/events` WebSocket endpoint that relays deal/watch events to connected clients.
- Pydantic v2 models for payload validation.
- Simple `llm_react.py` placeholder to integrate with an LLM provider (Ollama, etc.).

To run locally (venv recommended):

```bash
pip install -r requirements.txt
uvicorn src.concierge_agent.api:app --reload --host 0.0.0.0 --port 8002
```

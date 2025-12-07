"""
Minimal ReAct-style LLM wrapper placeholder.
Replace internal `call_llm` with your provider (Ollama, OpenAI, etc.).
"""
from typing import Dict, Any


def call_llm(prompt: str, model: str | None = None) -> str:
    # Minimal placeholder: in production call an LLM API
    return f"[LLM response to] {prompt}"


def react_loop(intent_payload: Dict[str, Any]) -> Dict[str, Any]:
    # Example: return a short action list
    text = intent_payload.get('text', '')
    # naive intent parsing
    if 'deal' in text.lower() or 'find' in text.lower():
        return {'actions': [{'action': 'searchDeals', 'payload': {'query': text}}]}
    return {'actions': [{'action': 'clarify', 'payload': {'question': 'When are you traveling? (dates)'}}]}

import json
import asyncio
from typing import Any, Callable, Dict

from . import llm


async def run_react(prompt: str, tools: Dict[str, Callable[..., Any]], max_steps: int = 3) -> Dict[str, Any]:
    """Simple ReAct loop: ask LLM for a JSON action, run tool, provide observation, repeat.
    Expected LLM JSON: {"action": "tool_name", "args": {...}} or {"final": "text"}
    """
    history = []
    for step in range(max_steps):
        # build step prompt including observations
        full_prompt = prompt + "\n\nHistory:\n" + json.dumps(history[-4:])
        out = await llm.generate(full_prompt, max_tokens=256)
        # try parse JSON
        try:
            j = json.loads(out)
        except Exception:
            # if not JSON, return final text reply
            return {"final": out}

        if 'final' in j:
            return {"final": j['final']}

        action = j.get('action')
        args = j.get('args', {})
        if not action or action not in tools:
            history.append({'llm': j, 'note': 'unknown_action'})
            return {"final": out}

        try:
            result = tools[action](**args)
            if asyncio.iscoroutine(result):
                result = await result
            observation = result
        except Exception as e:
            observation = {'error': str(e)}

        history.append({'llm': j, 'observation': observation})

        # feed observation back into next prompt iteration
        prompt = prompt + "\nObservation: " + json.dumps(observation)

    return {"final": "Max steps reached", "history": history}

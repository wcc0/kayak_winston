import os
import json
import aiohttp

LLM_ENABLED = os.environ.get('LLM_ENABLED', 'false').lower() in ('1', 'true', 'yes')
LLM_PROVIDER = os.environ.get('LLM_PROVIDER', 'ollama')
LLM_URL = os.environ.get('LLM_URL', 'http://host.docker.internal:11434')
LLM_MODEL = os.environ.get('LLM_MODEL', 'llama-3.2')


async def generate(prompt: str, max_tokens: int = 128, temperature: float = 0.0) -> str:
    if not LLM_ENABLED:
        return ''
    if LLM_PROVIDER != 'ollama':
        raise RuntimeError('Only ollama provider is supported in this client')

    url = f"{LLM_URL}/api/generate"
    payload = {
        'model': LLM_MODEL,
        'prompt': prompt,
        'max_length': max_tokens,
        'temperature': temperature,
        'stream': False,
    }
    async with aiohttp.ClientSession() as sess:
        async with sess.post(url, json=payload, timeout=30) as resp:
            try:
                data = await resp.json()
                if isinstance(data, dict):
                    if 'output' in data:
                        return data['output']
                    if 'text' in data:
                        return data['text']
                    if 'choices' in data and isinstance(data['choices'], list):
                        return ''.join([c.get('text','') for c in data['choices']])
            except Exception:
                pass
            txt = await resp.text()
            lines = [l.strip() for l in txt.splitlines() if l.strip()]
            for line in reversed(lines):
                try:
                    j = json.loads(line)
                    if isinstance(j, dict) and 'output' in j:
                        return j['output']
                    if isinstance(j, dict) and 'text' in j:
                        return j['text']
                except Exception:
                    continue
            return txt

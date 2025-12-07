import os
import json
import aiohttp

LLM_ENABLED = os.environ.get('LLM_ENABLED', 'true').lower() in ('1', 'true', 'yes')
LLM_PROVIDER = os.environ.get('LLM_PROVIDER', 'ollama')
LLM_URL = os.environ.get('LLM_URL', 'http://localhost:11434')
LLM_MODEL = os.environ.get('LLM_MODEL', 'llama3.2:latest')


async def generate(prompt: str, max_tokens: int = 256, temperature: float = 0.2) -> str:
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
        async with sess.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=30)) as resp:
            try:
                data = await resp.json()
                # Ollama returns {"response": "text here"}
                if isinstance(data, dict):
                    if 'response' in data:
                        return data['response'].strip()
                    if 'output' in data:
                        return data['output'].strip()
                    if 'text' in data:
                        return data['text'].strip()
                    # if choices present
                    if 'choices' in data and isinstance(data['choices'], list):
                        return ''.join([c.get('text','') for c in data['choices']]).strip()
                # fallback to text
            except Exception as e:
                print(f"LLM response parse error: {e}")
            # fallback: read raw text
            txt = await resp.text()
            return txt.strip()

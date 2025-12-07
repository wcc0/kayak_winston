import os
import asyncio
from typing import Dict, List

from fastapi import FastAPI, HTTPException, WebSocket
from pydantic import BaseModel
import aiohttp
from . import llm as llm_client
from . import llm_react
from .db import get_session, init_db
from .models import Deal, Bundle
from sqlmodel import select
import json

import asyncio

DEALS_AGENT_URL = os.environ.get('DEALS_AGENT_URL', 'http://host.docker.internal:18001')

app = FastAPI(title='Concierge Agent')


class ChatRequest(BaseModel):
    session_id: str
    message: str


sessions: Dict[str, List[Dict[str, str]]] = {}


@app.get('/health')
async def health():
    return {'status': 'ok'}


@app.on_event('startup')
async def startup():
    # ensure DB exists
    try:
        await init_db()
    except Exception:
        pass


@app.websocket('/events')
async def events_ws(ws: WebSocket):
    await ws.accept()
    try:
        while True:
            data = await ws.receive_text()
            # echo or ignore; clients primarily listen
            await ws.send_text(f'ack: {data}')
    except Exception:
        await ws.close()


@app.post('/events')
async def post_event(evt: dict):
    # simple relay: write to DB if listing/deal and return ok
    try:
        if 'listing_id' in evt:
            async with get_session() as sess:
                d = Deal(listing_id=evt.get('listing_id'), price=evt.get('price'), availability=evt.get('availability'), tags=json.dumps(evt.get('tags', [])), neighbourhood=evt.get('neighbourhood'), raw=json.dumps(evt))
                sess.add(d)
                await sess.commit()
        return {'ok': True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def call_deals_normalize(payload: dict) -> dict:
    url = f"{DEALS_AGENT_URL}/agent/normalize"
    async with aiohttp.ClientSession() as sess:
        async with sess.post(url, json=payload, timeout=10) as resp:
            text = await resp.text()
            if resp.status >= 300:
                raise HTTPException(status_code=502, detail=f"Deals Agent error: {resp.status} {text[:200]}")
            try:
                return await resp.json()
            except Exception:
                return {'response_text': text}


@app.post('/chat')
async def chat(req: ChatRequest):
    session = sessions.setdefault(req.session_id, [])
    session.append({'sender': 'user', 'text': req.message})

    text = req.message.strip()
    lower = text.lower()

    # Use ReAct when LLM is enabled: expose tools to the model
    if llm_client.LLM_ENABLED:
        # define tools
        async def find_cached_deals(filters: dict = None):
            filters = filters or {}
            async with get_session() as sess:
                q = select(Deal).limit(10)
                res = await sess.exec(q)
                rows = res.all()
                return [r.dict() for r in rows]

        def normalize_tool(raw: dict):
            # call deals normalize API synchronously via aiohttp bridge
            # For simplicity, call HTTP with requests-like sync via aiohttp loop
            import asyncio
            return asyncio.get_event_loop().run_until_complete(call_deals_normalize(raw))

        def plan_bundle_tool(deal_ids: list, name: str = 'Bundle'):
            # simple bundle: collect deals and compute score
            async def _inner():
                async with get_session() as sess:
                    q = select(Deal).where(Deal.id.in_(deal_ids))
                    res = await sess.exec(q)
                    rows = res.all()
                    # compute score: lower price -> higher
                    score = 0.0
                    if rows:
                        prices = [r.price or 0 for r in rows]
                        score = 100.0 / (1.0 + (sum(prices)/len(prices) if prices else 1))
                    b = Bundle(name=name, deal_ids=','.join(map(str,deal_ids)), score=score)
                    sess.add(b)
                    await sess.commit()
                    await sess.refresh(b)
                    return b.dict()
            return asyncio.get_event_loop().run_until_complete(_inner())

        tools = {
            'find_cached_deals': find_cached_deals,
            'normalize': normalize_tool,
            'plan_bundle': plan_bundle_tool,
        }

        react_prompt = f"User: {text}\nGoal: Help the user find trip bundles or set watches. Respond with JSON action or final."
        result = await llm_react.run_react(react_prompt, tools)
        if 'final' in result:
            reply = result['final']
        else:
            reply = str(result)
    else:
        # fallback rule-based
        if any(w in lower for w in ('find deals', 'find me', 'search', 'deals', 'hotels', 'listings')):
            payload = {
                'listing_id': f"concierge-{req.session_id}",
                'date': None,
                'price': None,
                'availability': None,
                'amenities': [],
                'neighbourhood': None,
                'source': 'concierge',
                'raw_query': text,
            }
            try:
                resp = await call_deals_normalize(payload)
                normalized = resp.get('normalized') or {}
                tags = normalized.get('tags') or []
                reply = f"I normalized a sample listing (id={normalized.get('listing_id')}). Tags: {', '.join(tags) or 'none'}."
            except Exception as e:
                reply = f"Sorry — couldn't reach Deals Agent: {e}"
        elif any(g in lower for g in ('hi', 'hello', 'hey')):
            reply = "Hi — I'm your concierge. Ask me to 'find deals' or 'search hotels'."
        elif 'help' in lower:
            reply = "I can help find deals. Try: 'find deals in <city>' or 'search hotels'."
        else:
            reply = "I didn't understand — say 'find deals' to trigger a demo search."

    session.append({'sender': 'bot', 'text': reply})
    return {'session_id': req.session_id, 'reply': reply}

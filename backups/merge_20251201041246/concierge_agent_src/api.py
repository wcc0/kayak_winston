from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from .models import IntentPayload, ChatAction, WatchRequest
from .llm_react import react_loop
from .service_clients import KafkaClient
import time

app = FastAPI(title="Concierge Agent")
_kafka = KafkaClient()


@app.get('/health')
async def health():
    return {'success': True, 'message': 'Concierge agent healthy'}


@app.post('/session')
async def create_session(payload: dict):
    # Simple session creation placeholder
    return {'success': True, 'sessionId': f"sess_{payload.get('bookingId', 'anon')}_{int(time.time())}"}


@app.on_event("startup")
async def startup():
    await _kafka.start()


@app.on_event("shutdown")
async def shutdown():
    await _kafka.stop()


@app.post('/chat', response_model=dict)
async def chat(payload: IntentPayload):
    # Run a small ReAct loop (placeholder)
    result = react_loop(payload.model_dump())
    return JSONResponse({'success': True, 'actions': result.get('actions', [])})


class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active.remove(websocket)

    async def broadcast(self, message: dict):
        for ws in list(self.active):
            try:
                await ws.send_json(message)
            except Exception:
                self.disconnect(ws)


manager = ConnectionManager()


@app.websocket('/events')
async def events_ws(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.post('/watch')
async def set_watch(watch: WatchRequest):
    # In production: persist watch, wire to Kafka, etc.
    # For now, produce a watch.set event to Kafka and acknowledge
    await _kafka.produce_event('watch.events', key=watch.listing_id, value=watch.model_dump())
    return {'success': True, 'message': 'Watch set'}

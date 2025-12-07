import os
import asyncio
from typing import List, Optional
from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks
from pydantic import BaseModel
import ujson as json

try:
    from aiokafka import AIOKafkaProducer
except Exception:
    AIOKafkaProducer = None

KAFKA_BOOTSTRAP = os.environ.get('KAFKA_BOOTSTRAP', 'localhost:29092')
RAW_TOPIC = os.environ.get('RAW_TOPIC', 'raw_supplier_feeds')

app = FastAPI(title='Middleware Kafka Bridge')


class IngestRecord(BaseModel):
    listing_id: Optional[str]
    date: Optional[str]
    price: Optional[float]
    availability: Optional[int]
    amenities: Optional[List[str]] = None
    neighbourhood: Optional[str] = None


@app.on_event('startup')
async def startup():
    app.state.producer = None
    if AIOKafkaProducer is not None:
        try:
            p = AIOKafkaProducer(bootstrap_servers=KAFKA_BOOTSTRAP, value_serializer=lambda v: json.dumps(v).encode('utf-8'))
            await p.start()
            app.state.producer = p
            print('Kafka producer started')
        except Exception as e:
            print('Kafka producer start failed:', e)


@app.on_event('shutdown')
async def shutdown():
    p = app.state.producer
    if p is not None:
        await p.stop()


@app.get('/health')
async def health():
    ok = True
    kafka_connected = app.state.producer is not None
    return {'status': 'ok', 'kafka': {'connected': kafka_connected}}


@app.post('/ingest')
async def ingest(records: List[IngestRecord]):
    if not records:
        raise HTTPException(status_code=400, detail='empty payload')

    producer = app.state.producer
    accepted = 0
    rejected = 0
    details = []
    for r in records:
        payload = r.model_dump()
        try:
            if producer:
                await producer.send_and_wait(RAW_TOPIC, payload)
            else:
                # fallback: write to a local file for offline testing
                with open('ingest_fallback.log', 'a', encoding='utf-8') as fh:
                    fh.write(json.dumps(payload) + '\n')
            accepted += 1
            details.append({'listing_id': payload.get('listing_id'), 'status': 'accepted'})
        except Exception as e:
            rejected += 1
            details.append({'listing_id': payload.get('listing_id'), 'status': 'error', 'error': str(e)})

    return {'accepted': accepted, 'rejected': rejected, 'details': details}


@app.post('/produce-row')
async def produce_row(topic: str, payload: dict):
    producer = app.state.producer
    if not producer:
        raise HTTPException(status_code=502, detail='Kafka producer not available')
    try:
        await producer.send_and_wait(topic, payload)
        return {'status': 'ok', 'topic': topic}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@app.post('/upload-csv')
async def upload_csv(file: UploadFile = File(...), background_tasks: BackgroundTasks = None):
    # Simple streaming: read lines and enqueue each as JSON record
    producer = app.state.producer
    temp_path = f"uploads/{file.filename}"
    os.makedirs('uploads', exist_ok=True)
    with open(temp_path, 'wb') as fh:
        fh.write(await file.read())

    async def _stream_file(path):
        with open(path, 'r', encoding='utf-8') as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                # naive CSV -> JSON heuristic; assume headerless JSON-lines or simple CSV
                try:
                    obj = json.loads(line)
                except Exception:
                    parts = [p.strip() for p in line.split(',')]
                    # best-effort map
                    obj = {'raw_row': parts}
                try:
                    if producer:
                        await producer.send_and_wait(RAW_TOPIC, obj)
                    else:
                        with open('ingest_fallback.log', 'a', encoding='utf-8') as fh:
                            fh.write(json.dumps(obj) + '\n')
                except Exception as e:
                    print('stream send error', e)

    # run in background so API returns quickly
    if background_tasks is not None:
        background_tasks.add_task(_stream_file, temp_path)
    else:
        asyncio.create_task(_stream_file(temp_path))

    return {'message': 'ingestion started', 'file': file.filename}

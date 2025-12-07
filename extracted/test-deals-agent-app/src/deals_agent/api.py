import os
import asyncio
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from . import light_processor as processor

app = FastAPI(title='Deals Agent API')

class RawRecord(BaseModel):
    __root__: dict

@app.get('/agent/health')
async def health():
    return {'status': 'ok'}

@app.post('/agent/normalize')
async def normalize(record: RawRecord):
    try:
        raw = record.__root__
        normalized = await processor.normalize_record(raw)
        return {'success': True, 'normalized': normalized}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post('/agent/ingest')
async def ingest(record: RawRecord, persist: bool = True):
    try:
        raw = record.__root__
        normalized = await processor.normalize_record(raw)
        # create aiohttp session if DIRECT_OUTPUT_URL is set
        aiohttp_sess = None
        if processor.DIRECT_OUTPUT_URL:
            import aiohttp
            aiohttp_sess = aiohttp.ClientSession()
        # process (produce to kafka if enabled, persist to db, file sink, direct post)
        await processor.process_normalized(normalized, producer=None, aiohttp_sess=aiohttp_sess)
        if aiohttp_sess:
            await aiohttp_sess.close()
        return {'success': True, 'normalized': normalized}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# convenience route: POST raw and return persisted status
@app.post('/agent/process')
async def process_only(record: RawRecord):
    try:
        raw = record.__root__
        normalized = await processor.normalize_record(raw)
        return {'success': True, 'normalized': normalized}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == '__main__':
    import uvicorn
    uvicorn.run('deals_agent.api:app', host='0.0.0.0', port=int(os.environ.get('AGENT_PORT', 8000)), log_level='info')

import os
import asyncio
from typing import Dict, List, Optional

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import aiohttp
from aiokafka import AIOKafkaConsumer
from . import llm as llm_client
from .db import get_session, init_db
from .models import Deal, Bundle, Watch
from sqlmodel import select, create_engine, Session, SQLModel, Field as SQLField
from sqlalchemy import Column
from sqlalchemy.sql.sqltypes import String, Integer, Float, Boolean, DateTime
from datetime import datetime
import json

# Define models to read from deals_agent database (not for creating tables here)
class HotelModel(SQLModel, table=True):
    __tablename__ = "hotelmodel"
    id: Optional[int] = SQLField(default=None, primary_key=True)
    external_id: Optional[str] = None
    listing_id: Optional[str] = None
    name: Optional[str] = None
    price_per_night: Optional[float] = None
    city: Optional[str] = None
    neighbourhood: Optional[str] = None
    availability: Optional[int] = None
    is_pet_friendly: Optional[bool] = False
    has_breakfast: Optional[bool] = False
    near_transit: Optional[bool] = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class FlightModel(SQLModel, table=True):
    __tablename__ = "flightmodel"
    id: Optional[int] = SQLField(default=None, primary_key=True)
    external_id: Optional[str] = None
    listing_id: Optional[str] = None
    origin: Optional[str] = None
    destination: Optional[str] = None
    airline: Optional[str] = None
    price: Optional[float] = None
    stops: Optional[int] = 0
    duration_minutes: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

DEALS_AGENT_URL = os.environ.get('DEALS_AGENT_URL', 'http://host.docker.internal:18001')
KAFKA_BOOTSTRAP = os.environ.get('KAFKA_BOOTSTRAP', 'localhost:9092')
DEALS_TAGGED_TOPIC = os.environ.get('DEALS_TAGGED_TOPIC', 'deals.tagged')
DEAL_EVENTS_TOPIC = os.environ.get('DEAL_EVENTS_TOPIC', 'deal.events')

# Path to shared deals database (created by deals_agent)
# Try multiple possible paths (K8s, local dev, Windows)
DEALS_DB_CANDIDATES = [
    "/shared/deals.db",  # K8s shared volume
    "/app/data/deals.db",  # K8s local volume
    "/data/deals.db",  # K8s mount point
    r"C:\Users\winston\kayak2\kayak_winston\services\deals_agent\deals.db",  # Windows local - kayak_winston
    r"C:\Users\winston\kayak2\jottx\services\deals_agent\data\normalized\deals.db",  # Windows local - jottx
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "deals_agent", "deals.db")),
]

DEALS_DB_PATH = None
for candidate in DEALS_DB_CANDIDATES:
    if os.path.exists(candidate):
        DEALS_DB_PATH = candidate
        print(f"Found deals.db at: {DEALS_DB_PATH}")
        break

if not DEALS_DB_PATH:
    print(f"WARNING: Could not find deals.db in candidate paths: {DEALS_DB_CANDIDATES}")
    print(f"Falling back to: {DEALS_DB_CANDIDATES[0]}")
    DEALS_DB_PATH = DEALS_DB_CANDIDATES[0]

# Convert backslashes to forward slashes for SQLite URL on Windows
DEALS_DB_URL = f"sqlite:///{DEALS_DB_PATH.replace(chr(92), '/')}"
print(f"Using deals database at: {DEALS_DB_PATH}")
print(f"URL: {DEALS_DB_URL}")

def get_deals_engine():
    """Get SQLAlchemy engine for shared deals database"""
    return create_engine(DEALS_DB_URL, echo=False)

app = FastAPI(title='Concierge Agent')

# Enable CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://127.0.0.1:3001", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print(f"DEBUG: LLM_ENABLED = {llm_client.LLM_ENABLED}")
print(f"DEBUG: LLM_PROVIDER = {llm_client.LLM_PROVIDER}")
print(f"DEBUG: LLM_URL = {llm_client.LLM_URL}")
print(f"DEBUG: LLM_MODEL = {llm_client.LLM_MODEL}")


class ChatRequest(BaseModel):
    session_id: str
    message: str

class BundleRequest(BaseModel):
    """Request for trip bundles"""
    origin: Optional[str] = Field(default=None, description="IATA for origin")
    destination: Optional[str] = Field(default=None, description="IATA or city")
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    budget: Optional[float] = Field(default=None, description="Total budget for flight+hotel")
    constraints: Optional[List[str]] = Field(default=None, description="amenity/policy filters e.g. pet-friendly")
    max_results: int = Field(default=5, le=10)

class WatchRequest(BaseModel):
    """Set a watch on a bundle for price/inventory changes"""
    session_id: str
    bundle_id: str
    threshold_price: Optional[float] = None
    min_inventory: Optional[int] = None


class BundleResponse(BaseModel):
    bundle_id: str
    total_price: float
    hotel_price: float
    flight_price: float
    fit_score: float
    why_this: str
    what_to_watch: str
    summary: str
    details: Dict[str, str]


sessions: Dict[str, List[Dict[str, str]]] = {}
connected_ws = set()


@app.get('/health')
async def health():
    return {'status': 'healthy', 'kafka': KAFKA_BOOTSTRAP}


@app.on_event('startup')
async def startup():
    # ensure DB exists
    try:
        await init_db()
    except Exception:
        pass
    # Start Kafka consumer for deals in background (disabled - reading from DB directly now)
    # asyncio.create_task(consume_deals_from_kafka())
    asyncio.create_task(watch_checker())


async def broadcast_to_websockets(message: dict):
    """Send message to all connected WebSocket clients"""
    disconnected = set()
    for ws in list(connected_ws):
        try:
            await ws.send_json(message)
        except Exception:
            disconnected.add(ws)
    
    for ws in disconnected:
        connected_ws.discard(ws)

async def consume_deals_from_kafka():
    """Background task: consume deals from Kafka deals.tagged and persist to DB"""
    consumer = AIOKafkaConsumer(
        DEALS_TAGGED_TOPIC,
        bootstrap_servers=KAFKA_BOOTSTRAP,
        group_id='concierge-agent-consumer',
        value_deserializer=lambda v: json.loads(v.decode('utf-8')),
        auto_offset_reset='latest'
    )
    
    await consumer.start()
    print(f"✅ Concierge Agent consuming from {DEALS_TAGGED_TOPIC}")
    
    try:
        async for msg in consumer:
            deal_wrapper = msg.value
            try:
                # Extract the actual deal data from the wrapper
                # Kafka messages have structure: {id, type, data: {...}, tags: [...], deal_score, ...}
                deal_data = deal_wrapper.get('data') or deal_wrapper
                
                # Extract key fields from either top-level or nested data
                listing_id = deal_wrapper.get('listing_id') or deal_data.get('listing_id') or deal_data.get('id')
                date_str = deal_wrapper.get('date') or deal_data.get('date')
                
                # Skip if no valid listing_id
                if not listing_id:
                    continue
                
                async with get_session() as sess:
                    # Check if deal already exists (dedup by listing_id + date)
                    existing = await sess.exec(
                        select(Deal).where(
                            Deal.listing_id == listing_id,
                            Deal.date == date_str
                        )
                    )
                    if existing.first():
                        continue
                    
                    # Extract nested tags if present
                    tags_list = deal_wrapper.get('tags') or deal_data.get('tags', [])
                    
                    deal = Deal(
                        listing_id=listing_id,
                        date=date_str,
                        price=deal_wrapper.get('price') or deal_data.get('price'),
                        availability=deal_wrapper.get('availability') or deal_data.get('availability'),
                        tags=json.dumps(tags_list),
                        neighbourhood=deal_wrapper.get('neighbourhood') or deal_data.get('neighbourhood'),
                        source=deal_wrapper.get('source') or deal_data.get('source'),
                        raw=json.dumps(deal_wrapper)
                    )
                    sess.add(deal)
                    await sess.commit()
                    
                    # Broadcast hot deals (score >= 3)
                    deal_score = deal_wrapper.get('deal_score', 0)
                    is_deal = deal_wrapper.get('is_deal', False)
                    if is_deal and deal_score >= 3:
                        notification = {
                            'type': 'deal_alert',
                            'listing_id': listing_id,
                            'price': deal_data.get('price'),
                            'deal_score': deal_score,
                            'tags': tags_list,
                            'neighbourhood': deal_data.get('neighbourhood')
                        }
                        await broadcast_to_websockets(notification)
                        
            except Exception as e:
                print(f"Error processing deal: {e}")
                # Continue processing next message even if one fails
                
    finally:
        await consumer.stop()

@app.websocket('/events')
async def events_ws(ws: WebSocket):
    await ws.accept()
    connected_ws.add(ws)
    try:
        while True:
            data = await ws.receive_text()
            # echo or ignore; clients primarily listen
            await ws.send_text(f'ack: {data}')
    except (WebSocketDisconnect, Exception):
        pass
    finally:
        connected_ws.discard(ws)


@app.post('/events')
async def post_event(evt: dict):
    # simple relay: write to DB if listing/deal and return ok
    try:
        if 'listing_id' in evt:
            async with get_session() as sess:
                d = Deal(listing_id=evt.get('listing_id'), price=evt.get('price'), availability=evt.get('availability'), tags=json.dumps(evt.get('tags', [])), neighbourhood=evt.get('neighbourhood'), raw=json.dumps(evt))
                sess.add(d)
                await sess.commit()
        # broadcast to connected websockets
        msg = json.dumps(evt)
        for ws in list(connected_ws):
            try:
                await ws.send_text(msg)
            except Exception:
                try:
                    await ws.close()
                except Exception:
                    pass
                connected_ws.discard(ws)
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


def _classify_deal(deal: Deal) -> str:
    tags = (deal.tags or '').lower()
    raw = (deal.raw or '').lower() if deal.raw else ''
    if 'flight' in tags or 'iata' in raw or 'airline' in raw:
        return 'flight'
    return 'hotel'


def _fit_score(total_price: float, budget: Optional[float], constraint_hits: int, constraint_total: int) -> float:
    budget_term = 1.0
    if budget:
        if total_price <= budget:
            budget_term = 1.2 - (total_price / max(budget, 1)) * 0.2
        else:
            over = (total_price - budget) / max(budget, 1)
            budget_term = max(0.4, 1.0 - over)
    constraint_term = 0.5 + (constraint_hits / max(constraint_total, 1)) * 0.5
    return round(min(1.25, budget_term * constraint_term), 3)


async def _compose_bundles(req: BundleRequest) -> List[BundleResponse]:
    async with get_session() as sess:
        deals = await sess.exec(select(Deal).order_by(Deal.created_at.desc()).limit(200))
        deals_list = deals.all()

    flights = [d for d in deals_list if _classify_deal(d) == 'flight']
    hotels = [d for d in deals_list if _classify_deal(d) == 'hotel']

    bundles: List[BundleResponse] = []
    constraints_lower = [c.lower() for c in (req.constraints or [])]

    for flight in flights:
        for hotel in hotels:
            total_price = (flight.price or 0) + (hotel.price or 0)
            tags = ((flight.tags or '') + ' ' + (hotel.tags or '')).lower()
            hit = sum(1 for c in constraints_lower if c in tags)
            fit = _fit_score(total_price, req.budget, hit, len(constraints_lower))
            bundle_id = f"BND-{flight.listing_id}-{hotel.listing_id}"
            bundles.append(BundleResponse(
                bundle_id=bundle_id,
                total_price=round(total_price, 2),
                hotel_price=hotel.price or 0,
                flight_price=flight.price or 0,
                fit_score=fit,
                why_this=f"{hotel.neighbourhood or 'Central'} + {flight.listing_id} fits budget {req.budget or 'N/A'}",
                what_to_watch="Price drops & inventory",
                summary=f"{flight.listing_id} + {hotel.listing_id} | ${total_price:.0f} | tags: {tags[:60]}",
                details={
                    'flight_listing_id': flight.listing_id,
                    'hotel_listing_id': hotel.listing_id,
                    'neighbourhood': hotel.neighbourhood or 'unknown',
                    'constraints_hit': str(hit)
                }
            ))

    bundles.sort(key=lambda b: (-b.fit_score, b.total_price))
    return bundles[: req.max_results]


# OLD ENDPOINT - REPLACED BY NEW IMPLEMENTATION BELOW
# @app.post('/bundles')
# async def bundles(req: BundleRequest):
#     bundles = await _compose_bundles(req)
#     return {'success': True, 'data': bundles}


@app.post('/watch')
async def set_watch(req: WatchRequest):
    async with get_session() as sess:
        watch = Watch(
            session_id=req.session_id,
            bundle_id=req.bundle_id,
            threshold_price=req.threshold_price,
            min_inventory=req.min_inventory,
        )
        sess.add(watch)
        await sess.commit()
        await sess.refresh(watch)
        return {'success': True, 'data': {'watch_id': watch.id}}


async def watch_checker():
    while True:
        try:
            async with get_session() as sess:
                watches = await sess.exec(select(Watch))
                watch_list = watches.all()
                if not watch_list:
                    await asyncio.sleep(15)
                    continue
                deals = await sess.exec(select(Deal).order_by(Deal.created_at.desc()).limit(200))
                deals_map = {d.listing_id: d for d in deals}
                for w in watch_list:
                    deal = deals_map.get(str(w.bundle_id)) or deals_map.get(w.bundle_id)
                    if not deal:
                        continue
                    triggered = False
                    if w.threshold_price and deal.price and deal.price <= w.threshold_price:
                        triggered = True
                    if w.min_inventory and deal.availability and deal.availability <= w.min_inventory:
                        triggered = True
                    if triggered:
                        await broadcast_to_websockets({
                            'type': 'watch_alert',
                            'bundle_id': w.bundle_id,
                            'price': deal.price,
                            'availability': deal.availability
                        })
        except Exception as e:
            print('watch_checker error', e)
        await asyncio.sleep(20)


@app.post('/chat')
async def chat(req: ChatRequest):
    """Chat endpoint - LLM responses + auto-fetch bundles for travel queries"""
    if not llm_client.LLM_ENABLED:
        raise HTTPException(
            status_code=503,
            detail="LLM service is not enabled. Ollama must be running at http://localhost:11434"
        )
    
    session = sessions.setdefault(req.session_id, [])
    session.append({'sender': 'user', 'text': req.message})

    # Load all available data for LLM context
    engine = get_deals_engine()
    with Session(engine) as sess:
        hotels = sess.exec(select(HotelModel).limit(100)).all()
        flights = sess.exec(select(FlightModel).limit(100)).all()
    
    # Build rich context JSON for LLM
    hotels_context = json.dumps([
        {
            'name': h.name,
            'city': h.city,
            'neighbourhood': h.neighbourhood,
            'price_per_night': h.price_per_night,
            'pet_friendly': h.is_pet_friendly,
            'has_breakfast': h.has_breakfast,
            'near_transit': h.near_transit,
            'availability': h.availability
        }
        for h in hotels
    ], indent=2)
    
    flights_context = json.dumps([
        {
            'origin': f.origin,
            'destination': f.destination,
            'airline': f.airline,
            'price': f.price,
            'stops': f.stops
        }
        for f in flights
    ], indent=2)
    
    # First: Use LLM to determine if this is a travel search and extract parameters
    # Key change: Always try to extract location data, even if user is vague
    extraction_prompt = f"""Analyze this user message: "{req.message}"

ALWAYS extract locations if present (even if vague). Look for: origins (SFO, LAX, NYC, etc), destinations, dates, budget, constraints.

Respond ONLY with valid JSON:
{{
  "is_travel_query": true/false,
  "has_location": true/false,
  "origin": "extracted or null",
  "destination": "extracted or null", 
  "budget": number or null,
  "constraints": ["pet-friendly", "breakfast", "near transit"] or [],
  "max_results": 3
}}

Mark is_travel_query=true if clearly asking for recommendations.
Mark has_location=true if ANY origin or destination is mentioned."""

    intent_response = await llm_client.generate(extraction_prompt, max_tokens=200, temperature=0.3)
    
    bundles = None
    try:
        # Try to parse JSON from LLM response
        json_match = intent_response.find('{')
        if json_match >= 0:
            json_str = intent_response[json_match:]
            intent_data = json.loads(json_str)
            
            # If travel query OR location mentioned, fetch bundles
            if intent_data.get('is_travel_query') or intent_data.get('has_location'):
                try:
                    bundle_request = BundleRequest(
                        origin=intent_data.get('origin'),
                        destination=intent_data.get('destination'),
                        budget=intent_data.get('budget'),
                        constraints=intent_data.get('constraints', []),
                        max_results=intent_data.get('max_results', 3)
                    )
                    
                    # Call bundles endpoint
                    with Session(engine) as sess:
                        hotels_query = sess.exec(select(HotelModel).limit(200)).all()
                        flights_query = sess.exec(select(FlightModel).limit(200)).all()
                    
                    # Build bundles context
                    hotels_data = [
                        {
                            'id': h.id,
                            'name': h.name,
                            'city': h.city,
                            'neighbourhood': h.neighbourhood,
                            'price_per_night': h.price_per_night,
                            'pet_friendly': h.is_pet_friendly,
                            'has_breakfast': h.has_breakfast,
                            'near_transit': h.near_transit,
                            'availability': h.availability
                        }
                        for h in hotels_query
                    ]
                    
                    flights_data = [
                        {
                            'id': f.id,
                            'origin': f.origin,
                            'destination': f.destination,
                            'airline': f.airline,
                            'price': f.price,
                            'stops': f.stops,
                            'duration_minutes': f.duration_minutes
                        }
                        for f in flights_query
                    ]
                    
                    constraint_str = ', '.join(bundle_request.constraints) if bundle_request.constraints else 'none'
                    budget_str = f"${bundle_request.budget}" if bundle_request.budget else "no budget"
                    
                    llm_prompt_bundles = f"""Create the best {bundle_request.max_results} trip bundles for:
- From: {bundle_request.origin or 'any'}
- To: {bundle_request.destination or 'any'}
- Budget: {budget_str}
- Must have: {constraint_str}

AVAILABLE HOTELS:
{json.dumps(hotels_data[:20], indent=1)}

AVAILABLE FLIGHTS:
{json.dumps(flights_data[:20], indent=1)}

Return ONLY valid JSON array with {bundle_request.max_results} bundles. Example:
[{{"bundle_id":"b1","flight":{{"origin":"SFO","destination":"LAX","airline":"United","price":280,"stops":0}},"hotel":{{"name":"Hotel","city":"LAX","neighbourhood":"Downtown","price_per_night":150,"nights":3,"tags":["pet-friendly","breakfast","near transit"]}},"total_price":720,"fit_score":85,"why_this":"Great value","what_to_watch":"Limited"}}]

IMPORTANT:
- Include "tags" array in hotel (pet-friendly, breakfast, near transit, wifi, etc)
- why_this ≤ 25 words
- what_to_watch ≤ 12 words
- fit_score 0-100"""
                    
                    bundle_response = await llm_client.generate(llm_prompt_bundles, max_tokens=2000, temperature=0.5)
                    
                    # Parse bundles JSON
                    json_start = bundle_response.find('[')
                    json_end = bundle_response.rfind(']') + 1
                    if json_start >= 0 and json_end > json_start:
                        bundles = json.loads(bundle_response[json_start:json_end])
                except Exception as e:
                    print(f"Bundle generation error: {e}")
                    bundles = None
    except Exception as e:
        print(f"Intent extraction error: {e}")
    
    # Now generate main chat response
    llm_prompt = f"""You are a KAYAK travel concierge AI assistant. The user has asked:
"{req.message}"

Here is the complete travel database available:

HOTELS:
{hotels_context}

FLIGHTS:
{flights_context}

Using this real data, respond naturally and helpfully to the user's request. 
- If they ask for recommendations, use the actual hotel/flight data from the database
- Mention specific hotels, prices, cities, and amenities
- Be conversational and natural, not robotic
- If the question is not travel-related, politely redirect to travel topics
- Keep responses 2-4 sentences unless more detail is needed"""

    reply = await llm_client.generate(llm_prompt, max_tokens=300, temperature=0.7)
    
    if not reply or len(reply.strip()) < 5:
        raise HTTPException(
            status_code=502,
            detail=f"LLM service returned empty response"
        )

    session.append({'sender': 'bot', 'text': reply})
    
    # Return response with bundles if found
    response = {
        'session_id': req.session_id, 
        'message': reply
    }
    
    if bundles and len(bundles) > 0:
        response['bundles'] = bundles[:3]
        response['bundles_count'] = len(bundles)
    
    return response



@app.post('/bundles')
async def create_bundles(req: BundleRequest):
    """Create trip bundles - LLM powered to find best matches and explain them"""
    if not llm_client.LLM_ENABLED:
        raise HTTPException(
            status_code=503,
            detail="LLM service is not enabled. Ollama must be running."
        )
    
    try:
        # Get all available data
        engine = get_deals_engine()
        with Session(engine) as sess:
            hotels = sess.exec(select(HotelModel).limit(200)).all()
            flights = sess.exec(select(FlightModel).limit(200)).all()
        
        print(f"DEBUG: Found {len(hotels)} hotels, {len(flights)} flights")
        
        # Build database context as JSON for LLM
        hotels_data = [
            {
                'id': h.id,
                'name': h.name,
                'city': h.city,
                'neighbourhood': h.neighbourhood,
                'price_per_night': h.price_per_night,
                'pet_friendly': h.is_pet_friendly,
                'has_breakfast': h.has_breakfast,
                'near_transit': h.near_transit,
                'availability': h.availability
            }
            for h in hotels
        ]
        
        flights_data = [
            {
                'id': f.id,
                'origin': f.origin,
                'destination': f.destination,
                'airline': f.airline,
                'price': f.price,
                'stops': f.stops,
                'duration_minutes': f.duration_minutes
            }
            for f in flights
        ]
        
        constraint_str = ', '.join(req.constraints) if req.constraints else 'none'
        budget_str = f"${req.budget}" if req.budget else "no budget limit"
        start_date_str = req.start_date or "flexible dates"
        end_date_str = req.end_date or "flexible dates"
        
        llm_prompt = f"""Create the best {req.max_results} trip bundles for this request:

TRIP REQUEST:
- From: {req.origin}
- To: {req.destination}
- Check-in: {start_date_str}
- Check-out: {end_date_str}
- Budget: {budget_str}
- Must have: {constraint_str}

AVAILABLE HOTELS:
{json.dumps(hotels_data, indent=1)}

AVAILABLE FLIGHTS:
{json.dumps(flights_data, indent=1)}

Return ONLY a JSON array with {req.max_results} bundles. Example format:
[{{"bundle_id":"b1","flight":{{"origin":"LAX","destination":"NYC","airline":"United","price":300,"stops":0}},"hotel":{{"name":"Hotel","city":"NYC","neighbourhood":"Midtown","price_per_night":150,"nights":3,"tags":["pet-friendly"]}},"total_price":750,"fit_score":85,"why_this":"Good value pet-friendly","what_to_watch":"Check availability"}}]

Requirements: why_this ≤ 25 words, what_to_watch ≤ 12 words, fit_score 0-100"""

        print(f"DEBUG: Calling LLM with prompt length {len(llm_prompt)}")
        reply = await llm_client.generate(llm_prompt, max_tokens=2000, temperature=0.5)
        
        print(f"DEBUG: LLM response length: {len(reply)}")
        print(f"DEBUG: LLM response (first 200 chars): {reply[:200]}")
        
        if not reply or len(reply.strip()) < 50:
            return {
                'bundles': [],
                'count': 0,
                'error': 'LLM returned empty response'
            }
        
        # Parse LLM response as JSON
        try:
            # Find JSON array in response
            json_start = reply.find('[')
            json_end = reply.rfind(']') + 1
            if json_start >= 0 and json_end > json_start:
                json_str = reply[json_start:json_end]
                bundles = json.loads(json_str)
            else:
                bundles = json.loads(reply)
            
            print(f"DEBUG: Parsed {len(bundles)} bundles from LLM")
            
            return {
                'bundles': bundles[:req.max_results] if isinstance(bundles, list) else [],
                'count': len(bundles) if isinstance(bundles, list) else 0
            }
        except json.JSONDecodeError as e:
            print(f"DEBUG: JSON parse error: {e}")
            print(f"DEBUG: Failed to parse: {reply[:300]}")
            return {
                'bundles': [],
                'count': 0,
                'raw_response': reply[:300],
                'parse_error': str(e)
            }
    except Exception as e:
        import traceback
        print(f"ERROR in /bundles: {traceback.format_exc()}")
        return {
            'bundles': [],
            'count': 0,
            'error': str(e)
        }

@app.post('/watches')
async def create_watch(req: WatchRequest):
    """Set price/inventory thresholds for async WebSocket alerts"""
    async with get_session() as sess:
        watch = Watch(
            session_id=req.session_id,
            bundle_id=int(req.bundle_id.split('_')[1]) if '_' in req.bundle_id else None,
            threshold_price=req.threshold_price,
            min_inventory=req.min_inventory
        )
        sess.add(watch)
        await sess.commit()
        await sess.refresh(watch)
        
        return {'watch_id': watch.id, 'message': f"Watching {req.bundle_id} for alerts"}

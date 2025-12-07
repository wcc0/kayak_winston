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
    city: Optional[str] = None
    neighbourhood: Optional[str] = None
    price_per_night: float = 0.0
    availability: int = 30
    amenities: Optional[str] = None
    is_pet_friendly: bool = False
    has_breakfast: bool = False
    near_transit: bool = False
    avg_price_30d: Optional[float] = None
    source: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class FlightModel(SQLModel, table=True):
    __tablename__ = "flightmodel"
    id: Optional[int] = SQLField(default=None, primary_key=True)
    external_id: Optional[str] = None
    origin: str
    destination: str
    airline: Optional[str] = None
    price: float
    seats_available: int = 100
    stops: int = 0
    duration_minutes: Optional[int] = None
    avg_price_30d: Optional[float] = None
    source: Optional[str] = None
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
    r"C:\Users\winston\kayak2\jottx\services\deals_agent\data\normalized\deals.db",  # Windows local
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "services", "deals_agent", "data", "normalized", "deals.db")),
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


@app.post('/bundles')
async def bundles(req: BundleRequest):
    bundles = await _compose_bundles(req)
    return {'success': True, 'data': bundles}


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
    """Chat endpoint - requires Ollama LLM for all responses, no fallbacks"""
    if not llm_client.LLM_ENABLED:
        raise HTTPException(
            status_code=503,
            detail="LLM service is not enabled. Ollama must be running at http://localhost:11434 with llama3.2:latest model"
        )
    
    session = sessions.setdefault(req.session_id, [])
    session.append({'sender': 'user', 'text': req.message})

    text = req.message.strip()
    lower = text.lower()
    import re

    # Extract structured parameters from user input
    destination = None
    city_keywords = [
        'san francisco', 'sf', 'los angeles', 'la', 'seattle', 'boston', 'chicago',
        'manhattan', 'brooklyn', 'queens', 'nyc', 'new york', 'harlem', 'soho', 'chelsea',
        'miami', 'denver', 'austin', 'portland', 'philadelphia'
    ]
    for city in city_keywords:
        if city in lower:
            destination = city
            break
    
    constraints = []
    if 'pet' in lower or 'dog' in lower or 'cat' in lower:
        constraints.append('pet-friendly')
    if 'breakfast' in lower:
        constraints.append('breakfast')
    if 'transit' in lower or 'subway' in lower or 'metro' in lower:
        constraints.append('near-transit')
    if 'wifi' in lower or 'internet' in lower:
        constraints.append('wifi')
    
    budget_match = re.search(r'\$?\s*(\d+)', text)
    budget = float(budget_match.group(1)) if budget_match else None

    # Check if user is asking for deals
    if any(w in lower for w in ['find', 'search', 'show', 'get', 'book', 'hotel', 'flight']):
        # Fetch actual deals from shared deals database
        engine = get_deals_engine()
        with Session(engine) as sess:
            hotels_stmt = select(HotelModel).limit(500)
            hotels_query = sess.exec(hotels_stmt).all()
            
            flights_stmt = select(FlightModel).limit(500)
            flights_query = sess.exec(flights_stmt).all()
            
            all_hotels = [
                {
                    'id': h.id,
                    'type': 'hotel',
                    'name': h.name,
                    'neighbourhood': h.neighbourhood,
                    'price': h.price_per_night,
                    'availability': h.availability,
                    'is_pet_friendly': h.is_pet_friendly,
                    'has_breakfast': h.has_breakfast,
                    'near_transit': h.near_transit,
                    'source': h.source
                }
                for h in hotels_query
            ]
            
            all_flights = [
                {
                    'id': f.id,
                    'type': 'flight',
                    'origin': f.origin,
                    'destination': f.destination,
                    'airline': f.airline,
                    'price': f.price,
                    'seats_available': f.seats_available,
                    'stops': f.stops,
                }
                for f in flights_query
            ]
            
            # Apply filters
            valid_hotels = [d for d in all_hotels if d.get('price') and d.get('price') > 0]
            
            if destination:
                valid_hotels = [d for d in valid_hotels if d.get('neighbourhood') and destination.lower() in str(d.get('neighbourhood', '')).lower()]
            
            if budget:
                valid_hotels = [d for d in valid_hotels if d.get('price', float('inf')) <= budget]
            
            if constraints:
                filtered = []
                for h in valid_hotels:
                    match = False
                    for c in constraints:
                        if c == 'pet-friendly' and h.get('is_pet_friendly'):
                            match = True
                        elif c == 'breakfast' and h.get('has_breakfast'):
                            match = True
                        elif c == 'near-transit' and h.get('near_transit'):
                            match = True
                        elif c == 'wifi':
                            match = True
                    if match:
                        filtered.append(h)
                valid_hotels = filtered if filtered else valid_hotels
            
            if not valid_hotels and not all_hotels:
                raise HTTPException(
                    status_code=503,
                    detail="No hotel data available in database. Deals Agent may not be running."
                )
            
            # Prepare context for LLM
            top_hotels = sorted(valid_hotels, key=lambda h: h.get('price', float('inf')))[:5] if valid_hotels else []
            
            deals_json = json.dumps(top_hotels, indent=2)
            available_cities = set(str(d.get('neighbourhood', 'Unknown')) for d in all_hotels if d.get('price', 0) > 0)
            
            llm_prompt = f"""User request: "{text}"

Database info:
- Total hotels: {len(all_hotels)}
- Matching hotels: {len(valid_hotels)}
- Available neighborhoods: {', '.join(sorted(list(available_cities))[:10])}

Top deals found:
{deals_json}

Constraints requested: {', '.join(constraints) if constraints else 'none'}
Budget: ${budget if budget else 'no budget specified'}

Respond naturally as a KAYAK travel concierge. If matching deals exist, highlight the best options with price/location. If no matches found, suggest the best alternatives. Keep to 3-4 sentences."""
            
            reply = await llm_client.generate(llm_prompt, max_tokens=250, temperature=0.6)
            
            if not reply or len(reply.strip()) < 10:
                raise HTTPException(
                    status_code=502,
                    detail=f"LLM returned invalid response: {repr(reply)}"
                )
    else:
        # Non-deal queries - still require LLM
        llm_prompt = f"""User said: "{text}"

You're a KAYAK travel concierge AI. Respond naturally to the user's request.
If they ask for travel help, provide assistance.
If the request is not travel-related, politely redirect to travel topics.
Keep responses concise (1-2 sentences)."""
        
        reply = await llm_client.generate(llm_prompt, max_tokens=100, temperature=0.6)
        
        if not reply or len(reply.strip()) < 5:
            raise HTTPException(
                status_code=502,
                detail=f"LLM returned invalid response: {repr(reply)}"
            )

    session.append({'sender': 'bot', 'text': reply})
    return {'session_id': req.session_id, 'message': reply}



@app.post('/bundles')
async def create_bundles(req: BundleRequest):
    """Create flight+hotel bundles with Fit Score and explanations"""
    async with get_session() as sess:
        q = select(Deal).limit(500)
        
        if req.destination:
            q = q.where(Deal.neighbourhood.ilike(f"%{req.destination}%"))
        
        res = await sess.exec(q)
        deals = list(res.all())
        
        if not deals:
            return {'bundles': [], 'message': 'No deals available yet'}
        
        # Separate flights and hotels
        flights, hotels = [], []
        for deal in deals:
            lid = deal.listing_id or ''
            if lid.startswith('FLT') or 'flight' in str(deal.raw or '').lower():
                flights.append(deal)
            else:
                hotels.append(deal)
        
        # Median price for scoring
        all_prices = [d.price for d in deals if d.price]
        median_price = sorted(all_prices)[len(all_prices)//2] if all_prices else 300
        
        bundles_list = []
        
        for hotel in hotels[:20]:
            hotel_tags = []
            try:
                hotel_tags = json.loads(hotel.tags) if hotel.tags and hotel.tags.startswith('[') else []
            except:
                pass
            
            # Constraint matching
            if req.constraints:
                matches = all(any(c.lower() in str(t).lower() for t in hotel_tags) for c in req.constraints)
                if not matches:
                    continue
            
            flight = flights[0] if flights else None
            hotel_price = hotel.price or 0
            flight_price = flight.price if flight else 0
            total_price = hotel_price + flight_price
            
            if req.budget and total_price > req.budget:
                continue
            
            # Fit Score calculation
            fit_score = 50.0
            
            # Price component (30 points)
            if median_price > 0:
                price_ratio = total_price / median_price
                if price_ratio < 0.85:
                    fit_score += 30
                elif price_ratio < 1.0:
                    fit_score += 15
            
            # Amenity match (25 points)
            if req.constraints:
                match_count = sum(1 for c in req.constraints if any(c.lower() in str(t).lower() for t in hotel_tags))
                fit_score += (match_count / len(req.constraints)) * 25
            
            # Budget fit bonus (10 points)
            if req.budget and total_price < req.budget * 0.8:
                fit_score += 10
            
            fit_score = min(100, max(0, fit_score))
            
            # Why This (≤25 words)
            price_vs_median = int(((median_price - total_price) / median_price * 100)) if median_price > 0 else 0
            why_parts = []
            if price_vs_median > 0:
                why_parts.append(f"{price_vs_median}% below avg")
            if hotel_tags:
                why_parts.append(f"{', '.join(hotel_tags[:2])}")
            if hotel.neighbourhood:
                why_parts.append(hotel.neighbourhood)
            why_this = ' • '.join(why_parts)[:100]
            
            # What to Watch (≤12 words)
            watch_parts = []
            if hotel.availability and hotel.availability < 5:
                watch_parts.append(f"Only {hotel.availability} left")
            if 'refundable' in ' '.join(hotel_tags).lower():
                watch_parts.append("Refund window")
            what_to_watch = ' • '.join(watch_parts)[:50] if watch_parts else "Stable"
            
            bundles_list.append({
                'bundle_id': f"bundle_{hotel.id}",
                'flight': {'listing_id': flight.listing_id if flight else None, 'price': flight_price} if flight else None,
                'hotel': {
                    'listing_id': hotel.listing_id,
                    'price': hotel_price,
                    'neighbourhood': hotel.neighbourhood,
                    'tags': hotel_tags,
                },
                'total_price': round(total_price, 2),
                'fit_score': round(fit_score, 1),
                'why_this': why_this,
                'what_to_watch': what_to_watch,
            })
        
        bundles_list.sort(key=lambda x: x['fit_score'], reverse=True)
        
        return {'bundles': bundles_list[:req.max_results], 'count': len(bundles_list)}

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

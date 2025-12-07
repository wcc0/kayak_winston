"""
Enhanced Concierge Agent API
- /bundles: Trip recommendations with fit scoring
- /chat: Intent extraction + session context
- /watch: Price/inventory alerts via WebSocket
- /events: WebSocket stream for real-time updates
- /policy: Policy Q&A (refund, pet, transit)
"""
import os
import asyncio
import json
import random
from datetime import datetime, date
from typing import Dict, List, Optional, Set

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import sqlalchemy as sa

from pydantic import BaseModel, Field
from .models_v2 import (
    Flight, Hotel, Bundle, Watch,
    BundleRequest, BundleResponse, ChatRequest, ChatResponse,
    WatchRequest, WatchResponse, PolicyResponse
)
from . import llm

# ============================================================================
# Database Setup
# ============================================================================
DB_URL = os.environ.get("CONCIERGE_DB_URL", "sqlite+aiosqlite:///./concierge.db")
engine = create_async_engine(DB_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def init_db():
    """Initialize database tables."""
    from sqlmodel import SQLModel
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)


# ============================================================================
# FastAPI Setup
# ============================================================================
app = FastAPI(
    title="Travel Concierge Agent",
    description="Multi-agent recommendation service with price/inventory watches",
    version="1.0.0"
)

connected_clients: Set[WebSocket] = set()
sessions_context: Dict[str, Dict] = {}  # session_id -> {origin, dest, budget, constraints, ...}

# ============================================================================
# STARTUP / SHUTDOWN
# ============================================================================

@app.on_event("startup")
async def startup():
    await init_db()
    print("✅ Concierge Agent initialized")


@app.on_event("shutdown")
async def shutdown():
    await engine.dispose()


# ============================================================================
# HEALTH CHECK
# ============================================================================

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "concierge-agent",
        "version": "1.0.0"
    }


# ============================================================================
# UTILITIES
# ============================================================================

def classify_listing(obj) -> str:
    """Detect if listing is flight or hotel."""
    if isinstance(obj, Flight):
        return "flight"
    elif isinstance(obj, Hotel):
        return "hotel"
    return "unknown"


def fit_score(
    total_price: float,
    budget: Optional[float],
    amenity_hits: int,
    amenity_total: int,
    location_bonus: float = 1.0
) -> float:
    """
    Compute fit score 0.0-1.5 based on:
    - Price vs budget (50%)
    - Amenity/policy match (35%)
    - Location factor (15%)
    """
    price_score = 0.5
    if budget and budget > 0:
        if total_price <= budget:
            price_score = 0.5 * (1.0 + (budget - total_price) / budget)
        else:
            over = (total_price - budget) / budget
            price_score = max(0.1, 0.5 * (1.0 - min(over, 1.0)))
    
    amenity_score = 0.35 * (amenity_hits / max(amenity_total, 1))
    location_score = 0.15 * location_bonus
    
    return min(1.5, round(price_score + amenity_score + location_score, 3))


async def extract_intent(message: str, session_id: str) -> Dict:
    """
    Extract intent (origin, dest, budget, dates, constraints) from natural language using LLM.
    Preserve prior context.
    """
    context = sessions_context.get(session_id, {})
    
    # Use LLM to extract structured intent
    prompt = f"""Extract travel intent from this message. Return JSON only with these fields (omit if not mentioned):
- origin: IATA airport code (e.g., SFO, NYC, LAX)
- destination: IATA airport code or city
- budget: number only
- constraints: comma-separated list from [pet-friendly, breakfast, near-transit, refundable, wifi, pool]

Previous context: {json.dumps(context)}

User message: {message}

JSON:"""
    
    llm_response = await llm.generate(prompt, max_tokens=150, temperature=0.1)
    
    # Parse LLM JSON response
    intent = {**context}
    try:
        # Try to extract JSON from response
        import re
        json_match = re.search(r'\{[^}]+\}', llm_response)
        if json_match:
            llm_intent = json.loads(json_match.group())
            # Merge with context, prioritizing new values
            if "origin" in llm_intent:
                intent["origin"] = llm_intent["origin"]
            if "destination" in llm_intent:
                intent["destination"] = llm_intent["destination"]
            if "budget" in llm_intent:
                try:
                    intent["budget"] = float(str(llm_intent["budget"]).replace("$", "").replace(",", ""))
                except:
                    pass
            if "constraints" in llm_intent:
                constraints_str = llm_intent["constraints"]
                if isinstance(constraints_str, str):
                    intent["constraints"] = [c.strip() for c in constraints_str.split(",")]
                elif isinstance(constraints_str, list):
                    intent["constraints"] = constraints_str
    except Exception as e:
        print(f"LLM intent parsing error: {e}, response: {llm_response}")
        # Fallback to simple keyword matching
        lower = message.lower()
        if "$" in message:
            import re
            matches = re.findall(r'\$[\d,]+', message)
            if matches:
                intent["budget"] = float(matches[0].replace("$", "").replace(",", ""))
        if "miami" in lower or "beach" in lower:
            intent["destination"] = "MIA"
        if "pet" in lower:
            intent["constraints"] = ["pet-friendly"]
    
    sessions_context[session_id] = intent
    return intent


async def compose_bundles(
    req: BundleRequest,
    session: AsyncSession
) -> List[BundleResponse]:
    """
    Compose flight+hotel bundles from deals in DB.
    Score by budget fit, amenities, location.
    """
    # Query flights
    stmt_flights = sa.select(Flight).order_by(Flight.updated_at.desc()).limit(100)
    result = await session.execute(stmt_flights)
    flights = result.scalars().all()
    
    # Query hotels
    stmt_hotels = sa.select(Hotel).order_by(Hotel.updated_at.desc()).limit(100)
    result = await session.execute(stmt_hotels)
    hotels = result.scalars().all()
    
    if not flights or not hotels:
        return []
    
    bundles: List[BundleResponse] = []
    constraints_lower = [c.lower() for c in (req.constraints or [])]
    
    for flight in flights:
        # Match destination if specified
        if req.destination and req.destination not in (flight.destination, "anywhere"):
            continue
        
        for hotel in hotels:
            # Match city/destination
            if req.destination and req.destination != "anywhere":
                # For simplicity, assume hotel city matches flight destination prefix
                if not hotel.city.startswith(req.destination[:3]):
                    continue
            
            total_price = flight.price + (hotel.price_per_night * 3)  # 3-night stay
            
            # Amenity matching
            amenities = json.loads(hotel.amenities) if isinstance(hotel.amenities, str) else hotel.amenities or []
            
            amenity_hits = 0
            for constraint in constraints_lower:
                if constraint == "pet-friendly" and hotel.is_pet_friendly:
                    amenity_hits += 1
                elif constraint == "breakfast" and hotel.has_breakfast:
                    amenity_hits += 1
                elif constraint == "near-transit" and hotel.near_transit:
                    amenity_hits += 1
                elif constraint == "refundable" and hotel.is_refundable:
                    amenity_hits += 1
            
            location_bonus = 1.1 if hotel.near_transit else 1.0
            score = fit_score(total_price, req.budget, amenity_hits, len(constraints_lower) or 1, location_bonus)
            
            # Generate explanations
            why_this = f"{hotel.name or 'Hotel'} in {hotel.neighbourhood or hotel.city} + {flight.airline} flight, ${total_price:.0f}"
            why_this = why_this[:80]  # Keep ≤ 80 chars
            
            what_to_watch = "Price drops, inventory"
            
            bundle_id = f"BND-{flight.id}-{hotel.id}"
            
            bundles.append(BundleResponse(
                bundle_id=bundle_id,
                total_price=round(total_price, 2),
                flight_price=flight.price,
                hotel_price=hotel.price_per_night * 3,
                fit_score=score,
                why_this=why_this,
                what_to_watch=what_to_watch,
                summary=f"{flight.origin}→{flight.destination} + {hotel.neighbourhood or hotel.city}",
                details={
                    "airline": flight.airline,
                    "hotel": hotel.name or "Unknown",
                    "neighbourhood": hotel.neighbourhood or "N/A",
                    "amenities": ",".join(amenities[:3]),
                    "refundable": str(hotel.is_refundable),
                }
            ))
    
    # Sort by fit score descending, then price
    bundles.sort(key=lambda b: (-b.fit_score, b.total_price))
    return bundles[:req.max_results]


async def broadcast_event(msg: Dict):
    """Broadcast event to all connected WebSocket clients."""
    disconnected = set()
    for ws in list(connected_clients):
        try:
            await ws.send_json(msg)
        except Exception:
            disconnected.add(ws)
    
    for ws in disconnected:
        connected_clients.discard(ws)


# ============================================================================
# ENDPOINTS
# ============================================================================

@app.post("/bundles")
async def get_bundles(req: BundleRequest) -> Dict:
    """
    POST /bundles: Get trip recommendations.
    Returns list of bundles with fit scores, explanations.
    """
    try:
        async with AsyncSessionLocal() as sess:
            bundles = await compose_bundles(req, sess)
        
        return {
            "success": True,
            "count": len(bundles),
            "bundles": [bundle.dict() for bundle in bundles]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat")
async def chat(req: ChatRequest) -> ChatResponse:
    """
    POST /chat: Natural language intent understanding + recommendations.
    Preserves session context, regenerates on refinement.
    """
    try:
        intent = await extract_intent(req.message, req.session_id)
        
        bundle_req = BundleRequest(
            session_id=req.session_id,
            origin=intent.get("origin"),
            destination=intent.get("destination"),
            budget=intent.get("budget"),
            constraints=intent.get("constraints", []),
            max_results=3
        )
        
        async with AsyncSessionLocal() as sess:
            bundles = await compose_bundles(bundle_req, sess)
        
        response_text = "Based on your request, I found these options:"
        if bundles:
            response_text += f" {len(bundles)} great bundles"
        
        # Convert intent constraints list to string for response
        intent_str = {k: (", ".join(v) if isinstance(v, list) else str(v)) for k, v in intent.items()}
        
        return ChatResponse(
            response=response_text,
            bundles=bundles,
            intent=intent_str
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/watch")
async def set_watch(req: WatchRequest) -> WatchResponse:
    """
    POST /watch: Set price/inventory alert on a bundle.
    """
    try:
        async with AsyncSessionLocal() as sess:
            watch = Watch(
                session_id=req.session_id,
                bundle_id=req.bundle_id,
                threshold_price=req.threshold_price,
                min_inventory=req.min_inventory,
            )
            sess.add(watch)
            await sess.commit()
            await sess.refresh(watch)
        
        await broadcast_event({
            "type": "watch_set",
            "bundle_id": req.bundle_id,
            "threshold_price": req.threshold_price,
            "min_inventory": req.min_inventory,
        })
        
        return WatchResponse(
            watch_id=watch.id,
            bundle_id=req.bundle_id,
            active=True
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/policy")
async def get_policy(bundle_id: str, question: str) -> PolicyResponse:
    """
    POST /policy: Answer policy questions using LLM (refund, pet, parking, transit).
    """
    try:
        # Use LLM to generate personalized policy answer
        prompt = f"""You are a travel booking assistant. Answer this customer policy question concisely (2-3 sentences max).

Question: {question}

Provide:
1. A clear answer
2. 2-3 key facts as bullet points

Format your response as:
ANSWER: [your answer]
FACTS:
- [fact 1]
- [fact 2]
- [fact 3]"""
        
        llm_response = await llm.generate(prompt, max_tokens=200, temperature=0.3)
        
        # Parse response
        lines = llm_response.split('\n')
        answer = ""
        facts = []
        
        in_facts = False
        for line in lines:
            line = line.strip()
            if line.startswith("ANSWER:"):
                answer = line.replace("ANSWER:", "").strip()
            elif line.startswith("FACTS:"):
                in_facts = True
            elif in_facts and line.startswith("-"):
                facts.append(line.lstrip("- ").strip())
            elif not answer and not in_facts and line:
                answer = line  # First non-empty line if no ANSWER: prefix
        
        # Fallback if parsing fails
        if not answer:
            answer = llm_response[:200].strip()
        if not facts:
            facts = ["Please check specific booking details", "Policies may vary by property", "Contact support for clarification"]
        
        return PolicyResponse(answer=answer, facts=facts[:3])
    except Exception as e:
        print(f"Policy LLM error: {e}")
        # Fallback to simple response
        return PolicyResponse(
            answer="For specific policy details, please check your booking confirmation or contact our support team.",
            facts=["Policies vary by property and booking type", "Most changes require 24-48h notice", "Refund terms depend on rate selected"]
        )


@app.websocket("/events")
async def events_websocket(ws: WebSocket):
    """
    WebSocket /events: Real-time stream of deal alerts, watch updates, price changes.
    """
    await ws.accept()
    connected_clients.add(ws)
    
    try:
        while True:
            # Listen for client messages (if any) or just keep connection alive
            data = await ws.receive_text()
            # Echo or ignore; clients primarily listen
            await ws.send_json({"type": "ack", "message": data})
    except WebSocketDisconnect:
        pass
    finally:
        connected_clients.discard(ws)


# ============================================================================
# BACKGROUND WATCHER (simulated)
# ============================================================================

async def watch_checker():
    """
    Background task: periodically check watches against current deals.
    Broadcast alerts if thresholds breached.
    """
    while True:
        try:
            async with AsyncSessionLocal() as sess:
                # Get all watches
                stmt = sa.select(Watch)
                result = await sess.execute(stmt)
                watches = result.scalars().all()
                
                for watch in watches:
                    # Simulate price drop (in real scenario, fetch latest deal)
                    if random.random() < 0.1:  # 10% chance price dropped
                        await broadcast_event({
                            "type": "watch_alert",
                            "bundle_id": watch.bundle_id,
                            "trigger": "price_drop",
                            "message": f"Price on {watch.bundle_id} may have dropped!"
                        })
        except Exception as e:
            print(f"Watch checker error: {e}")
        
        await asyncio.sleep(30)  # Check every 30s


@app.on_event("startup")
async def start_watcher():
    asyncio.create_task(watch_checker())


# ============================================================================
# SEEDING SAMPLE DATA
# ============================================================================

@app.post("/seed")
async def seed_sample_data() -> Dict:
    """
    POST /seed: Load mock flights and hotels into DB.
    """
    try:
        import random
        
        # Simple inline mock data
        flights_data = [
            {"origin": "SFO", "destination": "NYC", "airline": "United", "price": 250.0},
            {"origin": "SFO", "destination": "MIA", "airline": "American", "price": 220.0},
            {"origin": "SFO", "destination": "LAX", "airline": "Delta", "price": 120.0},
            {"origin": "LAX", "destination": "NYC", "airline": "Southwest", "price": 200.0},
            {"origin": "SFO", "destination": "BOS", "airline": "United", "price": 300.0},
            {"origin": "SFO", "destination": "ORD", "airline": "American", "price": 280.0},
        ]
        
        hotels_data = [
            {"listing_id": "H001", "name": "Plaza Hotel", "city": "NYC", "neighbourhood": "Manhattan", "price": 150.0},
            {"listing_id": "H002", "name": "SoHo Suite", "city": "NYC", "neighbourhood": "SoHo", "price": 120.0},
            {"listing_id": "H003", "name": "Brooklyn Loft", "city": "NYC", "neighbourhood": "Brooklyn", "price": 100.0},
            {"listing_id": "H004", "name": "South Beach Hotel", "city": "MIA", "neighbourhood": "South Beach", "price": 110.0},
            {"listing_id": "H005", "name": "Hollywood Inn", "city": "LAX", "neighbourhood": "Hollywood", "price": 95.0},
            {"listing_id": "H006", "name": "Downtown Lofts", "city": "LAX", "neighbourhood": "Downtown LA", "price": 85.0},
            {"listing_id": "H007", "name": "Beacon Hill", "city": "BOS", "neighbourhood": "Beacon Hill", "price": 140.0},
        ]
        
        async with AsyncSessionLocal() as sess:
            # Create flights
            for f_data in flights_data:
                flight = Flight(
                    origin=f_data["origin"],
                    destination=f_data["destination"],
                    airline=f_data["airline"],
                    price=f_data["price"],
                    duration_minutes=random.randint(300, 600),
                    stops=random.randint(0, 2),
                    seats_available=random.randint(5, 100),
                    is_refundable=True,
                    avg_price_30d=f_data["price"] * 1.1,
                    deal_score=1.5,
                    tags=json.dumps(["direct"] if random.random() > 0.3 else [])
                )
                sess.add(flight)
            
            # Create hotels
            for h_data in hotels_data:
                hotel = Hotel(
                    listing_id=h_data["listing_id"],
                    name=h_data["name"],
                    city=h_data["city"],
                    neighbourhood=h_data["neighbourhood"],
                    price_per_night=h_data["price"],
                    availability=random.randint(3, 30),
                    amenities=json.dumps(["wifi", "breakfast", "pool"] if random.random() > 0.5 else ["wifi"]),
                    is_pet_friendly=random.random() > 0.7,
                    has_breakfast=random.random() > 0.6,
                    near_transit=random.random() > 0.5,
                    is_refundable=True,
                    refund_deadline_days=7,
                    avg_price_30d=h_data["price"] * 1.05,
                    deal_score=1.2
                )
                sess.add(hotel)
            
            await sess.commit()
        
        return {
            "success": True,
            "seeded": len(flights_data) + len(hotels_data),
            "message": f"Loaded {len(flights_data)} flights and {len(hotels_data)} hotels"
        }
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    import random
    uvicorn.run(app, host="0.0.0.0", port=8002)

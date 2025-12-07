"""
Deals Agent Service
- Scheduled CSV ingestion (Inside Airbnb, Flight prices)
- Normalized deal scoring pipeline
- Kafka topic publishing: raw_supplier_feeds → normalized → scored → tagged
- Event broadcasting on high-score deals
"""
import os
import asyncio
import json
import logging
from datetime import datetime
from typing import List, Dict, Optional

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import RootModel
from aiokafka import AIOKafkaProducer

from . import light_processor as processor
from .data_ingest import ingest_mock_deals

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title='Deals Agent API',
    description='Scheduled deal detection & Kafka pipeline',
    version='1.0.0'
)

# Enable CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://127.0.0.1:3001", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

KAFKA_BOOTSTRAP = os.environ.get("KAFKA_BOOTSTRAP", "localhost:9092")
KAFKA_PRODUCER: Optional[AIOKafkaProducer] = None

# Topics
TOPIC_RAW = "raw_supplier_feeds"
TOPIC_NORMALIZED = "deals.normalized"
TOPIC_SCORED = "deals.scored"
TOPIC_TAGGED = "deals.tagged"
TOPIC_EVENTS = "deal.events"


# ============================================================================
# KAFKA SETUP
# ============================================================================

async def init_kafka():
    """Initialize Kafka producer."""
    global KAFKA_PRODUCER
    
    try:
        KAFKA_PRODUCER = AIOKafkaProducer(
            bootstrap_servers=KAFKA_BOOTSTRAP,
            value_serializer=lambda v: json.dumps(v).encode('utf-8')
        )
        await KAFKA_PRODUCER.start()
        logger.info("✅ Kafka producer initialized")
    except Exception as e:
        logger.error(f"Kafka init error: {e}")


async def shutdown_kafka():
    """Cleanup Kafka connections."""
    if KAFKA_PRODUCER:
        await KAFKA_PRODUCER.stop()


@app.on_event("startup")
async def startup():
    await init_kafka()
    asyncio.create_task(scheduler_pipeline())


@app.on_event("shutdown")
async def shutdown():
    await shutdown_kafka()


# ============================================================================
# SCORING & TAGGING
# ============================================================================

def detect_deal(price: float, avg_price_30d: float, availability: int) -> bool:
    """Detect if record is a deal."""
    if avg_price_30d and price <= 0.85 * avg_price_30d:
        return True
    if availability < 5:
        return True
    return False


def compute_deal_score(price: float, avg_price_30d: float, availability: int, tags: List[str]) -> float:
    """Score deal 1.0-5.0."""
    score = 1.0
    
    if avg_price_30d and avg_price_30d > 0:
        drop_pct = (avg_price_30d - price) / avg_price_30d
        if drop_pct >= 0.25:
            score += 2.0
        elif drop_pct >= 0.15:
            score += 1.5
        elif drop_pct >= 0.10:
            score += 1.0
    
    if availability < 3:
        score += 1.0
    elif availability < 5:
        score += 0.5
    
    promo_tags = {"flash_sale", "promo", "seasonal", "early_booking"}
    if any(tag in tags for tag in promo_tags):
        score += 1.0
    
    return min(5.0, round(score, 2))


def tag_offer(record: Dict) -> List[str]:
    """Extract tags from offer."""
    tags = []
    
    if record.get("is_pet_friendly"):
        tags.append("pet-friendly")
    if record.get("has_breakfast"):
        tags.append("breakfast")
    if record.get("near_transit"):
        tags.append("near-transit")
    
    amenities = record.get("amenities", [])
    if isinstance(amenities, str):
        amenities = json.loads(amenities)
    
    amenity_tags = {"wifi", "parking", "pool", "fitness", "kitchen", "ac"}
    for amenity in amenities:
        if amenity.lower() in amenity_tags:
            tags.append(amenity.lower())
    
    if record.get("promo_factor", 1.0) < 0.9:
        tags.append("flash_sale")
    
    return tags


async def publish_to_kafka(topic: str, key: str, value: Dict):
    """Publish message to Kafka."""
    if KAFKA_PRODUCER:
        try:
            await KAFKA_PRODUCER.send_and_wait(topic, key=key.encode(), value=value)
        except Exception as e:
            logger.error(f"Kafka publish error on {topic}: {e}")


# ============================================================================
# SCORING PIPELINE
# ============================================================================

async def normalize_record(raw_record: Dict) -> Dict:
    """Transform raw supplier data into normalized schema."""
    # Extract or generate listing_id - critical for database integrity
    listing_id = raw_record.get('listing_id') or raw_record.get('id') or f"{raw_record.get('type', 'unknown')}-{raw_record.get('id', 'unknown')}"
    
    normalized = {
        "id": raw_record.get("id"),
        "listing_id": listing_id,
        "type": raw_record.get("type"),
        "source": raw_record.get("source"),
        "date": raw_record.get("date"),
        "price": raw_record.get("price"),
        "availability": raw_record.get("availability"),
        "neighbourhood": raw_record.get("neighbourhood"),
        "ingested_at": datetime.utcnow().isoformat(),
        "data": raw_record
    }
    
    await publish_to_kafka(
        TOPIC_NORMALIZED,
        f"{raw_record['type']}-{raw_record.get('id')}",
        normalized
    )
    
    return normalized


async def score_record(normalized: Dict) -> Dict:
    """Score normalized record."""
    data = normalized["data"]
    
    if normalized["type"] == "flight":
        deal_score = compute_deal_score(
            data["price"],
            data.get("avg_price_30d", data["price"]),
            data.get("seats_available", 100),
            data.get("tags", [])
        )
    else:  # hotel
        deal_score = compute_deal_score(
            data["price"],
            data.get("avg_price_30d", data["price"]),
            data.get("availability", 30),
            data.get("tags", [])
        )
    
    scored = {
        **normalized,
        "deal_score": deal_score,
        "is_deal": detect_deal(
            data["price"],
            data.get("avg_price_30d", data["price"]),
            data.get("seats_available") or data.get("availability", 100)
        ),
        "scored_at": datetime.utcnow().isoformat()
    }
    
    await publish_to_kafka(
        TOPIC_SCORED,
        f"{normalized['type']}-{normalized['id']}",
        scored
    )
    
    return scored


async def tag_record(scored: Dict) -> Dict:
    """Tag scored record with amenity/policy tags."""
    data = scored["data"]
    tags = tag_offer(data)
    
    tagged = {
        **scored,
        "tags": tags,
        "tagged_at": datetime.utcnow().isoformat()
    }
    
    await publish_to_kafka(
        TOPIC_TAGGED,
        f"{scored['type']}-{scored['id']}",
        tagged
    )
    
    if scored.get("deal_score", 0) >= 4.0:
        event = {
            "type": "high_score_deal",
            "bundle_id": f"{scored['type']}-{scored['id']}",
            "deal_score": scored["deal_score"],
            "price": data["price"],
            "event_time": datetime.utcnow().isoformat()
        }
        await publish_to_kafka(TOPIC_EVENTS, "event", event)
    
    return tagged


# ============================================================================
# SCHEDULED DATA INGESTION
# ============================================================================

async def ingest_mock_deals() -> List[Dict]:
    """Delegate to the real data_ingest module which loads Kaggle CSV data or falls back to mock."""
    from .data_ingest import ingest_mock_deals as real_ingest
    deals = await real_ingest()
    logger.info(f"📥 Ingested {len(deals)} deals (from real data sources)")
    return deals


async def scheduler_pipeline():
    """Run scheduled ingestion + scoring pipeline every 60 seconds."""
    await asyncio.sleep(5)
    
    while True:
        try:
            logger.info("🔄 Running scheduled deal pipeline...")
            
            mock_deals = await ingest_mock_deals()
            
            if mock_deals:
                for deal in mock_deals:
                    try:
                        normalized = await normalize_record(deal)
                        scored = await score_record(normalized)
                        tagged = await tag_record(scored)
                    except Exception as e:
                        logger.error(f"Pipeline error for {deal.get('id')}: {e}")
                
                logger.info(f"✅ Pipeline completed: {len(mock_deals)} deals processed")
            
            await asyncio.sleep(60)
        except Exception as e:
            logger.error(f"Scheduler error: {e}")
            await asyncio.sleep(60)


# ============================================================================
# DATA MODELS
# ============================================================================

class RawRecord(RootModel):
    root: dict


# ============================================================================
# ENDPOINTS
# ============================================================================

@app.get('/agent/health')
async def health():
    return {
        'status': 'healthy',
        'service': 'deals-agent',
        'version': '1.0.0'
    }

@app.post('/agent/normalize')
async def normalize(record: RawRecord):
    try:
        raw = record.root
        normalized = await processor.normalize_record(raw)
        return {'success': True, 'normalized': normalized}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post('/agent/ingest')
async def ingest(record: RawRecord, persist: bool = True):
    try:
        raw = record.root
        normalized = await processor.normalize_record(raw)
        # create aiohttp session if DIRECT_OUTPUT_URL is set
        aiohttp_sess = None
        if processor.DIRECT_OUTPUT_URL:
            import aiohttp
            aiohttp_sess = aiohttp.ClientSession()
        # process (produce to kafka if enabled, persist to db, file sink, direct post)
        # light_processor.process_normalized accepts only the normalized dict
        await processor.process_normalized(normalized)
        if aiohttp_sess:
            await aiohttp_sess.close()
        return {'success': True, 'normalized': normalized}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post('/agent/process')
async def process_only(record: RawRecord):
    try:
        raw = record.root
        normalized = await processor.normalize_record(raw)
        return {'success': True, 'normalized': normalized}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get('/stats')
async def get_stats() -> Dict:
    """GET /stats: Return Kafka topic stats."""
    return {
        "service": "deals-agent",
        "kafka_topics": [TOPIC_RAW, TOPIC_NORMALIZED, TOPIC_SCORED, TOPIC_TAGGED, TOPIC_EVENTS],
        "message": "Scheduler running, processing deals every 60s"
    }

if __name__ == '__main__':
    import uvicorn
    uvicorn.run('deals_agent.api:app', host='0.0.0.0', port=int(os.environ.get('AGENT_PORT', 8000)), log_level='info')

"""
Deals Agent: scoring, tagging, and Kafka pipeline.
Ingests normalized records, detects deals (≥15% below 30d avg), scores (1-5), tags, publishes to Kafka.
"""
import json
import asyncio
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from aiokafka import AIOKafkaProducer, AIOKafkaConsumer
import os

KAFKA_BOOTSTRAP = os.environ.get("KAFKA_BOOTSTRAP", "localhost:29092")
DEALS_NORMALIZED_TOPIC = "deals.normalized"
DEALS_SCORED_TOPIC = "deals.scored"
DEALS_TAGGED_TOPIC = "deals.tagged"
DEAL_EVENTS_TOPIC = "deal.events"


def detect_deal(price: float, avg_price_30d: Optional[float], availability: Optional[int]) -> bool:
    """
    Detect if a deal meets criteria: price ≤ 0.85 × avg_price_30d OR very low availability.
    """
    if not avg_price_30d:
        return False
    threshold = avg_price_30d * 0.85
    if price <= threshold:
        return True
    if availability and availability < 5:  # limited inventory
        return True
    return False


def compute_deal_score(
    price: float,
    avg_price_30d: Optional[float],
    availability: Optional[int],
    tags: List[str]
) -> float:
    """
    Compute deal score 1-5 based on:
    - Price drop magnitude
    - Scarcity (limited availability)
    - Promo tags
    Returns float 1.0-5.0.
    """
    score = 1.0
    
    if avg_price_30d and avg_price_30d > 0:
        price_ratio = price / avg_price_30d
        if price_ratio <= 0.75:
            score += 2.0  # ≥25% drop
        elif price_ratio <= 0.85:
            score += 1.5  # 15-25% drop
        elif price_ratio <= 0.95:
            score += 0.5  # 5-15% drop
    
    if availability and availability < 3:
        score += 1.0
    elif availability and availability < 5:
        score += 0.5
    
    if "limited-time" in tags or "promo" in tags or "flash" in tags:
        score += 1.0
    
    return min(5.0, score)


def tag_offer(amenities: List[str], metadata: Dict) -> List[str]:
    """
    Tag a listing based on amenities & metadata (no NLP, just keyword matching).
    Returns tags like ["pet-friendly", "breakfast", "near-transit", "refundable"].
    """
    tags = []
    
    if metadata.get("is_pet_friendly"):
        tags.append("pet-friendly")
    if metadata.get("has_breakfast"):
        tags.append("breakfast")
    if metadata.get("near_transit"):
        tags.append("near-transit")
    if metadata.get("is_refundable"):
        tags.append("refundable")
    
    amenities_str = " ".join(amenities).lower()
    if "wifi" in amenities_str or "internet" in amenities_str:
        tags.append("wifi")
    if "gym" in amenities_str or "fitness" in amenities_str:
        tags.append("fitness")
    if "pool" in amenities_str:
        tags.append("pool")
    if "parking" in amenities_str:
        tags.append("parking")
    
    return list(set(tags))


async def produce_to_kafka(topic: str, key: str, value: Dict):
    """
    Produce a message to Kafka topic.
    """
    try:
        producer = AIOKafkaProducer(
            bootstrap_servers=KAFKA_BOOTSTRAP,
            value_serializer=lambda v: json.dumps(v).encode("utf-8"),
        )
        await producer.start()
        try:
            await producer.send_and_wait(topic, value=value, key=key.encode("utf-8"))
        finally:
            await producer.stop()
    except Exception as e:
        print(f"Kafka produce error: {e}")


async def deals_scoring_pipeline(
    normalized_records: List[Dict],
    on_deal_scored: callable = None
):
    """
    Process normalized records:
    1. Compute deal score based on price/availability
    2. Tag with amenities
    3. Publish to deals.scored topic
    4. Publish high-score deals to deal.events
    """
    for record in normalized_records:
        try:
            price = record.get("price", 0)
            avg_30d = record.get("avg_price_30d")
            availability = record.get("availability")
            amenities = record.get("amenities", [])
            metadata = record.get("metadata", {})
            
            # Detect and score
            is_deal = detect_deal(price, avg_30d, availability)
            score = compute_deal_score(price, avg_30d, availability, record.get("tags", []))
            
            # Tag
            tags = tag_offer(amenities, metadata)
            
            scored_record = {
                **record,
                "is_deal": is_deal,
                "deal_score": score,
                "tags": tags,
            }
            
            # Publish to deals.scored
            listing_id = record.get("listing_id", "unknown")
            await produce_to_kafka(DEALS_SCORED_TOPIC, listing_id, scored_record)
            
            # Emit event for high-score deals
            if is_deal and score >= 3.0:
                event = {
                    "type": "deal_alert",
                    "listing_id": listing_id,
                    "price": price,
                    "deal_score": score,
                    "tags": tags,
                }
                await produce_to_kafka(DEAL_EVENTS_TOPIC, listing_id, event)
            
            if on_deal_scored:
                on_deal_scored(scored_record)
                
        except Exception as e:
            print(f"Error scoring record: {e}")

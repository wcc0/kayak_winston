"""
Mock data generators for hotels and flights.
Simulates time-series prices (mean-reverting + promo dips), limited inventory.
"""
import random
from datetime import datetime, timedelta
from typing import List, Dict


# Mock flight data (simulated from Expedia/EaseMyTrip datasets)
SAMPLE_FLIGHTS = [
    {"origin": "SFO", "destination": "NYC", "airline": "United", "base_price": 250, "duration": 300},
    {"origin": "SFO", "destination": "MIA", "airline": "Delta", "base_price": 220, "duration": 280},
    {"origin": "SFO", "destination": "LAX", "airline": "Southwest", "base_price": 120, "duration": 60},
    {"origin": "SFO", "destination": "ORD", "airline": "American", "base_price": 280, "duration": 240},
    {"origin": "SFO", "destination": "BOS", "airline": "JetBlue", "base_price": 300, "duration": 320},
    {"origin": "LAX", "destination": "NYC", "airline": "United", "base_price": 200, "duration": 300},
]

# Mock hotel data (simulated from Inside Airbnb + Hotel Booking datasets)
SAMPLE_HOTELS = [
    {"city": "NYC", "name": "Manhattan Studio", "neighbourhood": "Midtown", "base_price": 150},
    {"city": "NYC", "name": "Brooklyn Loft", "neighbourhood": "Williamsburg", "base_price": 120},
    {"city": "MIA", "name": "Beachfront Condo", "neighbourhood": "South Beach", "base_price": 180},
    {"city": "MIA", "name": "Downtown Hotel", "neighbourhood": "Brickell", "base_price": 110},
    {"city": "LAX", "name": "Hollywood Apt", "neighbourhood": "Hollywood", "base_price": 130},
    {"city": "ORD", "name": "Loop Studio", "neighbourhood": "Loop", "base_price": 140},
    {"city": "BOS", "name": "Back Bay Suite", "neighbourhood": "Back Bay", "base_price": 160},
]


def generate_mock_flight(route: Dict, day_offset: int = 0) -> Dict:
    """
    Generate a mock flight record with simulated time-series pricing.
    Prices mean-revert around base with random promo dips (-10% to -25%).
    """
    base_price = route["base_price"]
    
    # Mean-reverting price with noise
    drift = random.gauss(0, 0.05)  # ±5% drift
    promo_prob = random.random()
    if promo_prob < 0.15:  # 15% chance of promo
        promo_factor = random.uniform(0.75, 0.9)  # -10% to -25%
    else:
        promo_factor = random.uniform(0.95, 1.1)  # ±5% variance
    
    price = base_price * promo_factor * (1 + drift)
    
    return {
        "listing_id": f"{route['origin']}-{route['destination']}-{day_offset}",
        "type": "flight",
        "origin": route["origin"],
        "destination": route["destination"],
        "airline": route["airline"],
        "price": round(max(50, price), 2),
        "currency": "USD",
        "duration_minutes": route["duration"],
        "stops": random.choice([0, 0, 1]),  # 2/3 direct
        "seats_available": random.randint(5, 150),
        "is_refundable": random.choice([True, False]),
        "date": (datetime.utcnow() + timedelta(days=day_offset)).isoformat(),
        "avg_price_30d": round(base_price, 2),
        "amenities": [],
        "tags": ["promo"] if promo_prob < 0.15 else [],
    }


def generate_mock_hotel(hotel: Dict, day_offset: int = 0) -> Dict:
    """
    Generate a mock hotel record with simulated time-series pricing.
    """
    base_price = hotel["base_price"]
    
    # Mean-reverting price with noise
    drift = random.gauss(0, 0.08)  # ±8% drift
    promo_prob = random.random()
    if promo_prob < 0.1:
        promo_factor = random.uniform(0.75, 0.85)
    else:
        promo_factor = random.uniform(0.9, 1.15)
    
    price = base_price * promo_factor * (1 + drift)
    
    amenities = random.sample(
        ["wifi", "breakfast", "gym", "pool", "parking", "kitchen"],
        k=random.randint(2, 5)
    )
    
    has_breakfast = "breakfast" in amenities
    is_pet_friendly = random.choice([True, False])
    near_transit = hotel["neighbourhood"] in ["Midtown", "Downtown", "Loop"]
    
    return {
        "listing_id": f"HTL-{hotel['city']}-{day_offset}-{random.randint(1, 999)}",
        "type": "hotel",
        "name": hotel["name"],
        "city": hotel["city"],
        "neighbourhood": hotel["neighbourhood"],
        "price": round(max(40, price), 2),
        "currency": "USD",
        "availability": random.randint(1, 30),
        "amenities": amenities,
        "is_pet_friendly": is_pet_friendly,
        "has_breakfast": has_breakfast,
        "near_transit": near_transit,
        "is_refundable": random.choice([True, False]),
        "refund_deadline_days": random.choice([7, 14, 30]),
        "date": (datetime.utcnow() + timedelta(days=day_offset)).isoformat(),
        "avg_price_30d": round(base_price, 2),
        "tags": ["limited-time"] if promo_prob < 0.1 else [],
    }


def generate_mock_deals(num_flights: int = 20, num_hotels: int = 30) -> List[Dict]:
    """
    Generate a batch of mock flight+hotel records for the Kafka pipeline.
    """
    records = []
    
    for _ in range(num_flights):
        route = random.choice(SAMPLE_FLIGHTS)
        day_offset = random.randint(1, 60)
        records.append(generate_mock_flight(route, day_offset))
    
    for _ in range(num_hotels):
        hotel = random.choice(SAMPLE_HOTELS)
        day_offset = random.randint(1, 60)
        records.append(generate_mock_hotel(hotel, day_offset))
    
    return records

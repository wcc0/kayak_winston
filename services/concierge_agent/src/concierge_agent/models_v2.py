"""
Pydantic v2 + SQLModel schemas for the travel concierge system.
Flight + Hotel deals, bundles, watches, policies.
"""
from sqlmodel import SQLModel, Field
from pydantic import BaseModel, Field as PydField
from typing import Optional, List, Dict
from datetime import datetime, date


# ============================================================================
# FLIGHT MODEL
# ============================================================================
class Flight(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    origin: str  # IATA code, e.g., "SFO"
    destination: str  # IATA code, e.g., "NYC"
    airline: str
    price: float
    currency: str = "USD"
    departure_time: Optional[str] = None  # ISO or "HH:MM"
    duration_minutes: Optional[int] = None
    stops: int = 0  # direct = 0
    seats_available: int = 100
    is_refundable: bool = True
    deal_score: float = 0.0  # 1-5 scale
    tags: str = ""  # JSON string: ["promo", "limited-seats"]
    avg_price_30d: Optional[float] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# ============================================================================
# HOTEL MODEL
# ============================================================================
class Hotel(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    listing_id: str  # AirBnB or internal ID
    name: Optional[str] = None
    city: str
    neighbourhood: Optional[str] = None
    price_per_night: float
    currency: str = "USD"
    availability: int = 30  # days/rooms available
    amenities: str = ""  # JSON: ["wifi", "breakfast", "pet-friendly"]
    is_pet_friendly: bool = False
    has_breakfast: bool = False
    near_transit: bool = False
    is_refundable: bool = True
    refund_deadline_days: int = 7
    deal_score: float = 0.0  # 1-5 scale
    avg_price_30d: Optional[float] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# ============================================================================
# BUNDLE = Flight + Hotel combo
# ============================================================================
class Bundle(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    bundle_id: str  # "BND-{flight_id}-{hotel_id}"
    flight_id: int
    hotel_id: int
    total_price: float
    fit_score: float  # 0.0-1.5
    why_this: str  # "Why pick this" ≤25 words
    what_to_watch: str  # "What to watch" ≤12 words
    session_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class BundleDetail(BaseModel):
    """Pydantic response model (not DB)"""
    bundle_id: str
    origin: str
    destination: str
    hotel_city: str
    hotel_neighbourhood: Optional[str]
    total_price: float
    flight_price: float
    hotel_price: float
    flight_airline: str
    hotel_name: Optional[str]
    fit_score: float
    why_this: str
    what_to_watch: str
    amenities: List[str]
    is_pet_friendly: bool
    has_breakfast: bool
    is_refundable: bool


# ============================================================================
# WATCH = Price/inventory alert
# ============================================================================
class Watch(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: str
    bundle_id: str
    threshold_price: Optional[float] = None
    min_inventory: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ============================================================================
# REQUEST/RESPONSE PYDANTIC MODELS (v2)
# ============================================================================

class BundleRequest(BaseModel):
    """Request for trip recommendations"""
    session_id: Optional[str] = None
    origin: Optional[str] = PydField(default=None, description="IATA code, e.g., SFO")
    destination: Optional[str] = PydField(default=None, description="IATA or city")
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget: Optional[float] = PydField(default=None, description="Total budget in USD")
    num_travelers: int = 1
    constraints: Optional[List[str]] = PydField(
        default=None, description="Filters: pet-friendly, breakfast, near-transit, refundable"
    )
    max_results: int = PydField(default=3, le=5)


class BundleResponse(BaseModel):
    """Response: bundle with explanations"""
    bundle_id: str
    total_price: float
    flight_price: float
    hotel_price: float
    fit_score: float
    why_this: str  # ≤25 words
    what_to_watch: str  # ≤12 words
    summary: str
    details: Dict[str, str]


class WatchRequest(BaseModel):
    """Set a watch on a bundle"""
    session_id: str
    bundle_id: str
    threshold_price: Optional[float] = None
    min_inventory: Optional[int] = None


class WatchResponse(BaseModel):
    """Confirmation"""
    watch_id: int
    bundle_id: str
    active: bool


class ChatRequest(BaseModel):
    """Chat message with session context"""
    session_id: str
    message: str


class ChatResponse(BaseModel):
    """Chat + recommended bundles"""
    response: str
    bundles: Optional[List[BundleResponse]] = None
    intent: Optional[Dict[str, str]] = None  # extracted origin, dest, budget, etc.


class PolicyResponse(BaseModel):
    """Policy answer with facts"""
    answer: str
    facts: List[str]


# ============================================================================
# EVENT MODELS (WebSocket broadcast)
# ============================================================================

class DealAlert(BaseModel):
    type: str = "deal_alert"
    deal_id: str
    price: float
    deal_score: float
    tags: List[str]


class WatchAlert(BaseModel):
    type: str = "watch_alert"
    bundle_id: str
    price: float
    availability: int
    trigger: str  # "price_drop" or "low_inventory"

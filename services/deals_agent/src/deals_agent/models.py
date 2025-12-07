from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field


class FlightModel(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
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
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class HotelModel(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
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
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
from typing import Optional, List
from datetime import datetime
from sqlmodel import SQLModel, Field
from sqlalchemy import Column, JSON as SAJSON

class Deal(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    listing_id: str
    date: Optional[str]
    price: Optional[float]
    availability: Optional[int]
    tags: Optional[str] = None
    neighbourhood: Optional[str] = None
    source: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class DealNormalized(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    listing_id: str
    date: datetime
    price: float
    availability: Optional[int] = None
    amenities: Optional[List[str]] = Field(sa_column=Column(SAJSON), default_factory=list)
    neighbourhood: Optional[str] = None
    source: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    raw_payload: Optional[dict] = Field(default=None, sa_column=Column(SAJSON))

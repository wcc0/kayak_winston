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

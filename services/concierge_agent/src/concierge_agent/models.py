from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime


class Deal(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    listing_id: Optional[str] = None
    date: Optional[str] = None
    price: Optional[float] = None
    availability: Optional[int] = None
    tags: Optional[str] = None
    neighbourhood: Optional[str] = None
    source: Optional[str] = None
    raw: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Bundle(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    deal_ids: str
    score: float = 0.0
    note: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Watch(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: str
    bundle_id: Optional[int]
    threshold_price: Optional[float]
    min_inventory: Optional[int]
    created_at: datetime = Field(default_factory=datetime.utcnow)

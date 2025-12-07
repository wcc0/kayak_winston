from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import date


class NormalizedDeal(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    source_id: str
    listing_id: str
    date: date
    price: float
    currency: str
    availability: int
    avg_30d: Optional[float] = None
    tags: Optional[str] = None

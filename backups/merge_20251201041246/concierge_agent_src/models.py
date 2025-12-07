from pydantic import BaseModel, Field
from typing import List, Optional


class IntentPayload(BaseModel):
    user_id: Optional[str]
    text: str
    dates: Optional[List[str]] = None
    budget: Optional[float] = None
    constraints: Optional[List[str]] = None


class ChatAction(BaseModel):
    action: str
    payload: Optional[dict] = None


class WatchRequest(BaseModel):
    user_id: str
    listing_id: str
    threshold_price: Optional[float]
    notify_email: Optional[str]

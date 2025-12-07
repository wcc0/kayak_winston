"""
Chat Intent Parser
Extract structured travel parameters from natural language messages.
Preserves session context across conversation turns.
"""
import re
from datetime import datetime, timedelta
from typing import Dict, List, Optional

# Mapping datasets
AIRPORT_CODES = {
    # US Hubs
    "san francisco": "SFO", "sf": "SFO", "bay area": "SFO", "california": "SFO",
    "new york": "NYC", "nyc": "NYC", "la": "LAX", "los angeles": "LAX", 
    "chicago": "ORD", "miami": "MIA", "boston": "BOS", "denver": "DEN",
    # International
    "london": "LHR", "paris": "CDG", "tokyo": "NRT", "dubai": "DXB",
    # Any warm beach destination
    "beach": "MIA", "tropical": "MIA", "warm": "MIA", "caribbean": "MIA",
}

CONSTRAINT_KEYWORDS = {
    "pet": ["pet-friendly", "dog", "cat"],
    "breakfast": ["breakfast", "meal", "brunch"],
    "transit": ["transit", "public transport", "subway", "metro", "close to", "walkable"],
    "refundable": ["refund", "cancel", "flexible", "refundable"],
    "direct": ["direct", "nonstop", "non-stop"],
    "wifi": ["wifi", "internet", "connection"],
    "pool": ["pool", "swimming"],
    "parking": ["parking", "park", "car"],
    "gym": ["gym", "fitness", "exercise"],
}

NUM_WORDS = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "couple": 2, "a couple": 2,
    "few": 3, "group": 5,
}

MONTH_MAP = {
    "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
    "july": 7, "august": 8, "september": 9, "october": 10, "november": 11, "december": 12,
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "sept": 9, "oct": 10, "nov": 11, "dec": 12,
}


def extract_budget(message: str) -> Optional[float]:
    """Extract budget from message. Looks for $XXX or 'under $XXX'."""
    # Match $123, $1,234, etc.
    matches = re.findall(r'\$[\d,]+(?:\.\d{2})?', message)
    if matches:
        return float(matches[0].replace("$", "").replace(",", ""))
    
    # Match "under 2000" or "less than 1500"
    under_match = re.search(r'(?:under|less than|budget of|budget is)\s+(\d+)', message, re.IGNORECASE)
    if under_match:
        return float(under_match.group(1))
    
    return None


def extract_num_travelers(message: str) -> Optional[int]:
    """Extract number of travelers from message."""
    lower = message.lower()
    
    # Check numeric keywords
    for word, num in NUM_WORDS.items():
        if word in lower:
            return num
    
    # Check digits
    matches = re.findall(r'\b(\d)\s+(?:person|people|traveler|guest)', message, re.IGNORECASE)
    if matches:
        return int(matches[0])
    
    # Default
    return None


def extract_dates(message: str) -> Dict[str, Optional[str]]:
    """Extract start/end dates from message. Returns ISO format YYYY-MM-DD."""
    result = {"start_date": None, "end_date": None, "num_nights": None}
    lower = message.lower()
    
    # Pattern: "Oct 25-27" or "October 25-27"
    date_range = re.search(
        r'(january|february|march|april|may|june|july|august|september|october|november|december|'
        r'jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{1,2})[- ]*to[- ]*(\d{1,2})|'
        r'(\d{1,2})[- ]*(january|february|march|april|may|june|july|august|september|october|november|december|'
        r'jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[- ]*(\d{1,2})',
        message,
        re.IGNORECASE
    )
    
    if date_range:
        # Try to parse
        try:
            if date_range.group(1):  # "Oct 25-27" format
                month_str = date_range.group(1).lower()
                start_day = int(date_range.group(2))
                end_day = int(date_range.group(3))
            else:  # "25 Oct-27" format
                start_day = int(date_range.group(4))
                month_str = date_range.group(5).lower()
                end_day = int(date_range.group(6))
            
            month = MONTH_MAP.get(month_str, 10)  # Default Oct
            year = datetime.now().year
            
            start = datetime(year, month, start_day)
            end = datetime(year, month, end_day)
            
            result["start_date"] = start.strftime("%Y-%m-%d")
            result["end_date"] = end.strftime("%Y-%m-%d")
            result["num_nights"] = (end - start).days
        except ValueError:
            pass
    
    # Pattern: "next weekend", "in 5 days", "this Friday"
    if "weekend" in lower:
        today = datetime.now()
        # Find next Friday
        days_ahead = 4 - today.weekday()
        if days_ahead <= 0:
            days_ahead += 7
        friday = today + timedelta(days=days_ahead)
        saturday = friday + timedelta(days=1)
        result["start_date"] = friday.strftime("%Y-%m-%d")
        result["end_date"] = saturday.strftime("%Y-%m-%d")
        result["num_nights"] = 1
    
    if re.search(r'in\s+(\d+)\s+(?:days?|week)', lower):
        match = re.search(r'in\s+(\d+)\s+(?:days?|weeks?)', lower)
        days = int(match.group(1))
        if "week" in match.group(0):
            days *= 7
        start = datetime.now() + timedelta(days=days)
        end = start + timedelta(days=3)  # Default 3-night stay
        result["start_date"] = start.strftime("%Y-%m-%d")
        result["end_date"] = end.strftime("%Y-%m-%d")
        result["num_nights"] = 3
    
    return result


def extract_destination(message: str) -> Optional[str]:
    """Extract destination airport code or name."""
    lower = message.lower()
    
    for keyword, code in AIRPORT_CODES.items():
        if keyword in lower and keyword not in ["california", "sf"]:  # Exclude origin
            return code
    
    # Look for "to [CITY]" pattern
    to_match = re.search(r'\bto\s+(\w+)', message, re.IGNORECASE)
    if to_match:
        city = to_match.group(1).lower()
        if city in AIRPORT_CODES:
            return AIRPORT_CODES[city]
        # Return city name as fallback
        return city.upper()[:3]
    
    return None


def extract_origin(message: str) -> Optional[str]:
    """Extract origin airport code."""
    lower = message.lower()
    
    # Check explicit "from" pattern
    from_match = re.search(r'from\s+(\w+)', message, re.IGNORECASE)
    if from_match:
        city = from_match.group(1).lower()
        if city in AIRPORT_CODES:
            return AIRPORT_CODES[city]
    
    # Default to SFO if Bay Area mentioned
    if any(kw in lower for kw in ["san francisco", "sf", "bay area", "california"]):
        return "SFO"
    
    return None


def extract_constraints(message: str) -> List[str]:
    """Extract constraints/preferences from message."""
    constraints = []
    lower = message.lower()
    
    for constraint_type, keywords in CONSTRAINT_KEYWORDS.items():
        for keyword in keywords:
            if keyword in lower:
                constraints.append(constraint_type)
                break
    
    return list(set(constraints))  # Remove duplicates


def extract_intent(message: str, context: Optional[Dict] = None) -> Dict:
    """
    Extract structured intent from natural language message.
    Preserves context from previous turns.
    
    Returns:
    {
        "origin": "SFO",
        "destination": "NYC",
        "start_date": "2025-10-25",
        "end_date": "2025-10-27",
        "num_nights": 2,
        "budget": 1000.0,
        "num_travelers": 2,
        "constraints": ["pet-friendly", "breakfast"],
        "query": "raw message"
    }
    """
    if context is None:
        context = {}
    
    # Start with preserved context
    intent = {**context}
    
    # Extract new values (overwrite context if found)
    origin = extract_origin(message)
    if origin:
        intent["origin"] = origin
    
    destination = extract_destination(message)
    if destination:
        intent["destination"] = destination
    
    budget = extract_budget(message)
    if budget:
        intent["budget"] = budget
    
    num_travelers = extract_num_travelers(message)
    if num_travelers:
        intent["num_travelers"] = num_travelers
    
    dates = extract_dates(message)
    if dates["start_date"]:
        intent.update(dates)
    
    constraints = extract_constraints(message)
    if constraints:
        # Merge with existing constraints
        existing = intent.get("constraints", [])
        intent["constraints"] = list(set(existing + constraints))
    
    intent["query"] = message
    
    return intent


# ============================================================================
# TEST / DEMO
# ============================================================================

if __name__ == "__main__":
    test_messages = [
        "I want to go from SF to NYC Oct 25-27 for under $2000 for 2 people with pet-friendly hotel",
        "Make it pet-friendly",
        "Can I get something with breakfast?",
        "Budget is 3000",
        "Going to Miami next weekend, need parking",
    ]
    
    context = {}
    for msg in test_messages:
        intent = extract_intent(msg, context)
        context = intent
        print(f"Message: {msg}")
        print(f"Intent: {intent}\n")

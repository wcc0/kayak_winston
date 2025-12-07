from datetime import datetime
import ujson as json

def parse_price(value):
    if value is None:
        return None
    try:
        if isinstance(value, (int, float)):
            return float(value)
        s = str(value).strip().replace('$', '').replace(',', '')
        return float(s)
    except Exception:
        return None


def parse_date(value):
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y'):
        try:
            return datetime.strptime(value, fmt)
        except Exception:
            continue
    # fallback: try isoparse
    try:
        return datetime.fromisoformat(value)
    except Exception:
        return None


def extract_tags(amenities_list):
    tags = []
    if not amenities_list:
        return tags
    lowered = [a.lower() for a in amenities_list]
    if any('pet' in a for a in lowered):
        tags.append('pet-friendly')
    if any('breakfast' in a or 'continental' in a for a in lowered):
        tags.append('breakfast')
    if any('wifi' in a or 'internet' in a for a in lowered):
        tags.append('wifi')
    return tags


def to_jsonable(obj):
    try:
        return json.dumps(obj)
    except Exception:
        return str(obj)

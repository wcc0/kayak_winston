import os
import asyncio
import ujson as json
from datetime import datetime
from typing import Optional

from .utils import parse_price, parse_date, extract_tags

OUT_FILE = os.environ.get('OUT_FILE')
DIRECT_OUTPUT_URL = os.environ.get('DIRECT_OUTPUT_URL')


async def normalize_record(raw: dict) -> dict:
    listing_id = raw.get('listing_id') or raw.get('id') or str(raw.get('listing'))
    date = parse_date(raw.get('date')) or datetime.utcnow()
    price = parse_price(raw.get('price'))
    availability = None
    try:
        availability = int(raw.get('availability')) if raw.get('availability') is not None else None
    except Exception:
        availability = None
    amenities = raw.get('amenities') or raw.get('amenity_list') or []
    if isinstance(amenities, str):
        amenities = [a.strip() for a in amenities.split('|') if a.strip()]
    tags = extract_tags(amenities)

    normalized = {
        'listing_id': listing_id,
        'date': date.isoformat() if isinstance(date, datetime) else str(date),
        'price': price,
        'availability': availability,
        'amenities': amenities,
        'tags': tags,
        'neighbourhood': raw.get('neighbourhood') or raw.get('neighborhood') or None,
        'source': raw.get('source') or None,
        'raw': raw,
    }
    return normalized


def _sync_append(path: str, line: str):
    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
    with open(path, 'a', encoding='utf-8') as fh:
        fh.write(line + '\n')


async def file_append(path: str, obj: dict):
    try:
        line = json.dumps(obj)
        await asyncio.to_thread(_sync_append, path, line)
    except Exception as e:
        print('file append error', e)


async def direct_post(session, url: str, payload: dict):
    try:
        async with session.post(url, json=payload, timeout=10) as resp:
            if resp.status >= 300:
                text = await resp.text()
                print('direct post failed', resp.status, text[:200])
                return False
            return True
    except Exception as e:
        print('direct post exception', e)
        return False


async def process_normalized(normalized: dict):
    # file sink
    if OUT_FILE:
        await file_append(OUT_FILE, normalized)

    # direct HTTP
    if DIRECT_OUTPUT_URL:
        import aiohttp
        async with aiohttp.ClientSession() as sess:
            await direct_post(sess, DIRECT_OUTPUT_URL, normalized)

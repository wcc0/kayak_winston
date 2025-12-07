import os
import csv
import asyncio
import aiohttp
from datetime import datetime

from .db import engine, get_session, init_db
from .models import Deal as DealModel

DATA_CSV = os.environ.get('FEED_CSV', '/app/data/sample_feed.csv')
CONCIERGE_EVENTS_URL = os.environ.get('CONCIERGE_EVENTS_URL', 'http://host.docker.internal:8002/events')

async def run_once():
    # ensure DB
    await init_db()
    if not os.path.exists(DATA_CSV):
        return
    async with get_session() as sess:
        with open(DATA_CSV, 'r', encoding='utf-8') as fh:
            reader = csv.DictReader(fh)
            for row in reader:
                d = DealModel(listing_id=row.get('listing_id') or row.get('id'), date=row.get('date'), price=float(row.get('price') or 0), availability=int(row.get('availability') or 0), tags=row.get('amenities'), neighbourhood=row.get('neighbourhood'))
                sess.add(d)
            await sess.commit()

    # basic detection: any deal with price drop simulated by price < 0.85 * avg of all
    async with get_session() as sess:
        res = await sess.exec("SELECT * FROM deal")
        rows = res.all()
        # compute simple avg per listing group
        prices = [r.price for r in rows if r.price]
        avg = sum(prices)/len(prices) if prices else 0
        alerts = []
        for r in rows:
            if r.price and avg and r.price <= 0.85 * avg:
                alerts.append({'listing_id': r.listing_id, 'price': r.price, 'neighbourhood': r.neighbourhood, 'tags': r.tags})

    # post alerts to concierge events
    if alerts:
        async with aiohttp.ClientSession() as sess:
            for a in alerts:
                try:
                    await sess.post(CONCIERGE_EVENTS_URL, json=a, timeout=5)
                except Exception:
                    pass


if __name__ == '__main__':
    asyncio.run(run_once())

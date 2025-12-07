import os
import csv
import asyncio
import aiohttp

DATA_CSV = os.environ.get('FEED_CSV', '/app/data/sample_feed.csv')
CONCIERGE_EVENTS_URL = os.environ.get('CONCIERGE_EVENTS_URL', 'http://host.docker.internal:8002/events')


async def run_once():
    if not os.path.exists(DATA_CSV):
        print('No feed CSV found at', DATA_CSV)
        return

    rows = []
    with open(DATA_CSV, 'r', encoding='utf-8') as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            try:
                price = float(row.get('price') or 0)
            except Exception:
                price = 0.0
            rows.append({
                'listing_id': row.get('listing_id') or row.get('id'),
                'date': row.get('date'),
                'price': price,
                'availability': int(row.get('availability') or 0),
                'amenities': row.get('amenities'),
                'neighbourhood': row.get('neighbourhood'),
                'source': row.get('source')
            })

    prices = [r['price'] for r in rows if r['price']]
    avg = sum(prices) / len(prices) if prices else 0
    alerts = []
    for r in rows:
        if r['price'] and avg and r['price'] <= 0.85 * avg:
            alerts.append(r)

    if not alerts:
        print('No alerts found')
        return

    async with aiohttp.ClientSession() as sess:
        for a in alerts:
            try:
                print('Posting alert', a)
                await sess.post(CONCIERGE_EVENTS_URL, json=a, timeout=5)
            except Exception as e:
                print('post failed', e)


if __name__ == '__main__':
    asyncio.run(run_once())

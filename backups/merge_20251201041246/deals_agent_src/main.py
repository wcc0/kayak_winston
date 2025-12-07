import asyncio
import json
import os
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
from .utils import parse_csv_row
from .light_processor import compute_deal_score, tag_offer
from .db import init_db, get_session
from .models import NormalizedDeal
from datetime import date


KAFKA_BOOTSTRAP = os.getenv('KAFKA_BOOTSTRAP', 'localhost:9092')


async def process_row(producer, raw: dict):
    # Normalize
    row = parse_csv_row(raw)
    # Compute avg_30d stub (in real system compute from history)
    row['avg_30d'] = row.get('price') * 1.15
    # Score
    row['score'] = compute_deal_score(row)
    # Tag
    row = tag_offer(row)

    # persist minimal normalized (sqlite) and publish to topics
    with get_session() as s:
        nd = NormalizedDeal(
            source_id=row.get('source_id') or 'unknown',
            listing_id=row.get('listing_id') or 'unknown',
            date=date.fromisoformat(row.get('date')) if row.get('date') else date.today(),
            price=row.get('price', 0),
            currency=row.get('currency', 'USD'),
            availability=row.get('availability', 0),
            avg_30d=row.get('avg_30d'),
            tags=row.get('tags'),
        )
        s.add(nd)
        s.commit()

    # publish normalized
    await producer.send_and_wait('deals.normalized', json.dumps(row).encode('utf-8'))
    # publish scored
    scored = {'listing_id': row.get('listing_id'), 'score': row.get('score')}
    await producer.send_and_wait('deals.scored', json.dumps(scored).encode('utf-8'))
    # publish tagged
    tagged = {'listing_id': row.get('listing_id'), 'tags': row.get('tags')}
    await producer.send_and_wait('deals.tagged', json.dumps(tagged).encode('utf-8'))


async def consumer_loop():
    consumer = AIOKafkaConsumer('raw_supplier_feeds', bootstrap_servers=KAFKA_BOOTSTRAP, group_id='deals-worker')
    producer = AIOKafkaProducer(bootstrap_servers=KAFKA_BOOTSTRAP)
    await consumer.start()
    await producer.start()
    try:
        async for msg in consumer:
            try:
                raw = json.loads(msg.value.decode('utf-8'))
            except Exception:
                continue
            await process_row(producer, raw)
    finally:
        await consumer.stop()
        await producer.stop()


def main():
    init_db()
    asyncio.run(consumer_loop())


if __name__ == '__main__':
    main()

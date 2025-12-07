import os
import asyncio
import ujson as json
from datetime import datetime
from typing import Optional

from .utils import parse_price, parse_date, extract_tags
from .db import init_db, get_session
from .models import DealNormalized

# Optional dependencies imported lazily
KAFKA_BOOTSTRAP = os.environ.get('KAFKA_BOOTSTRAP', 'localhost:9092')
KAFKA_GROUP = os.environ.get('KAFKA_GROUP', 'deals-agent-group')
RAW_TOPIC = os.environ.get('RAW_TOPIC', 'raw_supplier_feeds')
OUT_TOPIC = os.environ.get('PRODUCE_TO_TOPIC', 'deals.normalized')

# Modes: 'kafka' (default) or 'file'
INPUT_MODE = os.environ.get('INPUT_MODE', 'kafka')
INPUT_FILE = os.environ.get('INPUT_FILE', '')
OUT_FILE = os.environ.get('OUT_FILE', '')
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


async def persist_normalized(session, obj: dict):
    try:
        dn = DealNormalized(
            listing_id=obj['listing_id'],
            date=datetime.fromisoformat(obj['date']) if isinstance(obj['date'], str) else obj['date'],
            price=obj['price'] if obj['price'] is not None else 0.0,
            availability=obj.get('availability'),
            amenities=obj.get('amenities') or [],
            neighbourhood=obj.get('neighbourhood'),
            source=obj.get('source'),
            raw_payload=obj.get('raw')
        )
        session.add(dn)
        await session.commit()
    except Exception as e:
        print('persist error', e)


async def direct_post(session, url: str, payload: dict):
    # lazily import aiohttp to avoid adding it to runtime unless used
    import aiohttp
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


async def file_append(path: str, obj: dict):
    try:
        os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
        line = json.dumps(obj)
        # Use asyncio.to_thread to avoid blocking the event loop
        await asyncio.to_thread(_sync_append, path, line)
    except Exception as e:
        print('file append error', e)


def _sync_append(path: str, line: str):
    with open(path, 'a', encoding='utf-8') as fh:
        fh.write(line + '\n')


async def process_normalized(normalized: dict, producer=None, aiohttp_sess: Optional[object]=None):
    # produce to Kafka if producer is provided
    if producer is not None:
        try:
            await producer.send_and_wait(OUT_TOPIC, normalized)
        except Exception as e:
            print('kafka produce error', e)

    # persist to DB if configured
    if os.environ.get('POSTGRES_DSN'):
        try:
            async with get_session() as session:
                await persist_normalized(session, normalized)
        except Exception as e:
            print('db persist error', e)

    # file sink
    if OUT_FILE:
        await file_append(OUT_FILE, normalized)

    # direct HTTP
    if DIRECT_OUTPUT_URL and aiohttp_sess is not None:
        await direct_post(aiohttp_sess, DIRECT_OUTPUT_URL, normalized)


async def run_kafka_loop():
    # Lazy import aiokafka
    from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
    consumer = AIOKafkaConsumer(
        RAW_TOPIC,
        bootstrap_servers=KAFKA_BOOTSTRAP,
        group_id=KAFKA_GROUP,
        value_deserializer=lambda v: json.loads(v.decode('utf-8'))
    )
    producer = AIOKafkaProducer(bootstrap_servers=KAFKA_BOOTSTRAP, value_serializer=lambda v: json.dumps(v).encode('utf-8'))

    await consumer.start()
    await producer.start()
    aiohttp_sess = None
    if DIRECT_OUTPUT_URL:
        import aiohttp
        aiohttp_sess = aiohttp.ClientSession()

    print('Deals Agent started (kafka mode), listening for', RAW_TOPIC)
    try:
        async for msg in consumer:
            raw = msg.value
            try:
                normalized = await normalize_record(raw)
                await process_normalized(normalized, producer=producer, aiohttp_sess=aiohttp_sess)
            except Exception as e:
                print('processing error', e)
    finally:
        await consumer.stop()
        await producer.stop()
        if aiohttp_sess:
            await aiohttp_sess.close()


async def run_file_loop():
    if not INPUT_FILE:
        print('INPUT_MODE=file but INPUT_FILE not set')
        return

    aiohttp_sess = None
    if DIRECT_OUTPUT_URL:
        import aiohttp
        aiohttp_sess = aiohttp.ClientSession()

    producer = None
    # If Kafka bootstrap set and PRODUCE_TO_TOPIC is set, create a producer.
    if os.environ.get('KAFKA_BOOTSTRAP') and os.environ.get('PRODUCE_TO_TOPIC'):
        from aiokafka import AIOKafkaProducer
        producer = AIOKafkaProducer(bootstrap_servers=KAFKA_BOOTSTRAP, value_serializer=lambda v: json.dumps(v).encode('utf-8'))
        await producer.start()

    print('Deals Agent started (file mode), reading', INPUT_FILE)
    try:
        # Read input file lines and process sequentially
        def iter_lines(path):
            with open(path, 'r', encoding='utf-8') as fh:
                for line in fh:
                    line = line.strip()
                    if not line:
                        continue
                    yield line

        for line in iter_lines(INPUT_FILE):
            try:
                try:
                    raw = json.loads(line)
                except Exception:
                    # Try CSV-like parsing fallback (not exhaustive)
                    print('skipping non-json line')
                    continue
                normalized = await normalize_record(raw)
                await process_normalized(normalized, producer=producer, aiohttp_sess=aiohttp_sess)
                # small sleep to avoid hot loop when reusing static files
                await asyncio.sleep(0)
            except Exception as e:
                print('processing line error', e)
    finally:
        if producer is not None:
            await producer.stop()
        if aiohttp_sess:
            await aiohttp_sess.close()


async def main():
    await init_db()
    if INPUT_MODE == 'file':
        await run_file_loop()
    else:
        await run_kafka_loop()


if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print('shutting down')

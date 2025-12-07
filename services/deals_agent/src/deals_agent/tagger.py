import os
import asyncio
import ujson as json
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer

KAFKA_BOOTSTRAP = os.environ.get('KAFKA_BOOTSTRAP', 'localhost:29092')
IN_TOPIC = os.environ.get('DEALS_SCORED_TOPIC', 'deals.scored')
OUT_TOPIC = os.environ.get('DEALS_TAGGED_TOPIC', 'deals.tagged')
GROUP_ID = os.environ.get('TAGGER_GROUP', 'deals-tagger-group')


def simple_tags_from_amenities(amenities):
    tags = set()
    if not amenities:
        return []
    for a in amenities:
        s = (a or '').lower()
        if 'pet' in s or 'dog' in s or 'cat' in s:
            tags.add('pet-friendly')
        if 'breakfast' in s:
            tags.add('breakfast')
        if 'wifi' in s or 'internet' in s:
            tags.add('wifi')
        if 'transit' in s or 'metro' in s or 'station' in s or 'subway' in s:
            tags.add('near-transit')
    return list(tags)


async def run_tagger():
    consumer = AIOKafkaConsumer(IN_TOPIC, bootstrap_servers=KAFKA_BOOTSTRAP, group_id=GROUP_ID,
                                value_deserializer=lambda v: json.loads(v.decode('utf-8')))
    producer = AIOKafkaProducer(bootstrap_servers=KAFKA_BOOTSTRAP, value_serializer=lambda v: json.dumps(v).encode('utf-8'))

    await consumer.start()
    await producer.start()
    print('Deals Tagger started, listening to', IN_TOPIC)
    try:
        async for msg in consumer:
            raw = msg.value
            try:
                amenities = raw.get('amenities') or []
                extra = simple_tags_from_amenities(amenities)
                merged_tags = list(dict.fromkeys((raw.get('tags') or []) + extra))
                tagged = dict(raw)
                tagged['tags'] = merged_tags
                tagged['tagged_at'] = __import__('datetime').datetime.utcnow().isoformat()
                await producer.send_and_wait(OUT_TOPIC, tagged)
            except Exception as e:
                print('tagger processing error', e)
    finally:
        await consumer.stop()
        await producer.stop()


if __name__ == '__main__':
    try:
        asyncio.run(run_tagger())
    except KeyboardInterrupt:
        print('tagger shutting down')

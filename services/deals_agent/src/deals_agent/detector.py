import os
import asyncio
import ujson as json
from datetime import datetime, timedelta
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer

KAFKA_BOOTSTRAP = os.environ.get('KAFKA_BOOTSTRAP', 'localhost:29092')
IN_TOPIC = os.environ.get('PRODUCE_TO_TOPIC', 'deals.normalized')
OUT_TOPIC = os.environ.get('DEALS_SCORED_TOPIC', 'deals.scored')
EVENTS_TOPIC = os.environ.get('DEAL_EVENTS_TOPIC', 'deal.events')
GROUP_ID = os.environ.get('DETECTOR_GROUP', 'deals-detector-group')


class RollingWindow:
    def __init__(self):
        # mapping listing_id -> list of (date, price)
        self.data = {}

    def add(self, listing_id, date: datetime, price: float):
        lst = self.data.setdefault(listing_id, [])
        lst.append((date, price))
        # keep only last 45 days to be safe
        cutoff = datetime.utcnow() - timedelta(days=45)
        while lst and lst[0][0] < cutoff:
            lst.pop(0)

    def avg_30d(self, listing_id):
        lst = self.data.get(listing_id, [])
        if not lst:
            return None
        cutoff = datetime.utcnow() - timedelta(days=30)
        prices = [p for (d, p) in lst if d >= cutoff]
        if not prices:
            return None
        return sum(prices) / len(prices)


async def run_detector():
    consumer = AIOKafkaConsumer(IN_TOPIC, bootstrap_servers=KAFKA_BOOTSTRAP, group_id=GROUP_ID,
                                value_deserializer=lambda v: json.loads(v.decode('utf-8')))
    producer = AIOKafkaProducer(bootstrap_servers=KAFKA_BOOTSTRAP, value_serializer=lambda v: json.dumps(v).encode('utf-8'))

    await consumer.start()
    await producer.start()
    window = RollingWindow()
    print('Deals Detector started, listening to', IN_TOPIC)
    try:
        async for msg in consumer:
            raw = msg.value
            try:
                listing_id = raw.get('listing_id')
                date_str = raw.get('date')
                price = raw.get('price') if raw.get('price') is not None else 0.0
                try:
                    date = datetime.fromisoformat(date_str) if date_str else datetime.utcnow()
                except Exception:
                    date = datetime.utcnow()

                # update rolling window
                window.add(listing_id, date, float(price))

                avg30 = window.avg_30d(listing_id)
                is_deal = False
                limited = False
                promo = False
                deal_score = 0

                if avg30 is not None and price is not None:
                    if price <= 0.85 * avg30:
                        is_deal = True
                        promo = True
                        deal_score += 2

                    # scarcity
                    if raw.get('availability') is not None:
                        try:
                            if int(raw.get('availability')) < 5:
                                limited = True
                                deal_score += 1
                        except Exception:
                            pass

                # small normalization of score to 1-5
                if deal_score > 0:
                    deal_score = min(5, deal_score + 1)

                scored = dict(raw)
                scored.update({
                    'avg_30d_price': avg30,
                    'is_deal': is_deal,
                    'limited_availability': limited,
                    'promo': promo,
                    'deal_score': deal_score,
                    'scored_at': datetime.utcnow().isoformat(),
                })

                # produce to scored topic
                await producer.send_and_wait(OUT_TOPIC, scored)

                # emit concise event if deal discovered
                if is_deal:
                    evt = {
                        'listing_id': listing_id,
                        'price': price,
                        'avg_30d_price': avg30,
                        'deal_score': deal_score,
                        'limited_availability': limited,
                        'neighbourhood': raw.get('neighbourhood')
                    }
                    await producer.send_and_wait(EVENTS_TOPIC, evt)
            except Exception as e:
                print('detector processing error', e)
    finally:
        await consumer.stop()
        await producer.stop()


if __name__ == '__main__':
    try:
        asyncio.run(run_detector())
    except KeyboardInterrupt:
        print('detector shutting down')

#!/usr/bin/env python3
"""
Verify deals are being processed by reading a few messages from output topics
"""
import asyncio
from aiokafka import AIOKafkaConsumer
import json

KAFKA_BOOTSTRAP = 'localhost:29092'

async def check_topic(topic_name, num_messages=5):
    """Read a few messages from a topic to verify it's working"""
    
    print(f"\n📊 Checking topic: {topic_name}")
    print(f"   Reading up to {num_messages} messages...")
    
    consumer = AIOKafkaConsumer(
        topic_name,
        bootstrap_servers=KAFKA_BOOTSTRAP,
        auto_offset_reset='earliest',
        value_deserializer=lambda v: json.loads(v.decode('utf-8'))
    )
    
    await consumer.start()
    
    try:
        count = 0
        async for msg in consumer:
            count += 1
            value = msg.value
            
            # Pretty print first few messages
            if count <= 3:
                print(f"\n   Message {count}:")
                # Show key fields
                if 'listing_id' in value:
                    print(f"      listing_id: {value.get('listing_id')}")
                if 'price' in value:
                    print(f"      price: ${value.get('price')}")
                if 'avg_30d_price' in value:
                    print(f"      avg_30d: ${value.get('avg_30d_price')}")
                if 'deal_score' in value:
                    print(f"      deal_score: {value.get('deal_score')}")
                if 'is_deal' in value:
                    print(f"      is_deal: {value.get('is_deal')}")
                if 'tags' in value:
                    print(f"      tags: {value.get('tags')}")
            
            if count >= num_messages:
                break
        
        print(f"\n   ✅ Total messages read: {count}")
        if count == 0:
            print(f"   ⚠️  No messages found (topic may be empty or still processing)")
        
    finally:
        await consumer.stop()


async def main():
    """Check all output topics"""
    
    print("="*60)
    print("🔍 VERIFYING DEALS AGENT PIPELINE")
    print("="*60)
    
    topics_to_check = [
        ('deals.normalized', 10),
        ('deals.scored', 10),
        ('deals.tagged', 10),
        ('deal.events', 5),
    ]
    
    for topic, num_msgs in topics_to_check:
        try:
            await check_topic(topic, num_msgs)
        except Exception as e:
            print(f"\n   ❌ Error checking {topic}: {e}")
    
    print("\n" + "="*60)
    print("✅ VERIFICATION COMPLETE")
    print("="*60)
    print()


if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n⚠️  Interrupted")

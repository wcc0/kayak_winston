#!/usr/bin/env python3
"""
Ingest sample CSV feeds into Kafka topics
Simulates supplier data feeds arriving for the Deals Agent to process
"""
import asyncio
import csv
import json
from pathlib import Path
from aiokafka import AIOKafkaProducer
from aiokafka.admin import AIOKafkaAdminClient, NewTopic

KAFKA_BOOTSTRAP = 'localhost:29092'

TOPICS = [
    'raw_supplier_feeds',
    'deals.normalized',
    'deals.scored',
    'deals.tagged',
    'deal.events',
]

async def create_topics():
    """Create Kafka topics if they don't exist"""
    admin_client = AIOKafkaAdminClient(bootstrap_servers=KAFKA_BOOTSTRAP)
    await admin_client.start()
    
    try:
        # Get existing topics
        existing_topics = await admin_client.list_topics()
        
        # Create missing topics
        new_topics = []
        for topic_name in TOPICS:
            if topic_name not in existing_topics:
                new_topics.append(
                    NewTopic(name=topic_name, num_partitions=3, replication_factor=1)
                )
        
        if new_topics:
            print(f"📝 Creating {len(new_topics)} topics...")
            await admin_client.create_topics(new_topics, validate_only=False)
            print(f"✅ Topics created: {[t.name for t in new_topics]}")
        else:
            print(f"✅ All topics already exist")
            
    finally:
        await admin_client.close()


async def ingest_csv_to_kafka(csv_file, producer, topic, feed_type):
    """Read CSV and produce messages to Kafka"""
    
    print(f"📤 Ingesting {csv_file.name} -> {topic}")
    
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        count = 0
        
        for row in reader:
            # Add metadata
            message = {
                'feed_type': feed_type,
                'source': 'sample_csv',
                'data': row
            }
            
            # Use listing_id or flight_id as key for partitioning
            key = row.get('listing_id') or row.get('flight_id') or str(count)
            
            await producer.send(
                topic,
                key=key.encode('utf-8'),
                value=json.dumps(message).encode('utf-8')
            )
            
            count += 1
            
            if count % 500 == 0:
                print(f"  ... {count} messages sent")
        
        await producer.flush()
        print(f"✅ Ingested {count} messages from {csv_file.name}")
        return count


async def main():
    """Ingest all sample datasets into Kafka"""
    
    print("="*60)
    print("📊 INGESTING DATASETS TO KAFKA")
    print("="*60)
    print()
    
    # Check if sample data exists
    sample_data_dir = Path(__file__).parent / 'sample_data'
    hotels_file = sample_data_dir / 'airbnb_listings.csv'
    flights_file = sample_data_dir / 'flight_prices.csv'
    
    if not hotels_file.exists() or not flights_file.exists():
        print("❌ Sample data not found!")
        print(f"   Expected: {hotels_file}")
        print(f"   Expected: {flights_file}")
        print()
        print("Run: python generate_sample_data.py first")
        return
    
    # Create topics
    print("🔧 Setting up Kafka topics...")
    try:
        await create_topics()
    except Exception as e:
        print(f"❌ Failed to create topics: {e}")
        print()
        print("Make sure Kafka is running:")
        print("  docker-compose up -d")
        return
    
    print()
    
    # Create producer
    producer = AIOKafkaProducer(
        bootstrap_servers=KAFKA_BOOTSTRAP,
        value_serializer=None,  # We'll encode manually
        compression_type='gzip'
    )
    
    await producer.start()
    
    try:
        # Ingest hotels
        hotel_count = await ingest_csv_to_kafka(
            hotels_file, 
            producer, 
            'raw_supplier_feeds',
            'hotel'
        )
        
        print()
        
        # Ingest flights
        flight_count = await ingest_csv_to_kafka(
            flights_file,
            producer,
            'raw_supplier_feeds',
            'flight'
        )
        
        print()
        print("="*60)
        print("✅ INGESTION COMPLETE!")
        print("="*60)
        print(f"   Hotels: {hotel_count:,} messages")
        print(f"   Flights: {flight_count:,} messages")
        print(f"   Total: {hotel_count + flight_count:,} messages")
        print()
        print("Kafka topic: raw_supplier_feeds")
        print()
        print("Next: Start the Deals Agent to process these feeds")
        print("  cd services/deals_agent")
        print("  uvicorn src.deals_agent.app:app --reload --port 8000")
        print()
        
    finally:
        await producer.stop()


if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n⚠️  Interrupted by user")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

"""
Directly populate the Concierge Agent's database with sample deals for testing.
This bypasses Kafka and inserts deals directly into SQLite.
"""
import asyncio
import json
import sys
from pathlib import Path

# Add the concierge agent to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / 'services' / 'concierge_agent' / 'src'))

from concierge_agent.db import get_session, init_db
from concierge_agent.models import Deal

async def populate_sample_deals():
    """Insert sample deals directly into the database"""
    
    await init_db()
    
    sample_deals = [
        # Manhattan hotels with various amenities
        {
            'listing_id': 'HTL_MAN_001',
            'date': '2024-12-15',
            'price': 450.0,
            'availability': 8,
            'tags': json.dumps(['breakfast', 'wifi', 'pet-friendly']),
            'neighbourhood': 'Manhattan - Midtown',
            'source': 'airbnb',
            'raw': json.dumps({'is_deal': True, 'deal_score': 4})
        },
        {
            'listing_id': 'HTL_MAN_002',
            'date': '2024-12-16',
            'price': 380.0,
            'availability': 3,
            'tags': json.dumps(['breakfast', 'near-transit']),
            'neighbourhood': 'Manhattan - Upper East Side',
            'source': 'airbnb',
            'raw': json.dumps({'is_deal': True, 'deal_score': 5})
        },
        {
            'listing_id': 'HTL_MAN_003',
            'date': '2024-12-17',
            'price': 520.0,
            'availability': 12,
            'tags': json.dumps(['wifi', 'gym', 'parking']),
            'neighbourhood': 'Manhattan - SoHo',
            'source': 'airbnb',
            'raw': json.dumps({'is_deal': False, 'deal_score': 2})
        },
        {
            'listing_id': 'HTL_MAN_004',
            'date': '2024-12-18',
            'price': 295.0,
            'availability': 5,
            'tags': json.dumps(['breakfast', 'wifi']),
            'neighbourhood': 'Manhattan - Harlem',
            'source': 'airbnb',
            'raw': json.dumps({'is_deal': True, 'deal_score': 5})
        },
        {
            'listing_id': 'HTL_MAN_005',
            'date': '2024-12-19',
            'price': 680.0,
            'availability': 15,
            'tags': json.dumps(['pet-friendly', 'breakfast', 'wifi', 'pool']),
            'neighbourhood': 'Manhattan - Chelsea',
            'source': 'airbnb',
            'raw': json.dumps({'is_deal': False, 'deal_score': 1})
        },
        # Brooklyn options
        {
            'listing_id': 'HTL_BRK_001',
            'date': '2024-12-15',
            'price': 220.0,
            'availability': 6,
            'tags': json.dumps(['near-transit', 'wifi']),
            'neighbourhood': 'Brooklyn - Williamsburg',
            'source': 'airbnb',
            'raw': json.dumps({'is_deal': True, 'deal_score': 4})
        },
        {
            'listing_id': 'HTL_BRK_002',
            'date': '2024-12-16',
            'price': 340.0,
            'availability': 4,
            'tags': json.dumps(['breakfast', 'pet-friendly', 'parking']),
            'neighbourhood': 'Brooklyn - Park Slope',
            'source': 'airbnb',
            'raw': json.dumps({'is_deal': True, 'deal_score': 3})
        },
        # Flights
        {
            'listing_id': 'FLT_SFO_JFK_001',
            'date': '2024-12-15',
            'price': 320.0,
            'availability': 45,
            'tags': json.dumps(['direct', 'morning']),
            'neighbourhood': None,
            'source': 'flight_feed',
            'raw': json.dumps({'origin': 'SFO', 'dest': 'JFK', 'airline': 'United', 'is_deal': True})
        },
        {
            'listing_id': 'FLT_LAX_JFK_001',
            'date': '2024-12-15',
            'price': 280.0,
            'availability': 32,
            'tags': json.dumps(['1-stop', 'afternoon']),
            'neighbourhood': None,
            'source': 'flight_feed',
            'raw': json.dumps({'origin': 'LAX', 'dest': 'JFK', 'airline': 'Delta', 'is_deal': True})
        },
    ]
    
    async with get_session() as sess:
        # Check if deals already exist
        from sqlmodel import select
        existing_result = await sess.exec(select(Deal))
        existing = list(existing_result.all())
        if existing:
            print("⚠️  Database already has deals. Showing existing:")
            print(f"   Total: {len(existing)} deals")
            hotels = [d for d in existing if d.listing_id and 'HTL' in d.listing_id]
            flights = [d for d in existing if d.listing_id and 'FLT' in d.listing_id]
            print(f"   - {len(hotels)} hotels")
            print(f"   - {len(flights)} flights")
            if hotels[:5]:
                print("\n   Sample hotels:")
                for h in hotels[:5]:
                    print(f"   • ${h.price:.0f} - {h.neighbourhood} ({h.listing_id})")
            return
        
        # Insert sample deals
        for deal_data in sample_deals:
            deal = Deal(**deal_data)
            sess.add(deal)
        
        await sess.commit()
        print(f"✅ Inserted {len(sample_deals)} sample deals into database")
        print(f"   - {len([d for d in sample_deals if 'HTL' in d['listing_id']])} hotels")
        print(f"   - {len([d for d in sample_deals if 'FLT' in d['listing_id']])} flights")
        print("\nSample hotels:")
        for deal_data in sample_deals[:5]:
            if 'HTL' in deal_data['listing_id']:
                print(f"   • ${deal_data['price']:.0f} - {deal_data['neighbourhood']} ({deal_data['listing_id']})")

if __name__ == '__main__':
    print("=" * 60)
    print("POPULATING CONCIERGE DATABASE WITH SAMPLE DEALS")
    print("=" * 60)
    print()
    
    asyncio.run(populate_sample_deals())
    
    print()
    print("=" * 60)
    print("✅ DONE! Test the chat endpoint now:")
    print("   'Find hotels in Manhattan with breakfast under $500'")
    print("=" * 60)

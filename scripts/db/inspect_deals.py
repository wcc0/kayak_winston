"""Check what deals are actually in the database"""
import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent / 'services' / 'concierge_agent' / 'src'))

from concierge_agent.db import get_session
from concierge_agent.models import Deal
from sqlmodel import select

async def inspect_deals():
    async with get_session() as sess:
        result = await sess.exec(select(Deal).limit(5))
        deals = list(result.all())
        
        print(f"Found {len(deals)} sample deals:\n")
        for d in deals:
            print(f"ID: {d.id}")
            print(f"  listing_id: {d.listing_id}")
            print(f"  price: ${d.price}")
            print(f"  neighbourhood: {d.neighbourhood}")
            print(f"  tags: {d.tags}")
            print(f"  source: {d.source}")
            print(f"  raw (first 100 chars): {str(d.raw)[:100]}")
            print()

if __name__ == '__main__':
    asyncio.run(inspect_deals())

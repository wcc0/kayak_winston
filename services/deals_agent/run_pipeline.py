#!/usr/bin/env python3
"""
Run all Deals Agent components together for testing
Starts: normalizer, detector, tagger in parallel
"""
import asyncio
import os
import sys
from pathlib import Path

# Add parent to path so we can import the deals_agent modules
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

async def run_component(name, coro):
    """Run a component with error handling"""
    print(f"🚀 Starting {name}...")
    try:
        await coro()
    except Exception as e:
        print(f"❌ {name} crashed: {e}")
        raise

async def main():
    """Run all components concurrently"""
    
    # Set environment variables
    os.environ.setdefault('KAFKA_BOOTSTRAP', 'localhost:29092')
    os.environ.setdefault('RAW_TOPIC', 'raw_supplier_feeds')
    os.environ.setdefault('PRODUCE_TO_TOPIC', 'deals.normalized')
    os.environ.setdefault('DEALS_SCORED_TOPIC', 'deals.scored')
    os.environ.setdefault('DEALS_TAGGED_TOPIC', 'deals.tagged')
    os.environ.setdefault('DEAL_EVENTS_TOPIC', 'deal.events')
    
    print("="*60)
    print("🤖 STARTING DEALS AGENT PIPELINE")
    print("="*60)
    print()
    print("Components:")
    print("  1. Normalizer: raw_supplier_feeds → deals.normalized")
    print("  2. Detector:   deals.normalized → deals.scored")
    print("  3. Tagger:     deals.scored → deals.tagged")
    print()
    print("Kafka: localhost:29092")
    print()
    print("Press Ctrl+C to stop all components")
    print("="*60)
    print()
    
    from src.deals_agent.main import run_kafka_loop
    from src.deals_agent.detector import run_detector
    from src.deals_agent.tagger import run_tagger
    
    # Run all three components concurrently
    tasks = [
        asyncio.create_task(run_component("Normalizer", run_kafka_loop)),
        asyncio.create_task(run_component("Detector", run_detector)),
        asyncio.create_task(run_component("Tagger", run_tagger)),
    ]
    
    try:
        # Wait for all tasks
        await asyncio.gather(*tasks)
    except KeyboardInterrupt:
        print("\n⚠️  Shutting down all components...")
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        print("✅ All components stopped")


if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass

import asyncio
import sys
import os
# ensure repo root in path
sys.path.insert(0, os.getcwd())
from services.deals_agent.src.deals_agent.data_ingest import ingest_mock_deals


def main():
    print('Running ingestion...')
    res = asyncio.run(ingest_mock_deals())
    print('Ingested', len(res), 'records')


if __name__ == '__main__':
    main()

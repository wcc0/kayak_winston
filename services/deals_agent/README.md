Deals Agent
===========

Kafka-driven backend worker that ingests supplier feeds, normalizes rows, scores deals, tags offers, and emits events.

Scaffold includes:
- `main.py`: aiokafka consumer loop consuming `raw_supplier_feeds`, producing `deals.normalized`, `deals.scored`, `deals.tagged`.
- `light_processor.py`: simple scoring/tagging heuristics.
- `models.py`: SQLModel/pydantic models for normalized rows.

Run locally:

```bash
pip install -r requirements.txt
python -m src.deals_agent.main
```

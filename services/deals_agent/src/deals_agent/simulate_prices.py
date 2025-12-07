"""Flight price simulator

Generate synthetic time-series for flights using mean-reversion and promo dips.
This is used to create price snapshots the Deals Agent can ingest and detect deals.
"""
import os
import csv
import random
from datetime import datetime, timedelta
from typing import List, Dict


def simulate_flight_series(flight: Dict, days: int = 90) -> List[Dict]:
    """Simulate `days` price snapshots for a flight baseline.

    flight: dict with keys 'price' (base), 'seats_available' (int)
    Returns list of {'date','price','seats_left'}
    """
    mu = float(flight.get('price', 200.0) or 200.0)
    p = mu
    alpha = 0.07
    sigma = max(1.0, mu * 0.02)
    seats = int(flight.get('seats_available', 100) or 100)
    start = datetime.utcnow()

    out = []
    for i in range(days):
        # mean reversion
        noise = random.gauss(0, sigma)
        p = p + alpha * (mu - p) + noise
        # occasional promo dip
        if random.random() < 0.05:
            promo = random.uniform(0.10, 0.25)
            p = p * (1 - promo)
            promo_factor = 1 - promo
        else:
            promo_factor = 1.0

        # seats dynamics
        seats = max(1, seats - random.randint(0, 3))

        out.append({
            'date': (start + timedelta(days=i)).isoformat(),
            'price': round(max(20.0, p), 2),
            'seats_left': seats,
            'promo_factor': round(promo_factor, 2)
        })

    return out


def dump_series_to_csv(series: List[Dict], out_path: str):
    os.makedirs(os.path.dirname(out_path) or '.', exist_ok=True)
    with open(out_path, 'w', newline='', encoding='utf-8') as fh:
        writer = csv.DictWriter(fh, fieldnames=['date','price','seats_left','promo_factor'])
        writer.writeheader()
        for r in series:
            writer.writerow(r)

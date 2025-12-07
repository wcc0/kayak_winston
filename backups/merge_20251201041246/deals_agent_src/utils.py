import csv
from typing import Dict


def parse_csv_row(row: Dict[str, str]) -> Dict:
    # Lightweight CSV row normalizer — convert fields to expected types
    out = {}
    out['source_id'] = row.get('source_id') or row.get('id')
    out['listing_id'] = row.get('listing_id') or row.get('listing')
    out['date'] = row.get('date')
    out['price'] = float(row.get('price') or 0)
    out['currency'] = row.get('currency') or 'USD'
    out['availability'] = int(row.get('availability') or 0)
    return out

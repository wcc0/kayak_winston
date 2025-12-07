from typing import Dict


def compute_deal_score(row: Dict) -> int:
    # Simple score: bigger discount -> higher score, availability penalty
    # Assume row has price and avg_30d
    score = 0
    avg = row.get('avg_30d')
    price = row.get('price', 0)
    availability = row.get('availability', 999)
    if avg and avg > 0:
        discount = max(0, (avg - price) / avg)
        if discount >= 0.25:
            score += 5
        elif discount >= 0.15:
            score += 3
        elif discount >= 0.10:
            score += 2
    # limited inventory increases score
    if availability <= 5:
        score += 2
    # simple caps
    return min(10, score)


def tag_offer(row: Dict) -> Dict:
    tags = []
    amenities = row.get('amenities', '')
    if 'pet' in amenities.lower():
        tags.append('Pet-friendly')
    if 'breakfast' in amenities.lower():
        tags.append('Breakfast')
    if row.get('availability', 999) <= 5:
        tags.append('Limited')
    row['tags'] = ','.join(tags)
    return row

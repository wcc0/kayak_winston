#!/usr/bin/env python3
"""
Generate sample Airbnb-style hotel listings and flight data for testing
Simulates Inside Airbnb + Flight Price datasets with realistic values
"""
import csv
import random
from datetime import datetime, timedelta
from pathlib import Path

# Sample data pools
CITIES = [
    {'name': 'New York', 'code': 'NYC', 'state': 'NY'},
    {'name': 'Los Angeles', 'code': 'LAX', 'state': 'CA'},
    {'name': 'Chicago', 'code': 'ORD', 'state': 'IL'},
    {'name': 'Miami', 'code': 'MIA', 'state': 'FL'},
    {'name': 'San Francisco', 'code': 'SFO', 'state': 'CA'},
    {'name': 'Seattle', 'code': 'SEA', 'state': 'WA'},
    {'name': 'Boston', 'code': 'BOS', 'state': 'MA'},
    {'name': 'Las Vegas', 'code': 'LAS', 'state': 'NV'},
]

AIRLINES = ['Delta', 'United', 'American', 'Southwest', 'JetBlue', 'Alaska', 'Spirit', 'Frontier']

NEIGHBORHOODS = ['Downtown', 'Midtown', 'Waterfront', 'Historic District', 'Arts Quarter', 
                 'Financial District', 'Old Town', 'Beach Area', 'Uptown', 'Riverside']

AMENITIES = ['WiFi', 'Breakfast', 'Parking', 'Pool', 'Gym', 'Pet-friendly', 'Near transit', 
             'Kitchen', 'Air conditioning', 'Workspace', 'Washer/Dryer', 'Hot tub']

HOTEL_NAMES = ['Grand Hotel', 'Plaza Inn', 'Royal Suites', 'Comfort Lodge', 'Seaside Resort',
               'City Center Hotel', 'Garden Inn', 'Skyline Towers', 'Harbor View', 'Summit Hotel']

def generate_airbnb_listings(num_listings=100, days=30):
    """Generate Airbnb-style hotel listings with price time series"""
    
    output_dir = Path(__file__).parent / 'sample_data'
    output_dir.mkdir(exist_ok=True)
    
    listings_file = output_dir / 'airbnb_listings.csv'
    
    print(f"🏨 Generating {num_listings} hotel listings for {days} days...")
    
    listings = []
    
    for i in range(num_listings):
        city = random.choice(CITIES)
        base_price = random.randint(80, 400)
        
        listing = {
            'listing_id': f'HTL{10000 + i}',
            'hotel_name': f"{random.choice(HOTEL_NAMES)} {city['name']}",
            'city': city['name'],
            'state': city['state'],
            'neighbourhood': random.choice(NEIGHBORHOODS),
            'base_price': base_price,
            'star_rating': random.choice([3, 4, 5]),
            'total_rooms': random.randint(50, 200),
            'room_type': random.choice(['Standard', 'Deluxe', 'Suite']),
            'amenities': '|'.join(random.sample(AMENITIES, random.randint(3, 6))),
        }
        listings.append(listing)
    
    # Write listings with daily prices
    with open(listings_file, 'w', newline='', encoding='utf-8') as f:
        fieldnames = ['listing_id', 'date', 'price', 'availability', 'hotel_name', 'city', 
                     'state', 'neighbourhood', 'star_rating', 'total_rooms', 'available_rooms',
                     'room_type', 'amenities']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        
        start_date = datetime.now().date()
        
        for listing in listings:
            base_price = listing['base_price']
            total_rooms = listing['total_rooms']
            
            for day in range(days):
                current_date = start_date + timedelta(days=day)
                
                # Price variation: base ± 20%, with occasional deals
                price_variation = random.uniform(0.8, 1.2)
                
                # 15% chance of a deal (price drop 15-30%)
                if random.random() < 0.15:
                    price_variation = random.uniform(0.70, 0.85)
                
                daily_price = round(base_price * price_variation, 2)
                
                # Availability: usually 60-95%, sometimes low (deal signal)
                if random.random() < 0.1:  # 10% chance of low availability
                    available_rooms = random.randint(1, 5)
                else:
                    available_rooms = random.randint(int(total_rooms * 0.6), int(total_rooms * 0.95))
                
                row = {
                    'listing_id': listing['listing_id'],
                    'date': current_date.isoformat(),
                    'price': daily_price,
                    'availability': 1 if available_rooms > 0 else 0,
                    'hotel_name': listing['hotel_name'],
                    'city': listing['city'],
                    'state': listing['state'],
                    'neighbourhood': listing['neighbourhood'],
                    'star_rating': listing['star_rating'],
                    'total_rooms': total_rooms,
                    'available_rooms': available_rooms,
                    'room_type': listing['room_type'],
                    'amenities': listing['amenities'],
                }
                writer.writerow(row)
    
    print(f"✅ Created {listings_file}")
    print(f"   Total rows: {num_listings * days}")
    return listings_file


def generate_flight_listings(num_routes=50, days=30):
    """Generate flight price data with time series"""
    
    output_dir = Path(__file__).parent / 'sample_data'
    output_dir.mkdir(exist_ok=True)
    
    flights_file = output_dir / 'flight_prices.csv'
    
    print(f"✈️  Generating {num_routes} flight routes for {days} days...")
    
    routes = []
    
    for i in range(num_routes):
        origin = random.choice(CITIES)
        dest = random.choice([c for c in CITIES if c != origin])
        airline = random.choice(AIRLINES)
        
        # Base price depends on distance (simulated)
        base_price = random.randint(150, 800)
        
        route = {
            'route_id': f'FLT{1000 + i}',
            'airline': airline,
            'origin': origin['code'],
            'origin_city': origin['name'],
            'dest': dest['code'],
            'dest_city': dest['name'],
            'base_price': base_price,
            'flight_class': random.choice(['Economy', 'Economy', 'Economy', 'Business', 'First']),
            'stops': random.choice([0, 0, 0, 1, 1, 2]),  # Non-stop more common
            'duration': random.randint(90, 480),  # minutes
        }
        routes.append(route)
    
    # Write flights with daily prices
    with open(flights_file, 'w', newline='', encoding='utf-8') as f:
        fieldnames = ['flight_id', 'date', 'airline', 'origin', 'origin_city', 'dest', 'dest_city',
                     'departure_time', 'arrival_time', 'duration', 'stops', 'flight_class',
                     'price', 'total_seats', 'available_seats']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        
        start_date = datetime.now().date()
        
        for route in routes:
            base_price = route['base_price']
            
            for day in range(days):
                current_date = start_date + timedelta(days=day)
                
                # Multiple flights per route per day
                for flight_num in range(random.randint(2, 5)):
                    # Price variation
                    price_variation = random.uniform(0.85, 1.25)
                    
                    # 20% chance of a deal (price drop 15-25%)
                    if random.random() < 0.20:
                        price_variation = random.uniform(0.75, 0.85)
                    
                    daily_price = round(base_price * price_variation, 2)
                    
                    # Seats
                    total_seats = random.choice([150, 180, 220, 250])
                    if random.random() < 0.12:  # 12% chance of low availability
                        available_seats = random.randint(1, 10)
                    else:
                        available_seats = random.randint(30, int(total_seats * 0.8))
                    
                    # Times
                    hour = random.randint(6, 22)
                    departure_time = f"{hour:02d}:{random.randint(0, 59):02d}"
                    duration_mins = route['duration']
                    arrival_hour = (hour + duration_mins // 60) % 24
                    arrival_time = f"{arrival_hour:02d}:{random.randint(0, 59):02d}"
                    
                    flight_id = f"{route['route_id']}-{current_date.strftime('%Y%m%d')}-{flight_num}"
                    
                    row = {
                        'flight_id': flight_id,
                        'date': current_date.isoformat(),
                        'airline': route['airline'],
                        'origin': route['origin'],
                        'origin_city': route['origin_city'],
                        'dest': route['dest'],
                        'dest_city': route['dest_city'],
                        'departure_time': departure_time,
                        'arrival_time': arrival_time,
                        'duration': duration_mins,
                        'stops': route['stops'],
                        'flight_class': route['flight_class'],
                        'price': daily_price,
                        'total_seats': total_seats,
                        'available_seats': available_seats,
                    }
                    writer.writerow(row)
    
    print(f"✅ Created {flights_file}")
    print(f"   Total flights: ~{num_routes * days * 3}")
    return flights_file


def main():
    """Generate sample datasets"""
    print("="*60)
    print("📊 GENERATING SAMPLE DATASETS FOR AGENT TESTING")
    print("="*60)
    print()
    
    # Generate 100 hotels, 30 days of prices = 3,000 rows
    hotels_file = generate_airbnb_listings(num_listings=100, days=30)
    
    print()
    
    # Generate 50 routes, 30 days, ~3 flights/day = ~4,500 rows
    flights_file = generate_flight_listings(num_routes=50, days=30)
    
    print()
    print("="*60)
    print("✅ DATASET GENERATION COMPLETE!")
    print("="*60)
    print()
    print(f"📁 Files created in: {Path(__file__).parent / 'sample_data'}")
    print(f"   • {hotels_file.name}")
    print(f"   • {flights_file.name}")
    print()
    print("Next steps:")
    print("  1. Start Kafka: docker-compose up -d")
    print("  2. Run feed ingestion: python ingest_to_kafka.py")
    print("  3. Start Deals Agent: uvicorn deals_agent.app:app --port 8000")
    print("  4. Start Concierge Agent: uvicorn concierge_agent.app:app --port 8001")
    print()


if __name__ == '__main__':
    main()

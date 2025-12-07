"""Data ingestion helpers for Deals Agent

Loads Inside Airbnb, Hotel Booking, Flight price datasets (if present), normalizes
rows into a simple dict format consumed by the light_processor pipeline.

This module is resilient: if Kaggle CSVs are not present it falls back to
generating a small set of mock deals so the scheduler can run without errors.
"""
import os
import json
import asyncio
from sqlmodel import SQLModel, create_engine, Session
from .models import FlightModel, HotelModel
from datetime import datetime
from typing import List, Dict

try:
    import pandas as pd
    _HAS_PANDAS = True
except Exception:
    _HAS_PANDAS = False

# Look for data in workspace root, then in current directory (for compatibility)
# File is at: services/deals_agent/src/deals_agent/data_ingest.py
# Need to go up 4 levels to reach workspace root: .. (deals_agent) .. (src) .. (deals_agent) .. (services) .. (jottx)
_workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
_local_data = os.path.join(os.getcwd(), "data", "raw")
_workspace_data = os.path.join(_workspace_root, "data", "raw")

if os.path.isdir(_workspace_data):
    DATA_ROOT = _workspace_data
else:
    DATA_ROOT = _local_data


def _safe_price(v):
    try:
        if v is None:
            return None
        s = str(v)
        s = s.replace('$', '').replace(',', '').strip()
        return float(s)
    except Exception:
        return None


async def ingest_inside_airbnb_nyc() -> List[Dict]:
    """Attempt to read Inside Airbnb NYC files and produce normalized hotel records.

    Expects `data/raw/konradb_inside-airbnb-usa/usa/*/listings.csv` (Kaggle download).
    Returns a list of normalized dicts with keys expected by the pipeline.
    """
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"DEBUG: ingest_inside_airbnb_nyc starting, DATA_ROOT={DATA_ROOT}")
    logger.info(f"DEBUG: DATA_ROOT exists: {os.path.isdir(DATA_ROOT)}")
    
    if not _HAS_PANDAS:
        logger.info("DEBUG: pandas not available")
        return []
    
    try:
        # Direct path to dominoweir NYC data
        listings_path = os.path.join(DATA_ROOT, "dominoweir_inside-airbnb-nyc", "listings.csv")
        logger.info(f"DEBUG: Trying {listings_path}")
        
        if not os.path.exists(listings_path):
            logger.info(f"DEBUG: Not found, trying konradb paths")
            # Try konradb paths
            possible_bases = [
                os.path.join(DATA_ROOT, "konradb_inside-airbnb-usa", "usa", "New York City"),
                os.path.join(DATA_ROOT, "konradb_inside-airbnb-usa", "usa", "San Francisco"),
                os.path.join(DATA_ROOT, "konradb_inside-airbnb-usa", "usa", "Los Angeles"),
            ]
            
            listings_path = None
            for base in possible_bases:
                candidate = os.path.join(base, "listings.csv")
                if os.path.exists(candidate):
                    listings_path = candidate
                    logger.info(f"DEBUG: Found at {candidate}")
                    break
        
        if not listings_path or not os.path.exists(listings_path):
            logger.info(f"DEBUG: Could not find listings.csv, returning empty")
            return []
        
        logger.info(f"DEBUG: Loading listings from {listings_path}")
        base = os.path.dirname(listings_path)
        calendar_path = os.path.join(base, "calendar.csv")
        listings = pd.read_csv(listings_path, low_memory=False)
        logger.info(f"DEBUG: Loaded {len(listings)} listings")
        
        # Skip calendar if it doesn't exist; compute 30-day avg from listings if available
        if not os.path.exists(calendar_path):
            logger.info(f"DEBUG: No calendar found, using listings data directly")
            # Fallback: use price column directly without rolling avg
            listings.rename(columns={'id': 'listing_id'}, inplace=True) if 'id' in listings.columns else None
            out = []
            for _, r in listings.head(1000).iterrows():
                amenities = r.get('amenities') if 'amenities' in r else r.get('amenity')
                if isinstance(amenities, str):
                    try:
                        parsed = json.loads(amenities)
                        amenities_list = parsed if isinstance(parsed, list) else [amenities]
                    except Exception:
                        amenities_list = [a.strip() for a in amenities.split(',') if a.strip()]
                else:
                    amenities_list = []

                price_val = r.get('price') if 'price' in r else None
                if isinstance(price_val, str):
                    price_val = _safe_price(price_val)
                else:
                    try:
                        price_val = float(price_val) if price_val else None
                    except Exception:
                        price_val = None

                rec = {
                    'type': 'hotel',
                    'id': str(r.get('listing_id', r.get('id'))),
                    'listing_id': str(r.get('listing_id', r.get('id'))),
                    'name': r.get('name') if 'name' in r else None,
                    'city': 'NYC',
                    'neighbourhood': r.get('neighbourhood') or r.get('neighborhood') or None,
                    'date': datetime.utcnow().isoformat(),
                    'price': price_val or 100.0,
                    'avg_price_30d': price_val or 100.0,  # fallback to current price
                    'availability': 30,
                    'amenities': amenities_list,
                    'is_pet_friendly': any('pet' in a.lower() for a in (amenities_list or [])),
                    'has_breakfast': any('breakfast' in a.lower() for a in (amenities_list or [])),
                    'near_transit': False,
                    'source': 'inside_airbnb_nyc'
                }
                out.append(rec)
            return out
        
        # If calendar.csv exists, use the original logic
        calendar = pd.read_csv(calendar_path, low_memory=False, parse_dates=['date'])

        # Normalize listing id column names
        if 'id' in listings.columns:
            listings.rename(columns={'id': 'listing_id'}, inplace=True)

        # Clean price in calendar and compute 30-day avg per listing
        calendar['price'] = calendar['price'].astype(str).str.replace(r'[\$,]', '', regex=True).replace('nan', None)
        calendar['price'] = pd.to_numeric(calendar['price'], errors='coerce')
        calendar = calendar.dropna(subset=['price'])

        calendar = calendar.sort_values(['listing_id', 'date'])
        calendar['avg_30d'] = calendar.groupby('listing_id')['price'].rolling(window=30, min_periods=1).mean().reset_index(0, drop=True)

        # pick latest row per listing as current snapshot
        latest = calendar.groupby('listing_id').last().reset_index()
        merged = latest.merge(listings, left_on='listing_id', right_on='listing_id', how='left')

        out = []
        for _, r in merged.iterrows():
            amenities = r.get('amenities') if 'amenities' in r else r.get('amenity')
            if isinstance(amenities, str):
                try:
                    # Inside Airbnb amenities sometimes like "[\"Wifi\", \"Kitchen\"]"
                    parsed = json.loads(amenities)
                    amenities_list = parsed if isinstance(parsed, list) else [amenities]
                except Exception:
                    # heuristic split
                    amenities_list = [a.strip() for a in amenities.split(',') if a.strip()]
            else:
                amenities_list = []

            rec = {
                'type': 'hotel',
                'id': str(r.get('listing_id')),
                'listing_id': str(r.get('listing_id')),
                'name': r.get('name') if 'name' in r else None,
                'city': 'NYC',
                'neighbourhood': r.get('neighbourhood') or r.get('neighborhood') or None,
                'date': r.get('date').isoformat() if r.get('date') is not None else datetime.utcnow().isoformat(),
                'price': float(r.get('price')) if not pd.isna(r.get('price')) else None,
                'avg_price_30d': float(r.get('avg_30d')) if not pd.isna(r.get('avg_30d')) else None,
                'availability': int(r.get('available')) if 'available' in r and r.get('available') in (0,1) else None,
                'amenities': amenities_list,
                'is_pet_friendly': any('pet' in a.lower() for a in (amenities_list or [])),
                'has_breakfast': any('breakfast' in a.lower() for a in (amenities_list or [])),
                'near_transit': False,
                'source': 'inside_airbnb_nyc',
                'raw': r.to_dict()
            }
            out.append(rec)

        return out
    except Exception as e:
        print('inside_airbnb ingest error', e)
        return []


async def ingest_flights_from_csv() -> List[Dict]:
    """Ingest flight prices from dilwong_flightprices/itineraries.csv (30GB Expedia dataset).

    Schema: legId, searchDate, flightDate, startingAirport, destinationAirport, baseFare,
            totalFare, seatsRemaining, isNonStop, segmentsAirlineName, etc.
    
    Loads first N rows (200) to balance freshness vs performance with large dataset.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    out = []
    if not _HAS_PANDAS:
        logger.info("DEBUG: pandas not available for flight ingestion")
        return out

    # Primary source: dilwong Expedia flights (30GB, millions of rows)
    flight_csv = os.path.join(DATA_ROOT, "dilwong_flightprices", "itineraries.csv")
    
    if os.path.exists(flight_csv):
        try:
            logger.info(f"DEBUG: Loading real flights from {flight_csv}")
            # Load first 200 rows from massive dataset
            df = pd.read_csv(flight_csv, low_memory=False, nrows=200)
            logger.info(f"DEBUG: Loaded {len(df)} flight rows from CSV")
            
            for idx, r in df.iterrows():
                try:
                    origin = r.get('startingAirport')
                    dest = r.get('destinationAirport')
                    airline = r.get('segmentsAirlineName')
                    
                    # Extract price - prefer totalFare, fallback to baseFare
                    price_val = r.get('totalFare') if pd.notna(r.get('totalFare')) else r.get('baseFare')
                    price = _safe_price(price_val)
                    
                    seats = r.get('seatsRemaining')
                    try:
                        seats = int(seats) if pd.notna(seats) else 100
                    except Exception:
                        seats = 100
                    
                    is_nonstop = r.get('isNonStop')
                    stops = 0 if (is_nonstop == True or is_nonstop == 'True' or str(is_nonstop).lower() == 'true') else 1
                    
                    if origin and dest and price and price > 0:
                        rec = {
                            'type': 'flight',
                            'id': f"f-{origin}-{dest}-{idx}",
                            'listing_id': f"f-{origin}-{dest}-{idx}",
                            'origin': str(origin).strip(),
                            'destination': str(dest).strip(),
                            'airline': str(airline) if pd.notna(airline) else 'Unknown',
                            'price': float(price),
                            'stops': stops,
                            'duration_minutes': 300,  # Average flight duration
                            'seats_available': seats,
                            'availability': seats,
                            'avg_price_30d': float(price) * 1.05,  # Assume 5% markup as 30-day average
                            'source': 'dilwong_expedia_flights',
                            'raw': r.to_dict()
                        }
                        out.append(rec)
                except Exception as e:
                    logger.debug(f"Error processing flight row {idx}: {e}")
                    continue
            
            logger.info(f"DEBUG: Loaded {len(out)} valid flight records from dilwong dataset")
            if out:
                return out
        except Exception as e:
            logger.error(f"Error loading dilwong flights: {e}")
    
    # Fallback: Try open-flights dataset
    routes_csv = os.path.join(DATA_ROOT, "open-flights_flight-route-database", "routes.csv")
    if os.path.exists(routes_csv):
        try:
            logger.info(f"DEBUG: Loading flights from open-flights routes.csv")
            # Open-flights format: airline, airline_id, source, source_id, dest, dest_id, codeshare, stops, equipment
            df = pd.read_csv(routes_csv, low_memory=False, nrows=200, header=None, 
                           names=['airline', 'airline_id', 'source', 'source_id', 'dest', 'dest_id', 'codeshare', 'stops', 'equipment'])
            
            for idx, r in df.iterrows():
                try:
                    origin = r.get('source')
                    dest = r.get('dest')
                    airline = r.get('airline')
                    stops = int(r.get('stops')) if pd.notna(r.get('stops')) else 0
                    
                    if origin and dest and len(str(origin)) == 3 and len(str(dest)) == 3:
                        # Generate synthetic price based on airport codes
                        base_price = 150.0
                        price = base_price + (hash(str(origin) + str(dest)) % 200)
                        
                        rec = {
                            'type': 'flight',
                            'id': f"f-{origin}-{dest}-{idx}",
                            'listing_id': f"f-{origin}-{dest}-{idx}",
                            'origin': str(origin).strip(),
                            'destination': str(dest).strip(),
                            'airline': str(airline) if pd.notna(airline) else 'Unknown',
                            'price': float(price),
                            'stops': stops,
                            'duration_minutes': 300,
                            'seats_available': 100,
                            'availability': 100,
                            'avg_price_30d': float(price) * 1.05,
                            'source': 'openflights_routes'
                        }
                        out.append(rec)
                except Exception as e:
                    logger.debug(f"Error processing open-flights row {idx}: {e}")
                    continue
            
            logger.info(f"DEBUG: Loaded {len(out)} flight routes from open-flights dataset")
            if out:
                return out
        except Exception as e:
            logger.error(f"Error loading open-flights: {e}")
    
    logger.info("DEBUG: No flight CSV found, returning empty (will use only hotels/bookings)")
    return out


async def ingest_hotel_bookings() -> List[Dict]:
    """Ingest hotel booking demand dataset."""
    candidates = []
    base = os.path.join(DATA_ROOT)
    
    if not _HAS_PANDAS:
        return []
    
    for root, _, files in os.walk(base):
        for f in files:
            if f.lower().endswith('.csv') and ('booking' in f.lower() or 'hotel_bookings' in f.lower()):
                candidates.append(os.path.join(root, f))
    
    if not candidates:
        return []
    
    try:
        df = pd.read_csv(candidates[0], low_memory=False, nrows=500)
        cols = {c.lower(): c for c in df.columns}
        
        def g(candidates_list):
            for k in candidates_list:
                if k in cols:
                    return cols[k]
            return None
        
        # Hotel Booking Demand schema
        hotel_col = g(['hotel', 'hotel_name'])
        price_col = g(['adr', 'price', 'avgprice'])
        stays_col = g(['stays_in_weekend_nights', 'stays_in_week_nights'])
        country_col = g(['country', 'country_code'])
        
        out = []
        for idx, r in df.iterrows():
            hotel_name = r.get(hotel_col) if hotel_col else f"Hotel-{idx}"
            price = _safe_price(r.get(price_col)) if price_col else None
            country = r.get(country_col) if country_col else 'Unknown'
            
            rec = {
                'type': 'hotel',
                'id': f"hb-{idx}",
                'listing_id': f"hb-{idx}",
                'name': hotel_name,
                'city': str(country)[:20],
                'neighbourhood': str(country)[:20],
                'price': float(price) if price and price > 0 else 100.0,
                'avg_price_30d': float(price) if price and price > 0 else 100.0,
                'availability': 20,
                'amenities': ['wifi'],
                'is_pet_friendly': False,
                'has_breakfast': False,
                'near_transit': False,
                'source': 'hotel_bookings'
            }
            out.append(rec)
        
        return out
    except Exception as e:
        print('hotel bookings ingest error', e)
        return []
def _mock_deals() -> List[Dict]:
    # Simple fallback deals so pipeline can run if no Kaggle files present
    now = datetime.utcnow().isoformat()
    deals = [
        {
            'type': 'hotel',
            'id': 'H-MOCK-1',
            'listing_id': 'H-MOCK-1',
            'name': 'Mock Hotel A',
            'city': 'NYC',
            'neighbourhood': 'Brooklyn',
            'date': now,
            'price': 100.0,
            'avg_price_30d': 140.0,
            'availability': 3,
            'amenities': ['wifi','breakfast'],
            'is_pet_friendly': True,
            'has_breakfast': True,
            'near_transit': True,
            'source': 'mock'
        },
        {
            'type': 'flight',
            'id': 'F-MOCK-1',
            'origin': 'SFO',
            'destination': 'NYC',
            'airline': 'Delta',
            'price': 200.0,
            'stops': 0,
            'duration_minutes': 300,
            'seats_available': 20,
            'avg_price_30d': 240.0,
            'source': 'mock'
        }
    ]
    return deals


async def ingest_mock_deals() -> List[Dict]:
    """Top-level ingestion orchestrator used by the scheduler.

    Tries to load Airbnb hotels, hotel booking demand, and flight prices; if none available returns mock deals.
    """
    results = []
    try:
        if _HAS_PANDAS:
            print(f"DEBUG: DATA_ROOT = {DATA_ROOT}")
            hotels = await ingest_inside_airbnb_nyc()
            print(f"DEBUG: Loaded {len(hotels)} hotels from ingest_inside_airbnb_nyc")
            hotel_bookings = await ingest_hotel_bookings()
            print(f"DEBUG: Loaded {len(hotel_bookings)} hotel bookings from ingest_hotel_bookings")
            flights = await ingest_flights_from_csv()
            print(f"DEBUG: Loaded {len(flights)} flights from ingest_flights_from_csv")
            results.extend(hotels)
            results.extend(hotel_bookings)
            results.extend(flights)

        if not results:
            # fallback
            results = _mock_deals()

        # persist normalized rows into local deals DB for quick access
        try:
            persist_normalized_rows(results)
        except Exception as e:
            print('persist failed', e)
        return results
    except Exception as e:
        print('ingest_mock_deals error', e)
        fallback = _mock_deals()
        try:
            persist_normalized_rows(fallback)
        except Exception:
            pass
        return fallback


def persist_normalized_rows(records: List[Dict], db_path: str = None):
    """Persist hotel and flight normalized rows into a local SQLite DB.

    Default DB: data/normalized/deals.db
    """
    db_dir = os.path.join(os.getcwd(), 'data', 'normalized')
    os.makedirs(db_dir, exist_ok=True)
    if db_path is None:
        db_path = os.path.join(db_dir, 'deals.db')
    db_url = f"sqlite:///{db_path}"
    engine = create_engine(db_url, echo=False)
    SQLModel.metadata.create_all(engine)

    with Session(engine) as sess:
        for r in records:
            try:
                if r.get('type') == 'hotel':
                    hotel = HotelModel(
                        external_id=r.get('id'),
                        listing_id=r.get('listing_id'),
                        name=r.get('name'),
                        city=r.get('city'),
                        neighbourhood=r.get('neighbourhood'),
                        price_per_night=float(r.get('price') or 0.0),
                        availability=int(r.get('availability') or 0),
                        amenities=json.dumps(r.get('amenities') or []),
                        is_pet_friendly=bool(r.get('is_pet_friendly') or False),
                        has_breakfast=bool(r.get('has_breakfast') or False),
                        near_transit=bool(r.get('near_transit') or False),
                        avg_price_30d=float(r.get('avg_price_30d') or 0.0),
                        source=r.get('source')
                    )
                    sess.add(hotel)
                elif r.get('type') == 'flight':
                    flight = FlightModel(
                        external_id=r.get('id'),
                        origin=r.get('origin') or 'SFO',
                        destination=r.get('destination') or 'NYC',
                        airline=r.get('airline'),
                        price=float(r.get('price') or 0.0),
                        seats_available=int(r.get('seats_available') or 100),
                        stops=int(r.get('stops') or 0),
                        duration_minutes=int(r.get('duration_minutes') or 0),
                        avg_price_30d=float(r.get('avg_price_30d') or 0.0),
                        source=r.get('source')
                    )
                    sess.add(flight)
            except Exception as e:
                print('persist row error', e)
        sess.commit()

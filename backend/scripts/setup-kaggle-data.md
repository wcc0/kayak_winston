# Kaggle Datasets Setup Guide

This guide helps you download and prepare the Kaggle datasets for the Kayak platform.

## Prerequisites

1. Install Kaggle CLI:
   ```bash
   pip install kaggle
   ```

2. Setup Kaggle API credentials:
   - Go to https://www.kaggle.com/settings/account
   - Click "Create New API Token" - this downloads `kaggle.json`
   - Place `kaggle.json` in `~/.kaggle/kaggle.json` (Linux/Mac) or `%USERPROFILE%\.kaggle\kaggle.json` (Windows)
   - Set permissions: `chmod 600 ~/.kaggle/kaggle.json`

## Datasets to Download

### 1. Inside Airbnb NYC (Hotels/Listings)
```bash
cd backend/data/raw
kaggle datasets download -d dominoweir/inside-airbnb-nyc
unzip inside-airbnb-nyc.zip
# Creates: data/raw/inside-airbnb-nyc/data/[city]/listings.csv
```

**Fields used**: id, name, neighbourhood, neighbourhood_group, price, availability_365, room_type, amenities

### 2. Hotel Booking Demand
```bash
cd backend/data/raw
kaggle datasets download -d mojtaba142/hotel-booking
unzip hotel-booking.zip
# Creates: data/raw/hotel-booking/hotel_bookings.csv
```

**Fields used**: lead_time, arrival_date_month, stays_in_weekend_nights, stays_in_week_nights, adults, children, babies, meal, country, market_segment, customer_type, previous_cancellations, booking_changes, agent, company, days_in_waiting_list, customer_type, required_car_parking_spaces, total_of_special_requests, reservation_status

### 3. Flight Prices (Expedia 2022 US Routes)
```bash
cd backend/data/raw
kaggle datasets download -d dilwong/flightprices
unzip flightprices.zip
# Creates: data/raw/flightprices/flightprices.csv
```

**Fields used**: startingAirport, destinationAirport, startDate, returnDate, farePrimaryLeg, fareSeatUpgrade, travelDuration

### 4. Global Airports Reference
```bash
cd backend/data/raw
kaggle datasets download -d samvelkoch/global-airports-iata-icao-timezone-geo
unzip global-airports-iata-icao-timezone-geo.zip
# Creates: data/raw/global-airports/airports.csv
```

**Fields used**: IATA, ICAO, Airport Name, City, Country, Latitude, Longitude, Timezone

### 5. US Flight Delays (Optional - for context)
```bash
cd backend/data/raw
kaggle datasets download -d usdot/flight-delays
unzip flight-delays.zip
# Creates: data/raw/flight-delays/flights.csv, airlines.csv, airports.csv
```

## File Structure After Download

```
backend/
  data/
    raw/
      inside-airbnb-nyc/
        data/
          new york city/
            listings.csv
            reviews.csv
            calendar.csv
      hotel-booking/
        hotel_bookings.csv
      flightprices/
        flightprices.csv
      global-airports/
        airports.csv
      flight-delays/
        flights.csv
        airlines.csv
        airports.csv
```

## Next Steps

1. Run the data import script:
   ```bash
   cd backend
   npm install
   node scripts/import-kaggle-data.js
   ```

2. This will:
   - Parse all CSV files
   - Normalize data into MongoDB documents
   - Insert cleaned records into MySQL tables
   - Build indexes for fast lookups
   - Generate analytics and price statistics

3. Verify data loaded:
   ```bash
   mysql -h localhost -u root -p kayak_admin -e "SELECT COUNT(*) FROM hotels; SELECT COUNT(*) FROM flights; SELECT COUNT(*) FROM airports;"
   ```

## Troubleshooting

### "ModuleNotFoundError: kaggle"
```bash
pip install kaggle
```

### "Kaggle credentials not found"
- Verify `kaggle.json` exists in `~/.kaggle/` directory
- Check file permissions: `chmod 600 ~/.kaggle/kaggle.json`

### "No such file or directory" after download
- Some datasets need manual extraction from zip
- Check downloaded filename vs expected unzipped folder name
- May need to adjust path in import script

### CSV encoding issues
- Some files may be UTF-8 with BOM
- Import script handles this with `{ encoding: 'utf8' }` option


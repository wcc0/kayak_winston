import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  CircularProgress,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Avatar,
  Alert,
  TextField,
} from '@mui/material';
import {
  Flight,
  Hotel,
  DirectionsCar,
  Star,
  FilterList,
  ExpandMore,
  CompareArrows,
  LocalOffer,
  AirlineSeatReclineNormal,
  Warning,
} from '@mui/icons-material';
import { listingsAPI, travelerAPI } from '../services/api';

// Initialize flights data in localStorage if not exists
const initializeFlightsData = () => {
  const stored = localStorage.getItem('flightsInventory');
  if (!stored) {
    const flightsData = [
      // San Jose routes
      { id: 'SJC-JFK-1', flightNumber: 'UA-789', airline: 'United Airlines', from: 'San Jose', to: 'New York', departTime: '08:00', arriveTime: '16:30', duration: '5h 30m', stops: 0, seatsAvailable: 45, providers: [{ name: 'Expedia', price: 299 }, { name: 'Kayak Direct', price: 289 }, { name: 'Priceline', price: 309 }] },
      { id: 'SJC-JFK-2', flightNumber: 'DL-456', airline: 'Delta', from: 'San Jose', to: 'New York', departTime: '10:15', arriveTime: '19:00', duration: '5h 45m', stops: 1, seatsAvailable: 22, providers: [{ name: 'Delta.com', price: 259 }, { name: 'Expedia', price: 279 }] },
      { id: 'SJC-LAX-1', flightNumber: 'SW-101', airline: 'Southwest', from: 'San Jose', to: 'Los Angeles', departTime: '06:00', arriveTime: '07:30', duration: '1h 30m', stops: 0, seatsAvailable: 67, providers: [{ name: 'Southwest.com', price: 89 }, { name: 'Kayak', price: 99 }] },
      { id: 'SJC-LAX-2', flightNumber: 'AA-202', airline: 'American Airlines', from: 'San Jose', to: 'Los Angeles', departTime: '14:00', arriveTime: '15:30', duration: '1h 30m', stops: 0, seatsAvailable: 34, providers: [{ name: 'AA.com', price: 109 }, { name: 'Expedia', price: 119 }] },
      // Chicago routes
      { id: 'ORD-LAX-1', flightNumber: 'UA-301', airline: 'United Airlines', from: 'Chicago', to: 'Los Angeles', departTime: '07:00', arriveTime: '09:30', duration: '4h 30m', stops: 0, seatsAvailable: 56, providers: [{ name: 'United.com', price: 189 }, { name: 'Expedia', price: 199 }, { name: 'Orbitz', price: 209 }] },
      { id: 'ORD-LAX-2', flightNumber: 'AA-402', airline: 'American Airlines', from: 'Chicago', to: 'Los Angeles', departTime: '11:00', arriveTime: '13:45', duration: '4h 45m', stops: 1, seatsAvailable: 12, providers: [{ name: 'AA.com', price: 169 }, { name: 'Priceline', price: 179 }] },
      { id: 'ORD-LAX-3', flightNumber: 'DL-503', airline: 'Delta', from: 'Chicago', to: 'Los Angeles', departTime: '16:00', arriveTime: '18:30', duration: '4h 30m', stops: 0, seatsAvailable: 38, providers: [{ name: 'Delta.com', price: 219 }, { name: 'Kayak', price: 229 }] },
      { id: 'ORD-JFK-1', flightNumber: 'UA-601', airline: 'United Airlines', from: 'Chicago', to: 'New York', departTime: '08:00', arriveTime: '11:30', duration: '2h 30m', stops: 0, seatsAvailable: 78, providers: [{ name: 'United.com', price: 149 }, { name: 'Expedia', price: 159 }] },
      { id: 'ORD-MIA-1', flightNumber: 'AA-701', airline: 'American Airlines', from: 'Chicago', to: 'Miami', departTime: '09:00', arriveTime: '14:00', duration: '3h 00m', stops: 0, seatsAvailable: 45, providers: [{ name: 'AA.com', price: 199 }, { name: 'Orbitz', price: 209 }] },
      // LA routes
      { id: 'LAX-JFK-1', flightNumber: 'JB-801', airline: 'JetBlue', from: 'Los Angeles', to: 'New York', departTime: '06:00', arriveTime: '14:30', duration: '5h 30m', stops: 0, seatsAvailable: 52, providers: [{ name: 'JetBlue.com', price: 259 }, { name: 'Expedia', price: 269 }] },
      { id: 'LAX-MIA-1', flightNumber: 'AA-901', airline: 'American Airlines', from: 'Los Angeles', to: 'Miami', departTime: '08:00', arriveTime: '16:00', duration: '5h 00m', stops: 0, seatsAvailable: 33, providers: [{ name: 'AA.com', price: 229 }, { name: 'Priceline', price: 239 }] },
      { id: 'LAX-SFO-1', flightNumber: 'SW-001', airline: 'Southwest', from: 'Los Angeles', to: 'San Francisco', departTime: '07:00', arriveTime: '08:30', duration: '1h 30m', stops: 0, seatsAvailable: 89, providers: [{ name: 'Southwest.com', price: 69 }, { name: 'Kayak', price: 79 }] },
      // New York routes
      { id: 'JFK-LAX-1', flightNumber: 'DL-111', airline: 'Delta', from: 'New York', to: 'Los Angeles', departTime: '07:00', arriveTime: '10:30', duration: '6h 30m', stops: 0, seatsAvailable: 61, providers: [{ name: 'Delta.com', price: 279 }, { name: 'Expedia', price: 289 }] },
      { id: 'JFK-MIA-1', flightNumber: 'JB-211', airline: 'JetBlue', from: 'New York', to: 'Miami', departTime: '09:00', arriveTime: '12:30', duration: '3h 30m', stops: 0, seatsAvailable: 47, providers: [{ name: 'JetBlue.com', price: 159 }, { name: 'Orbitz', price: 169 }] },
      { id: 'JFK-ORD-1', flightNumber: 'UA-311', airline: 'United Airlines', from: 'New York', to: 'Chicago', departTime: '10:00', arriveTime: '11:30', duration: '2h 30m', stops: 0, seatsAvailable: 72, providers: [{ name: 'United.com', price: 139 }, { name: 'Kayak', price: 149 }] },
      // Miami routes
      { id: 'MIA-JFK-1', flightNumber: 'AA-411', airline: 'American Airlines', from: 'Miami', to: 'New York', departTime: '06:00', arriveTime: '09:30', duration: '3h 30m', stops: 0, seatsAvailable: 54, providers: [{ name: 'AA.com', price: 179 }, { name: 'Expedia', price: 189 }] },
      { id: 'MIA-LAX-1', flightNumber: 'DL-511', airline: 'Delta', from: 'Miami', to: 'Los Angeles', departTime: '08:00', arriveTime: '11:00', duration: '6h 00m', stops: 0, seatsAvailable: 39, providers: [{ name: 'Delta.com', price: 249 }, { name: 'Priceline', price: 259 }] },
      // Denver routes  
      { id: 'DEN-LAX-1', flightNumber: 'SW-611', airline: 'Southwest', from: 'Denver', to: 'Los Angeles', departTime: '09:00', arriveTime: '10:30', duration: '2h 30m', stops: 0, seatsAvailable: 63, providers: [{ name: 'Southwest.com', price: 129 }, { name: 'Kayak', price: 139 }] },
      { id: 'DEN-JFK-1', flightNumber: 'UA-711', airline: 'United Airlines', from: 'Denver', to: 'New York', departTime: '07:00', arriveTime: '13:00', duration: '4h 00m', stops: 0, seatsAvailable: 48, providers: [{ name: 'United.com', price: 219 }, { name: 'Expedia', price: 229 }] },
      // Seattle routes
      { id: 'SEA-LAX-1', flightNumber: 'AS-811', airline: 'Alaska Airlines', from: 'Seattle', to: 'Los Angeles', departTime: '08:00', arriveTime: '11:00', duration: '3h 00m', stops: 0, seatsAvailable: 57, providers: [{ name: 'Alaska.com', price: 149 }, { name: 'Orbitz', price: 159 }] },
      { id: 'SEA-JFK-1', flightNumber: 'DL-911', airline: 'Delta', from: 'Seattle', to: 'New York', departTime: '06:00', arriveTime: '14:30', duration: '5h 30m', stops: 0, seatsAvailable: 42, providers: [{ name: 'Delta.com', price: 299 }, { name: 'Expedia', price: 309 }] },
      // Boston routes
      { id: 'BOS-LAX-1', flightNumber: 'JB-011', airline: 'JetBlue', from: 'Boston', to: 'Los Angeles', departTime: '07:00', arriveTime: '11:00', duration: '6h 00m', stops: 0, seatsAvailable: 44, providers: [{ name: 'JetBlue.com', price: 269 }, { name: 'Kayak', price: 279 }] },
      { id: 'BOS-MIA-1', flightNumber: 'AA-121', airline: 'American Airlines', from: 'Boston', to: 'Miami', departTime: '09:00', arriveTime: '13:00', duration: '4h 00m', stops: 0, seatsAvailable: 51, providers: [{ name: 'AA.com', price: 189 }, { name: 'Priceline', price: 199 }] },
    ];
    localStorage.setItem('flightsInventory', JSON.stringify(flightsData));
    return flightsData;
  }
  return JSON.parse(stored);
};

// Initialize hotels data
const initializeHotelsData = () => {
  const stored = localStorage.getItem('hotelsInventory');
  if (!stored) {
    const hotelsData = [
      { id: 'NYH-1', name: 'Grand Hyatt New York', city: 'New York', location: 'New York, NY', rating: 4.8, reviews: 2341, stars: 5, roomsAvailable: 25, amenities: ['WiFi', 'Pool', 'Gym', 'Spa'], providers: [{ name: 'Booking.com', price: 289 }, { name: 'Hotels.com', price: 299 }, { name: 'Expedia', price: 279 }] },
      { id: 'NYH-2', name: 'Marriott Times Square', city: 'New York', location: 'New York, NY', rating: 4.5, reviews: 1892, stars: 4, roomsAvailable: 18, amenities: ['WiFi', 'Restaurant', 'Spa'], providers: [{ name: 'Marriott.com', price: 249 }, { name: 'Booking.com', price: 259 }] },
      { id: 'NYH-3', name: 'Hilton Midtown', city: 'New York', location: 'New York, NY', rating: 4.3, reviews: 1567, stars: 4, roomsAvailable: 32, amenities: ['WiFi', 'Gym', 'Restaurant'], providers: [{ name: 'Hilton.com', price: 229 }, { name: 'Expedia', price: 239 }] },
      { id: 'LAH-1', name: 'Beverly Hills Hotel', city: 'Los Angeles', location: 'Los Angeles, CA', rating: 4.9, reviews: 3421, stars: 5, roomsAvailable: 12, amenities: ['WiFi', 'Pool', 'Spa', 'Restaurant'], providers: [{ name: 'Booking.com', price: 459 }, { name: 'Hotels.com', price: 479 }] },
      { id: 'LAH-2', name: 'Hollywood Roosevelt', city: 'Los Angeles', location: 'Los Angeles, CA', rating: 4.4, reviews: 2156, stars: 4, roomsAvailable: 28, amenities: ['WiFi', 'Pool', 'Bar'], providers: [{ name: 'Expedia', price: 219 }, { name: 'Priceline', price: 229 }] },
      { id: 'LAH-3', name: 'Santa Monica Beach Inn', city: 'Los Angeles', location: 'Los Angeles, CA', rating: 4.2, reviews: 987, stars: 3, roomsAvailable: 45, amenities: ['WiFi', 'Beach Access'], providers: [{ name: 'Booking.com', price: 149 }, { name: 'Kayak', price: 159 }] },
      { id: 'MIH-1', name: 'Fontainebleau Miami', city: 'Miami', location: 'Miami, FL', rating: 4.7, reviews: 4521, stars: 5, roomsAvailable: 35, amenities: ['WiFi', 'Pool', 'Beach', 'Spa'], providers: [{ name: 'Hotels.com', price: 349 }, { name: 'Expedia', price: 359 }] },
      { id: 'MIH-2', name: 'South Beach Hotel', city: 'Miami', location: 'Miami, FL', rating: 4.3, reviews: 1876, stars: 4, roomsAvailable: 22, amenities: ['WiFi', 'Pool', 'Beach'], providers: [{ name: 'Booking.com', price: 199 }, { name: 'Priceline', price: 209 }] },
      { id: 'CHH-1', name: 'Palmer House Hilton', city: 'Chicago', location: 'Chicago, IL', rating: 4.5, reviews: 2890, stars: 4, roomsAvailable: 40, amenities: ['WiFi', 'Gym', 'Restaurant'], providers: [{ name: 'Hilton.com', price: 189 }, { name: 'Expedia', price: 199 }] },
      { id: 'CHH-2', name: 'The Drake Hotel', city: 'Chicago', location: 'Chicago, IL', rating: 4.6, reviews: 1654, stars: 5, roomsAvailable: 15, amenities: ['WiFi', 'Spa', 'Fine Dining'], providers: [{ name: 'Booking.com', price: 279 }, { name: 'Hotels.com', price: 289 }] },
      { id: 'SFH-1', name: 'Fairmont San Francisco', city: 'San Francisco', location: 'San Francisco, CA', rating: 4.7, reviews: 2345, stars: 5, roomsAvailable: 20, amenities: ['WiFi', 'Gym', 'Spa'], providers: [{ name: 'Fairmont.com', price: 329 }, { name: 'Expedia', price: 339 }] },
      { id: 'SFH-2', name: 'Hotel Nikko', city: 'San Francisco', location: 'San Francisco, CA', rating: 4.4, reviews: 1567, stars: 4, roomsAvailable: 33, amenities: ['WiFi', 'Pool', 'Restaurant'], providers: [{ name: 'Booking.com', price: 229 }, { name: 'Priceline', price: 239 }] },
    ];
    localStorage.setItem('hotelsInventory', JSON.stringify(hotelsData));
    return hotelsData;
  }
  return JSON.parse(stored);
};

// Initialize cars data
const initializeCarsData = () => {
  const stored = localStorage.getItem('carsInventory');
  if (!stored) {
    const carsData = [
      { id: 'CAR-1', type: 'Economy', model: 'Toyota Corolla or similar', passengerCapacity: 5, bags: 2, transmission: 'Automatic', carsAvailable: 25, cities: ['New York', 'Los Angeles', 'Chicago', 'Miami', 'San Francisco'], providers: [{ name: 'Hertz', price: 35 }, { name: 'Enterprise', price: 32 }, { name: 'Budget', price: 29 }] },
      { id: 'CAR-2', type: 'Midsize', model: 'Toyota Camry or similar', passengerCapacity: 5, bags: 3, transmission: 'Automatic', carsAvailable: 18, cities: ['New York', 'Los Angeles', 'Chicago', 'Miami', 'San Francisco'], providers: [{ name: 'Hertz', price: 55 }, { name: 'Enterprise', price: 49 }, { name: 'Avis', price: 59 }] },
      { id: 'CAR-3', type: 'SUV', model: 'Ford Explorer or similar', passengerCapacity: 7, bags: 4, transmission: 'Automatic', carsAvailable: 12, cities: ['New York', 'Los Angeles', 'Chicago', 'Miami'], providers: [{ name: 'National', price: 89 }, { name: 'Hertz', price: 95 }, { name: 'Alamo', price: 85 }] },
      { id: 'CAR-4', type: 'Luxury', model: 'BMW 5 Series or similar', passengerCapacity: 5, bags: 3, transmission: 'Automatic', carsAvailable: 8, cities: ['New York', 'Los Angeles', 'Miami'], providers: [{ name: 'Hertz', price: 149 }, { name: 'Avis', price: 159 }] },
      { id: 'CAR-5', type: 'Minivan', model: 'Chrysler Pacifica or similar', passengerCapacity: 7, bags: 5, transmission: 'Automatic', carsAvailable: 10, cities: ['New York', 'Los Angeles', 'Chicago', 'San Francisco'], providers: [{ name: 'Enterprise', price: 79 }, { name: 'Budget', price: 75 }] },
    ];
    localStorage.setItem('carsInventory', JSON.stringify(carsData));
    return carsData;
  }
  return JSON.parse(stored);
};

// City name normalization
const normalizeCity = (city) => {
  if (!city) return '';
  const cityMap = {
    'san jose': 'San Jose', 'sanjose': 'San Jose', 'sjc': 'San Jose',
    'new york': 'New York', 'newyork': 'New York', 'nyc': 'New York', 'jfk': 'New York',
    'los angeles': 'Los Angeles', 'losangeles': 'Los Angeles', 'la': 'Los Angeles', 'lax': 'Los Angeles',
    'chicago': 'Chicago', 'ord': 'Chicago',
    'miami': 'Miami', 'mia': 'Miami',
    'san francisco': 'San Francisco', 'sanfrancisco': 'San Francisco', 'sf': 'San Francisco', 'sfo': 'San Francisco',
    'denver': 'Denver', 'den': 'Denver',
    'seattle': 'Seattle', 'sea': 'Seattle',
    'boston': 'Boston', 'bos': 'Boston',
    'dallas': 'Dallas', 'dfw': 'Dallas',
    'atlanta': 'Atlanta', 'atl': 'Atlanta',
    'austin': 'Austin', 'aus': 'Austin',
    'phoenix': 'Phoenix', 'phx': 'Phoenix',
    'las vegas': 'Las Vegas', 'lasvegas': 'Las Vegas', 'las': 'Las Vegas',
    'orlando': 'Orlando', 'mco': 'Orlando',
  };
  return cityMap[city.toLowerCase().trim()] || city;
};

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const type = searchParams.get('type') || 'flights';
  const fromCity = normalizeCity(searchParams.get('from') || '');
  const toCity = normalizeCity(searchParams.get('to') || searchParams.get('destination') || '');
  const carLocation = normalizeCity(searchParams.get('location') || '');
  const minPrice = parseInt(searchParams.get('minPrice')) || 0;
  const maxPrice = parseInt(searchParams.get('maxPrice')) || 1000;
  const minSeats = parseInt(searchParams.get('seats')) || 2;
  const passengersParam = parseInt(searchParams.get('passengers')) || 1;
  const guestsParam = parseInt(searchParams.get('guests')) || 1;
  const tripType = searchParams.get('tripType') || 'roundtrip';
  
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState([]);
  const [returnFlights, setReturnFlights] = useState([]);
  const [priceRange, setPriceRange] = useState([0, 500]);
  const [sortBy, setSortBy] = useState('price');
  const [expandedId, setExpandedId] = useState(null);
  const [passengers, setPassengers] = useState(passengersParam);
  const [noResults, setNoResults] = useState(false);
  const [expandedType, setExpandedType] = useState(null); // 'FLIGHT' | 'HOTEL' | 'CAR'
  const [reviewsMap, setReviewsMap] = useState({}); // key `${type}:${id}` -> {aggregate, reviews}
  const [imagesMap, setImagesMap] = useState({}); // key `${type}:${id}` -> images array

  const loadReviews = async (listingType, listingId) => {
    const key = `${listingType}:${listingId}`;
    if (reviewsMap[key]) return;
    try {
      const resp = await travelerAPI.getReviewsByListing(listingType, listingId);
      setReviewsMap(prev => ({ ...prev, [key]: { aggregate: resp.data.aggregate, reviews: resp.data.data } }));
    } catch (e) {
      console.warn('Failed to load reviews', e);
    }
  };

  const handleExpand = async (listingType, id) => {
    const newId = expandedId === id ? null : id;
    setExpandedId(newId);
    setExpandedType(newId ? listingType : null);
    if (newId) {
      await Promise.all([
        loadReviews(listingType, id),
        loadImages(listingType, id),
      ]);
    }
  };

  const loadImages = async (listingType, id) => {
    const key = `${listingType}:${id}`;
    if (imagesMap[key]) return;
    try {
      if (listingType === 'HOTEL') {
        const resp = await listingsAPI.getHotelImages(id);
        setImagesMap(prev => ({ ...prev, [key]: resp.data?.data || [] }));
      } else if (listingType === 'CAR') {
        const resp = await listingsAPI.getCarImages(id);
        setImagesMap(prev => ({ ...prev, [key]: resp.data?.data || [] }));
      }
    } catch (e) {
      // non-fatal
    }
  };

  const renderReviews = (listingType, id) => {
    const key = `${listingType}:${id}`;
    const data = reviewsMap[key];
    if (!data) return null;
    const { aggregate, reviews } = data;
    return (
      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
          Reviews {aggregate?.avgRating ? `(Avg ${aggregate.avgRating.toFixed(1)} / 5 • ${aggregate.totalReviews} total)` : ''}
        </Typography>
          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
            <Button size="small" variant="outlined" onClick={() => navigate(`/submit-review?type=&id=`)}>Write a review</Button>
          </Box>
        {(!reviews || reviews.length === 0) ? (
          <Typography variant="body2" color="text.secondary">No reviews yet.</Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {reviews.slice(0,3).map((r) => (
              <Paper key={r.review_id} sx={{ p: 1.5 }}>
                <Typography variant="body2" fontWeight={600}>{r.user_name} • {r.rating}★</Typography>
                {r.title && (<Typography variant="body2" color="text.secondary">{r.title}</Typography>)}
                <Typography variant="body2">{r.review_text}</Typography>
              </Paper>
            ))}
          </Box>
        )}
      </Box>
    );
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setNoResults(false);
      
      let filteredResults = [];
      let returnResults = [];
      
      try {
        const mappedSort = sortBy === 'price' ? 'price_asc' : (sortBy === 'price_desc' ? 'price_desc' : undefined);
        const commonParams = { minPrice: priceRange[0], maxPrice: priceRange[1], sortBy: mappedSort };
        
        if (type === 'flights') {
          // Fetch from backend API
          const backendResponse = await listingsAPI.getAllFlights(commonParams);
          const backendFlights = backendResponse.data.data || [];
          
          // Convert backend format to traveler format
          const formattedBackendFlights = backendFlights.map(f => {
            const departTime = f.departure_datetime ? new Date(f.departure_datetime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '08:00';
            const arriveTime = f.arrival_datetime ? new Date(f.arrival_datetime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '12:00';
            const durationMins = f.duration || 120;
            const durationStr = `${Math.floor(durationMins / 60)}h ${durationMins % 60}m`;
            
            return {
              id: f.flight_id,
              flightNumber: f.flight_id,
              airline: f.airline_name,
              // Normalize airports/cities so they align with traveler search normalization
              from: normalizeCity(f.departure_airport),
              to: normalizeCity(f.arrival_airport),
              departTime,
              arriveTime,
              duration: durationStr,
              stops: 0,
              seatsAvailable: f.available_seats || f.total_seats || 0,
              providers: [
                { name: 'Kayak Direct', price: parseFloat(f.ticket_price) || 100 },
                { name: 'Expedia', price: Math.round((parseFloat(f.ticket_price) || 100) * 1.05) },
                { name: 'Priceline', price: Math.round((parseFloat(f.ticket_price) || 100) * 1.1) },
              ],
            };
          });
          
          // Get mock data and merge
          const mockFlights = initializeFlightsData();
          const allFlights = [...formattedBackendFlights, ...mockFlights];
          
          // Filter outbound flights by origin and destination
          filteredResults = allFlights.filter(f => {
            const matchFrom = !fromCity || f.from.toLowerCase() === fromCity.toLowerCase();
            const matchTo = !toCity || f.to.toLowerCase() === toCity.toLowerCase();
            return matchFrom && matchTo;
          });

          // Apply price range filter to merged list
          filteredResults = filteredResults.filter(f => {
            const price = getBestPrice(f.providers);
            return price >= priceRange[0] && price <= priceRange[1];
          });

          // Apply sort if requested
          if (mappedSort === 'price_asc') filteredResults.sort((a,b)=>getBestPrice(a.providers)-getBestPrice(b.providers));
          if (mappedSort === 'price_desc') filteredResults.sort((a,b)=>getBestPrice(b.providers)-getBestPrice(a.providers));
          
          // For round trip, also get return flights (destination → origin)
          if (tripType === 'roundtrip' && fromCity && toCity) {
            returnResults = allFlights.filter(f => {
              const matchFrom = f.from.toLowerCase() === toCity.toLowerCase();
              const matchTo = f.to.toLowerCase() === fromCity.toLowerCase();
              return matchFrom && matchTo;
            });
            setReturnFlights(returnResults);
          } else {
            setReturnFlights([]);
          }
        } else if (type === 'hotels') {
          // Fetch from backend API
          const backendResponse = await listingsAPI.getAllHotels(commonParams);
          const backendHotels = backendResponse.data.data || [];
          
          // Convert backend format to traveler format
          const formattedBackendHotels = backendHotels.map(h => ({
            id: h.hotel_id,
            name: h.hotel_name,
            city: h.city,
            location: `${h.city}, ${h.state}`,
            rating: parseFloat(h.star_rating) || 4,
            reviews: Math.floor(Math.random() * 1000) + 100,
            stars: parseInt(h.star_rating) || 4,
            roomsAvailable: h.available_rooms || h.total_rooms || 0,
            amenities: h.amenities || [],
            providers: [
              { name: 'Booking.com', price: parseFloat(h.price_per_night) || 100 },
              { name: 'Hotels.com', price: Math.round((parseFloat(h.price_per_night) || 100) * 1.05) },
              { name: 'Expedia', price: Math.round((parseFloat(h.price_per_night) || 100) * 1.1) },
            ],
          }));
          
          // Get mock data and merge
          const mockHotels = initializeHotelsData();
          const allHotels = [...formattedBackendHotels, ...mockHotels];
          
          // Filter by city
          filteredResults = allHotels.filter(h => !toCity || h.city.toLowerCase() === toCity.toLowerCase());

          // Apply price filter and sort
          filteredResults = filteredResults.filter(h => {
            const price = getBestPrice(h.providers);
            return price >= priceRange[0] && price <= priceRange[1];
          });
          if (mappedSort === 'price_asc') filteredResults.sort((a,b)=>getBestPrice(a.providers)-getBestPrice(b.providers));
          if (mappedSort === 'price_desc') filteredResults.sort((a,b)=>getBestPrice(b.providers)-getBestPrice(a.providers));
          if (sortBy === 'rating') filteredResults.sort((a,b)=> (b.rating||0) - (a.rating||0));
        } else if (type === 'cars') {
          // Fetch from backend API
          const backendResponse = await listingsAPI.getAllCars(commonParams);
          const backendCars = backendResponse.data.data || [];
          
          // Convert backend format to traveler format
          const formattedBackendCars = backendCars.map(c => ({
            id: c.car_id,
            type: c.car_type,
            model: `${c.model} ${c.year || ''}`.trim(),
            passengerCapacity: parseInt(c.seats) || 5,
            bags: Math.ceil((parseInt(c.seats) || 5) / 2),
            transmission: c.transmission_type || 'Automatic',
            carsAvailable: c.availability_status === 'AVAILABLE' ? 10 : 0,
            cities: ['New York', 'Los Angeles', 'Chicago', 'Miami', 'San Francisco', 'Denver', 'Seattle'],
            providers: [
              { name: c.company_name, price: parseFloat(c.daily_rental_price) || 50 },
              { name: 'Enterprise', price: Math.round((parseFloat(c.daily_rental_price) || 50) * 1.05) },
              { name: 'Budget', price: Math.round((parseFloat(c.daily_rental_price) || 50) * 0.95) },
            ],
          }));
          
          // Get mock data and merge
          const mockCars = initializeCarsData();
          const allCars = [...formattedBackendCars, ...mockCars];
          
          // Filter by location, price range, and seats
          filteredResults = allCars.filter(c => {
            const matchesLocation = !carLocation || c.cities.some(city => city.toLowerCase() === carLocation.toLowerCase());
            const price = c.providers && c.providers.length > 0 ? Math.min(...c.providers.map(p => p.price)) : 0;
            const matchesPrice = price >= minPrice && price <= maxPrice;
            const matchesSeats = c.passengerCapacity >= minSeats;
            return matchesLocation && matchesPrice && matchesSeats;
          });

          // Sort cars
          if (mappedSort === 'price_asc') filteredResults.sort((a,b)=>getBestPrice(a.providers)-getBestPrice(b.providers));
          if (mappedSort === 'price_desc') filteredResults.sort((a,b)=>getBestPrice(b.providers)-getBestPrice(a.providers));
        }
        
        if (filteredResults.length === 0) {
          setNoResults(true);
        }
        
        setResults(filteredResults);
      } catch (error) {
        console.error('Error fetching listings:', error);
        // Fallback to mock data if backend fails
        if (type === 'flights') {
          const mockFlights = initializeFlightsData();
          filteredResults = mockFlights.filter(f => {
            const matchFrom = !fromCity || f.from.toLowerCase() === fromCity.toLowerCase();
            const matchTo = !toCity || f.to.toLowerCase() === toCity.toLowerCase();
            return matchFrom && matchTo;
          });
          setResults(filteredResults);
        } else if (type === 'hotels') {
          const mockHotels = initializeHotelsData();
          filteredResults = mockHotels.filter(h => !toCity || h.city.toLowerCase() === toCity.toLowerCase());
          setResults(filteredResults);
        } else if (type === 'cars') {
          const mockCars = initializeCarsData();
          filteredResults = mockCars.filter(c => {
            const matchesLocation = !carLocation || c.cities.some(city => city.toLowerCase() === carLocation.toLowerCase());
            const price = c.providers && c.providers.length > 0 ? Math.min(...c.providers.map(p => p.price)) : 0;
            const matchesPrice = price >= minPrice && price <= maxPrice;
            const matchesSeats = c.passengerCapacity >= minSeats;
            return matchesLocation && matchesPrice && matchesSeats;
          });
          setResults(filteredResults);
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [type, fromCity, toCity, carLocation, minSeats, tripType, priceRange, sortBy]);

  const handleBooking = (item, provider, itemType) => {
    // Store selected booking info
    const bookingData = {
      ...item,
      selectedProvider: provider,
      finalPrice: provider.price,
      passengers: passengers,
      itemType: itemType,
    };
    localStorage.setItem('currentBooking', JSON.stringify(bookingData));
    navigate(`/booking/${type}/${item.id}?provider=${provider.name}&price=${provider.price}&passengers=${passengers}`);
  };

  const getBestPrice = (providers) => {
    return Math.min(...providers.map(p => p.price));
  };

  const renderFlightCard = (flight) => {
    const hasSeats = flight.seatsAvailable >= passengers;
    
    return (
      <Card key={flight.id} sx={{ mb: 2, opacity: hasSeats ? 1 : 0.6 }} className="card-hover">
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" color="text.secondary">
                {flight.airline} • {flight.flightNumber}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <Typography variant="h5" fontWeight={600}>{flight.departTime}</Typography>
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', px: 1 }}>
                  <Box sx={{ flex: 1, height: 2, bgcolor: 'grey.300' }} />
                  <Flight sx={{ color: 'primary.main', mx: 1, transform: 'rotate(90deg)' }} />
                  <Box sx={{ flex: 1, height: 2, bgcolor: 'grey.300' }} />
                </Box>
                <Typography variant="h5" fontWeight={600}>{flight.arriveTime}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {flight.from} → {flight.to}
              </Typography>
            </Grid>
            <Grid item xs={6} md={2}>
              <Typography variant="body2" color="text.secondary">Duration</Typography>
              <Typography fontWeight={500}>{flight.duration}</Typography>
              <Chip 
                label={flight.stops === 0 ? 'Nonstop' : `${flight.stops} stop`} 
                size="small" 
                color={flight.stops === 0 ? 'success' : 'default'}
                sx={{ mt: 0.5 }}
              />
            </Grid>
            <Grid item xs={6} md={2}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AirlineSeatReclineNormal color={hasSeats ? 'success' : 'error'} />
                <Typography variant="body2" color={hasSeats ? 'success.main' : 'error.main'}>
                  {flight.seatsAvailable} seats left
                </Typography>
              </Box>
              {!hasSeats && (
                <Chip 
                  icon={<Warning />}
                  label={`Need ${passengers} seats`}
                  size="small" 
                  color="error"
                  sx={{ mt: 0.5 }}
                />
              )}
            </Grid>
            <Grid item xs={6} md={2}>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body2" color="text.secondary">
                  from {flight.providers.length} providers
                </Typography>
                <Typography variant="h4" color="primary.main" fontWeight={700}>
                  ${getBestPrice(flight.providers)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  per person
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={2}>
              <Button 
                variant="contained" 
                fullWidth 
                endIcon={<ExpandMore />}
                onClick={() => handleExpand('FLIGHT', flight.id)}
                disabled={!hasSeats}
              >
                {hasSeats ? `Compare ${flight.providers.length} Deals` : 'Sold Out'}
              </Button>
            </Grid>
          </Grid>

          {expandedId === flight.id && hasSeats && (
            <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CompareArrows color="primary" />
                  <Typography variant="subtitle1" fontWeight={600}>
                    Compare Prices - Booking for {passengers} passenger{passengers > 1 ? 's' : ''}
                  </Typography>
                </Box>
                <Typography variant="h6" color="primary.main">
                  Total: ${getBestPrice(flight.providers) * passengers}
                </Typography>
              </Box>
              <Grid container spacing={2}>
                {flight.providers
                  .sort((a, b) => a.price - b.price)
                  .map((provider, idx) => (
                  <Grid item xs={12} sm={6} md={4} key={idx}>
                    <Paper 
                      sx={{ 
                        p: 2, 
                        textAlign: 'center',
                        border: idx === 0 ? '2px solid' : '1px solid',
                        borderColor: idx === 0 ? 'primary.main' : 'divider',
                        position: 'relative',
                      }}
                    >
                      {idx === 0 && (
                        <Chip 
                          label="Best Deal" 
                          color="primary" 
                          size="small"
                          icon={<LocalOffer />}
                          sx={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)' }}
                        />
                      )}
                      <Typography fontWeight={600}>{provider.name}</Typography>
                      <Typography variant="h5" color="primary.main" fontWeight={700} sx={{ my: 1 }}>
                        ${provider.price} <Typography component="span" variant="caption">x {passengers}</Typography>
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Total: ${provider.price * passengers}
                      </Typography>
                      <Button 
                        variant={idx === 0 ? "contained" : "outlined"}
                        size="small"
                        fullWidth
                        onClick={() => handleBooking(flight, provider, 'flight')}
                      >
                        Book {passengers} Seat{passengers > 1 ? 's' : ''}
                      </Button>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
              {renderReviews('FLIGHT', flight.id)}
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderHotelCard = (hotel) => {
    const hasRooms = hotel.roomsAvailable > 0;
    
    return (
      <Card key={hotel.id} sx={{ mb: 2, opacity: hasRooms ? 1 : 0.6 }} className="card-hover">
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={5}>
              <Typography variant="h6" fontWeight={600}>{hotel.name}</Typography>
              <Typography variant="body2" color="text.secondary">{hotel.location}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                {[...Array(hotel.stars)].map((_, i) => (
                  <Star key={i} sx={{ color: '#ffc107', fontSize: 18 }} />
                ))}
                <Typography variant="body2" sx={{ ml: 1 }}>
                  {hotel.rating} ({hotel.reviews} reviews)
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                {hotel.amenities.map((a, idx) => (
                  <Chip key={idx} label={a} size="small" variant="outlined" />
                ))}
              </Box>
              <Typography variant="body2" color={hasRooms ? 'success.main' : 'error.main'} sx={{ mt: 1 }}>
                {hotel.roomsAvailable} rooms available
              </Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                from {hotel.providers.length} providers
              </Typography>
              <Typography variant="h4" color="primary.main" fontWeight={700}>
                ${getBestPrice(hotel.providers)}
              </Typography>
              <Typography variant="body2" color="text.secondary">per night</Typography>
            </Grid>
            <Grid item xs={6} md={4}>
              <Button 
                variant="contained" 
                fullWidth 
                endIcon={<ExpandMore />}
                onClick={() => setExpandedId(expandedId === hotel.id ? null : hotel.id)}
                disabled={!hasRooms}
              >
                {hasRooms ? `Compare ${hotel.providers.length} Deals` : 'No Rooms'}
              </Button>
            </Grid>
          </Grid>

          {expandedId === hotel.id && hasRooms && (
            <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              {(imagesMap[`HOTEL:${hotel.id}`] || []).length > 0 && (
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  {(imagesMap[`HOTEL:${hotel.id}`] || []).slice(0,6).map((img) => (
                    <Grid item xs={6} sm={4} md={2} key={img._id}>
                      <Paper sx={{ overflow: 'hidden', borderRadius: 1 }}>
                        <img src={img.url} alt={img.caption || img.type} style={{ width: '100%', height: 100, objectFit: 'cover' }} />
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              )}
              <Grid container spacing={2}>
                {hotel.providers
                  .sort((a, b) => a.price - b.price)
                  .map((provider, idx) => (
                  <Grid item xs={6} sm={3} key={idx}>
                    <Paper sx={{ p: 2, textAlign: 'center', border: idx === 0 ? '2px solid' : '1px solid', borderColor: idx === 0 ? 'primary.main' : 'divider' }}>
                      {idx === 0 && <Chip label="Best Deal" color="primary" size="small" sx={{ mb: 1 }} />}
                      <Typography fontWeight={600}>{provider.name}</Typography>
                      <Typography variant="h5" color="primary.main" fontWeight={700}>${provider.price}</Typography>
                      <Typography variant="caption" color="text.secondary">per night</Typography>
                      <Button variant={idx === 0 ? "contained" : "outlined"} size="small" fullWidth sx={{ mt: 1 }} onClick={() => handleBooking(hotel, provider, 'hotel')}>
                        Book
                      </Button>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
                          {renderReviews('HOTEL', hotel.id)}
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderCarCard = (car) => {
    const hasCars = car.carsAvailable > 0;
    
    return (
      <Card key={car.id} sx={{ mb: 2, opacity: hasCars ? 1 : 0.6 }} className="card-hover">
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <Typography variant="h6" fontWeight={600}>{car.type}</Typography>
              <Typography variant="body2" color="text.secondary">{car.model}</Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <Chip label={`${car.passengerCapacity} passengers`} size="small" variant="outlined" />
                <Chip label={`${car.bags} bags`} size="small" variant="outlined" />
                <Chip label={car.transmission} size="small" variant="outlined" />
              </Box>
              <Typography variant="body2" color={hasCars ? 'success.main' : 'error.main'} sx={{ mt: 1 }}>
                {car.carsAvailable} cars available
              </Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                from {car.providers.length} rental companies
              </Typography>
              <Typography variant="h4" color="primary.main" fontWeight={700}>
                ${getBestPrice(car.providers)}
              </Typography>
              <Typography variant="body2" color="text.secondary">per day</Typography>
            </Grid>
            <Grid item xs={6} md={5}>
              <Button 
                variant="contained" 
                endIcon={<ExpandMore />}
                onClick={() => handleExpand('CAR', car.id)}
                disabled={!hasCars}
              >
                {hasCars ? `Compare ${car.providers.length} Rentals` : 'Not Available'}
              </Button>
            </Grid>
          </Grid>

          {expandedId === car.id && hasCars && (
            <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              {(imagesMap[`CAR:${car.id}`] || []).length > 0 && (
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  {(imagesMap[`CAR:${car.id}`] || []).slice(0,6).map((img) => (
                    <Grid item xs={6} sm={4} md={2} key={img._id}>
                      <Paper sx={{ overflow: 'hidden', borderRadius: 1 }}>
                        <img src={img.url} alt={img.caption || img.type} style={{ width: '100%', height: 100, objectFit: 'cover' }} />
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              )}
              <Grid container spacing={2}>
                {car.providers
                  .sort((a, b) => a.price - b.price)
                  .map((provider, idx) => (
                  <Grid item xs={6} sm={3} key={idx}>
                    <Paper sx={{ p: 2, textAlign: 'center', border: idx === 0 ? '2px solid' : '1px solid', borderColor: idx === 0 ? 'primary.main' : 'divider' }}>
                      {idx === 0 && <Chip label="Best Deal" color="primary" size="small" sx={{ mb: 1 }} />}
                      <Typography fontWeight={600}>{provider.name}</Typography>
                      <Typography variant="h5" color="primary.main" fontWeight={700}>${provider.price}/day</Typography>
                      <Button variant={idx === 0 ? "contained" : "outlined"} size="small" fullWidth sx={{ mt: 1 }} onClick={() => handleBooking(car, provider, 'car')}>
                        Reserve
                      </Button>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Locations</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {car.cities.map((city, i) => (
                    <Chip key={i} label={city} size="small" />
                  ))}
                </Box>
              </Box>
              {renderReviews('CAR', car.id)}
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        {/* Search Summary */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <strong>Searching:</strong> {type === 'flights' ? `${fromCity || 'Any'} → ${toCity || 'Any'}` : 
                                       type === 'hotels' ? `Hotels in ${toCity || 'Any city'}` :
                                       `Car rentals in ${carLocation || 'Any city'}`}
          {type === 'flights' && ` • ${passengers} passenger${passengers > 1 ? 's' : ''}`}
          {type === 'flights' && ` • ${tripType === 'roundtrip' ? '🔄 Round Trip' : '➡️ One Way'}`}
          {type === 'cars' && ` • Price: $${minPrice}-$${maxPrice}/day • Min ${minSeats} seats`}
        </Alert>

        <Grid container spacing={3}>
          {/* Filters */}
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 3, position: 'sticky', top: 80 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <FilterList />
                <Typography variant="h6" fontWeight={600}>Filters</Typography>
              </Box>
              
              {type === 'flights' && (
                <Box sx={{ mb: 3 }}>
                  <Typography gutterBottom fontWeight={500}>Passengers</Typography>
                  <TextField
                    type="number"
                    value={passengers}
                    onChange={(e) => setPassengers(Math.max(1, parseInt(e.target.value) || 1))}
                    inputProps={{ min: 1, max: 9 }}
                    size="small"
                    fullWidth
                    helperText="Flights will show if enough seats available"
                  />
                </Box>
              )}
              
              <Typography gutterBottom>Price Range</Typography>
              <Slider
                value={priceRange}
                onChange={(e, v) => setPriceRange(v)}
                valueLabelDisplay="auto"
                min={0}
                max={500}
                sx={{ mb: 3 }}
              />
              <FormControl fullWidth>
                <InputLabel>Sort By</InputLabel>
                <Select value={sortBy} label="Sort By" onChange={(e) => setSortBy(e.target.value)}>
                  <MenuItem value="price">Price: Low to High</MenuItem>
                  <MenuItem value="price_desc">Price: High to Low</MenuItem>
                  <MenuItem value="rating">Rating</MenuItem>
                </Select>
              </FormControl>
            </Paper>
          </Grid>

          {/* Results */}
          <Grid item xs={12} md={9}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5" fontWeight={600}>
                {type.charAt(0).toUpperCase() + type.slice(1)} Results
              </Typography>
              <Typography color="text.secondary">
                {results.length} options found
              </Typography>
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : noResults ? (
              <Alert severity="warning" sx={{ py: 4 }}>
                <Typography variant="h6" gutterBottom>No {type} found for this route</Typography>
                <Typography>
                  Try searching for a different origin/destination or adjust your filters.
                </Typography>
              </Alert>
            ) : (
              <>
                {type === 'flights' && (
                  <>
                    {/* Outbound Flights */}
                    <Paper sx={{ p: 2, mb: 2, bgcolor: 'primary.main', color: 'white' }}>
                      <Typography variant="h6">
                        ✈️ Outbound: {fromCity || 'Any'} → {toCity || 'Any'}
                      </Typography>
                      <Typography variant="body2">
                        {tripType === 'oneway' ? 'One-way flight' : 'Select your departing flight'}
                      </Typography>
                    </Paper>
                    {results.map(renderFlightCard)}
                    
                    {/* Return Flights (only for round trip) */}
                    {tripType === 'roundtrip' && fromCity && toCity && (
                      <>
                        <Paper sx={{ p: 2, mb: 2, mt: 4, bgcolor: 'secondary.main', color: 'white' }}>
                          <Typography variant="h6">
                            ✈️ Return: {toCity} → {fromCity}
                          </Typography>
                          <Typography variant="body2">
                            Select your return flight
                          </Typography>
                        </Paper>
                        {returnFlights.length > 0 ? (
                          returnFlights.map(renderFlightCard)
                        ) : (
                          <Alert severity="warning" sx={{ mb: 2 }}>
                            No return flights found for {toCity} → {fromCity}. 
                            You may need to book a separate one-way ticket.
                          </Alert>
                        )}
                      </>
                    )}
                  </>
                )}
                {type === 'hotels' && results.map(renderHotelCard)}
                {type === 'cars' && results.map(renderCarCard)}
              </>
            )}
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default SearchResults;

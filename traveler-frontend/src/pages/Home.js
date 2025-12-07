import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  TextField,
  Button,
  Grid,
  Paper,
  Card,
  CardContent,
  CardMedia,
  InputAdornment,
  Autocomplete,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Flight,
  Hotel,
  DirectionsCar,
  Search,
  LocationOn,
  CalendarMonth,
  Person,
  SwapHoriz,
  TrendingFlat,
  SyncAlt,
} from '@mui/icons-material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

const popularCities = [
  'New York', 'Los Angeles', 'Chicago', 'San Francisco', 'Miami',
  'Las Vegas', 'Seattle', 'Boston', 'Denver', 'Austin',
  'San Jose', 'Dallas', 'Atlanta', 'Phoenix', 'Orlando',
  'Philadelphia', 'Houston', 'San Diego', 'Portland', 'Nashville',
  'New Orleans', 'Tampa', 'San Antonio', 'Charlotte', 'Columbus'
];

const US_STATES = [
  'AL - Alabama','AK - Alaska','AZ - Arizona','AR - Arkansas','CA - California','CO - Colorado','CT - Connecticut','DE - Delaware','FL - Florida','GA - Georgia',
  'HI - Hawaii','ID - Idaho','IL - Illinois','IN - Indiana','IA - Iowa','KS - Kansas','KY - Kentucky','LA - Louisiana','ME - Maine','MD - Maryland',
  'MA - Massachusetts','MI - Michigan','MN - Minnesota','MS - Mississippi','MO - Missouri','MT - Montana','NE - Nebraska','NV - Nevada','NH - New Hampshire','NJ - New Jersey',
  'NM - New Mexico','NY - New York','NC - North Carolina','ND - North Dakota','OH - Ohio','OK - Oklahoma','OR - Oregon','PA - Pennsylvania','RI - Rhode Island','SC - South Carolina',
  'SD - South Dakota','TN - Tennessee','TX - Texas','UT - Utah','VT - Vermont','VA - Virginia','WA - Washington','WV - West Virginia','WI - Wisconsin','WY - Wyoming','DC - District of Columbia'
];

const allLocationOptions = [...US_STATES, ...popularCities];

const popularDestinations = [
  { city: 'New York', image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400', price: 199 },
  { city: 'Los Angeles', image: 'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=400', price: 249 },
  { city: 'Miami', image: 'https://images.unsplash.com/photo-1514214246283-d427a95c5d2f?w=400', price: 179 },
  { city: 'Las Vegas', image: 'https://images.unsplash.com/photo-1605833556294-ea5c7a74f57d?w=400', price: 159 },
];

const Home = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'flights';
  
  const [activeTab, setActiveTab] = useState(
    initialTab === 'hotels' ? 1 : initialTab === 'cars' ? 2 : 0
  );
  
  // Trip type: 'oneway' or 'roundtrip'
  const [tripType, setTripType] = useState('roundtrip');
  
  // Flight search state
  const [flightSearch, setFlightSearch] = useState({
    from: '',
    to: '',
    departDate: null,
    returnDate: null,
    passengers: 1,
  });

  // Hotel search state
  const [hotelSearch, setHotelSearch] = useState({
    destination: '',
    checkIn: null,
    checkOut: null,
    guests: 1,
    rooms: 1,
  });

  // Car search state
  const [carSearch, setCarSearch] = useState({
    location: '',
    minPrice: '',
    maxPrice: '',
    seats: '',
  });

  const handleTripTypeChange = (event, newType) => {
    if (newType !== null) {
      setTripType(newType);
      // Clear return date when switching to one-way
      if (newType === 'oneway') {
        setFlightSearch({ ...flightSearch, returnDate: null });
      }
    }
  };

  const handleSearch = () => {
    let searchQuery = '';
    
    if (activeTab === 0) {
      searchQuery = `type=flights&from=${flightSearch.from}&to=${flightSearch.to}&date=${flightSearch.departDate?.toISOString() || ''}&returnDate=${flightSearch.returnDate?.toISOString() || ''}&passengers=${flightSearch.passengers}&tripType=${tripType}`;
    } else if (activeTab === 1) {
      searchQuery = `type=hotels&destination=${hotelSearch.destination}&checkIn=${hotelSearch.checkIn?.toISOString() || ''}&checkOut=${hotelSearch.checkOut?.toISOString() || ''}&guests=${hotelSearch.guests}`;
    } else {
      searchQuery = `type=cars&location=${carSearch.location}&minPrice=${carSearch.minPrice || 0}&maxPrice=${carSearch.maxPrice || 1000}&seats=${carSearch.seats || 2}`;
    }
    
    navigate(`/search?${searchQuery}`);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        {/* Hero Section */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            color: 'white',
            py: { xs: 6, md: 10 },
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Background Pattern */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: 0.1,
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
          
          <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
            <Typography
              variant="h2"
              align="center"
              sx={{
                fontWeight: 700,
                mb: 1,
                fontSize: { xs: '2rem', md: '3rem' },
              }}
            >
              Find Your Perfect Trip
            </Typography>
            <Typography
              variant="h6"
              align="center"
              sx={{ opacity: 0.8, mb: 4, fontWeight: 400 }}
            >
              Search hundreds of travel sites at once
            </Typography>

            {/* Search Box */}
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                maxWidth: 1000,
                mx: 'auto',
              }}
            >
              {/* Tabs */}
              <Tabs
                value={activeTab}
                onChange={(e, v) => setActiveTab(v)}
                sx={{ mb: 2 }}
                TabIndicatorProps={{
                  sx: { backgroundColor: 'primary.main', height: 3, borderRadius: 2 },
                }}
              >
                <Tab icon={<Flight />} label="Flights" iconPosition="start" />
                <Tab icon={<Hotel />} label="Hotels" iconPosition="start" />
                <Tab icon={<DirectionsCar />} label="Cars" iconPosition="start" />
              </Tabs>

              {/* Flight Search */}
              {activeTab === 0 && (
                <>
                  {/* Trip Type Toggle */}
                  <Box sx={{ mb: 2 }}>
                    <ToggleButtonGroup
                      value={tripType}
                      exclusive
                      onChange={handleTripTypeChange}
                      size="small"
                    >
                      <ToggleButton value="roundtrip" sx={{ px: 3 }}>
                        <SyncAlt sx={{ mr: 1 }} />
                        Round Trip
                      </ToggleButton>
                      <ToggleButton value="oneway" sx={{ px: 3 }}>
                        <TrendingFlat sx={{ mr: 1 }} />
                        One Way
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={3}>
                      <Autocomplete
                        options={allLocationOptions}
                        value={flightSearch.from}
                        onChange={(e, v) => setFlightSearch({ ...flightSearch, from: v || '' })}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="From"
                            placeholder="Departure city"
                            InputProps={{
                              ...params.InputProps,
                              startAdornment: <LocationOn color="action" sx={{ ml: 1 }} />,
                            }}
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Autocomplete
                        options={allLocationOptions}
                        value={flightSearch.to}
                        onChange={(e, v) => setFlightSearch({ ...flightSearch, to: v || '' })}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="To"
                            placeholder="Arrival city"
                            InputProps={{
                              ...params.InputProps,
                              startAdornment: <LocationOn color="action" sx={{ ml: 1 }} />,
                            }}
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={6} md={2}>
                      <DatePicker
                        label="Depart"
                        value={flightSearch.departDate}
                        onChange={(date) => setFlightSearch({ 
                          ...flightSearch, 
                          departDate: date, 
                          returnDate: flightSearch.returnDate && date > flightSearch.returnDate ? null : flightSearch.returnDate 
                        })}
                        minDate={new Date()}
                        slotProps={{ textField: { fullWidth: true } }}
                      />
                    </Grid>
                    <Grid item xs={6} md={2}>
                      <DatePicker
                        label="Return"
                        value={flightSearch.returnDate}
                        onChange={(date) => setFlightSearch({ ...flightSearch, returnDate: date })}
                        minDate={flightSearch.departDate || new Date()}
                        disabled={tripType === 'oneway' || !flightSearch.departDate}
                        slotProps={{ 
                          textField: { 
                            fullWidth: true, 
                            helperText: tripType === 'oneway' ? 'One-way trip' : (!flightSearch.departDate ? 'Select departure first' : ''),
                            sx: tripType === 'oneway' ? { bgcolor: 'grey.100' } : {}
                          } 
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <Button
                        variant="contained"
                        fullWidth
                        size="large"
                        startIcon={<Search />}
                        onClick={handleSearch}
                        sx={{ height: 56 }}
                      >
                        Search
                      </Button>
                    </Grid>
                  </Grid>
                  
                  {/* Trip type info */}
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    {tripType === 'roundtrip' 
                      ? '🔄 Round trip: Showing outbound + return flights' 
                      : '➡️ One way: Showing outbound flight only'}
                  </Typography>
                </>
              )}

              {/* Hotel Search */}
              {activeTab === 1 && (
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Autocomplete
                      options={allLocationOptions}
                      value={hotelSearch.destination}
                      onChange={(e, v) => setHotelSearch({ ...hotelSearch, destination: v || '' })}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Destination"
                          placeholder="Where are you going?"
                          InputProps={{
                            ...params.InputProps,
                            startAdornment: <LocationOn color="action" sx={{ ml: 1 }} />,
                          }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={6} md={2}>
                    <DatePicker
                      label="Check-in"
                      value={hotelSearch.checkIn}
                      onChange={(date) => setHotelSearch({ ...hotelSearch, checkIn: date, checkOut: hotelSearch.checkOut && date > hotelSearch.checkOut ? null : hotelSearch.checkOut })}
                      minDate={new Date()}
                      slotProps={{ textField: { fullWidth: true } }}
                    />
                  </Grid>
                  <Grid item xs={6} md={2}>
                    <DatePicker
                      label="Check-out"
                      value={hotelSearch.checkOut}
                      onChange={(date) => setHotelSearch({ ...hotelSearch, checkOut: date })}
                      minDate={hotelSearch.checkIn || new Date()}
                      disabled={!hotelSearch.checkIn}
                      slotProps={{ textField: { fullWidth: true, helperText: !hotelSearch.checkIn ? 'Select check-in first' : '' } }}
                    />
                  </Grid>
                  <Grid item xs={6} md={2}>
                    <TextField
                      fullWidth
                      label="Guests"
                      type="number"
                      value={hotelSearch.guests}
                      onChange={(e) => setHotelSearch({ ...hotelSearch, guests: e.target.value })}
                      InputProps={{
                        startAdornment: <Person color="action" sx={{ mr: 1 }} />,
                      }}
                    />
                  </Grid>
                  <Grid item xs={6} md={2}>
                    <Button
                      variant="contained"
                      fullWidth
                      size="large"
                      startIcon={<Search />}
                      onClick={handleSearch}
                      sx={{ height: 56 }}
                    >
                      Search
                    </Button>
                  </Grid>
                </Grid>
              )}

              {/* Car Search */}
              {activeTab === 2 && (
                <Grid container spacing={2}>
                  <Grid item xs={12} md={3}>
                    <Autocomplete
                      options={allLocationOptions}
                      value={carSearch.location}
                      onChange={(e, v) => setCarSearch({ ...carSearch, location: v || '' })}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Location (City)"
                          placeholder="Where do you need a car?"
                          InputProps={{
                            ...params.InputProps,
                            startAdornment: <LocationOn color="action" sx={{ ml: 1 }} />,
                          }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <TextField
                      fullWidth
                      label="Min Price ($/day)"
                      type="number"
                      value={carSearch.minPrice}
                      onChange={(e) => setCarSearch({ ...carSearch, minPrice: e.target.value })}
                      placeholder="0"
                      InputProps={{
                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <TextField
                      fullWidth
                      label="Max Price ($/day)"
                      type="number"
                      value={carSearch.maxPrice}
                      onChange={(e) => setCarSearch({ ...carSearch, maxPrice: e.target.value })}
                      placeholder="1000"
                      InputProps={{
                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <TextField
                      fullWidth
                      label="Min Seats"
                      type="number"
                      value={carSearch.seats}
                      onChange={(e) => setCarSearch({ ...carSearch, seats: e.target.value })}
                      placeholder="2"
                      InputProps={{
                        startAdornment: <Person color="action" sx={{ mr: 1 }} />,
                      }}
                      inputProps={{ min: 2, max: 9 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Button
                      variant="contained"
                      fullWidth
                      size="large"
                      startIcon={<Search />}
                      onClick={handleSearch}
                      sx={{ height: 56 }}
                    >
                      Search Cars
                    </Button>
                  </Grid>
                </Grid>
              )}
            </Paper>
          </Container>
        </Box>

        {/* Popular Destinations */}
        <Container maxWidth="lg" sx={{ py: 8 }}>
          <Typography variant="h4" fontWeight={600} sx={{ mb: 1 }}>
            Popular Destinations
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Explore trending destinations and find the best deals
          </Typography>

          <Grid container spacing={3}>
            {popularDestinations.map((dest, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Card
                  className="card-hover"
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/search?type=flights&to=${dest.city}`)}
                >
                  <CardMedia
                    component="img"
                    height="180"
                    image={dest.image}
                    alt={dest.city}
                    sx={{ objectFit: 'cover' }}
                  />
                  <CardContent>
                    <Typography variant="h6" fontWeight={600}>
                      {dest.city}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Flights from
                    </Typography>
                    <Typography variant="h6" color="primary.main" fontWeight={700}>
                      ${dest.price}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>

        {/* Features Section */}
        <Box sx={{ bgcolor: 'grey.100', py: 8 }}>
          <Container maxWidth="lg">
            <Typography variant="h4" fontWeight={600} align="center" sx={{ mb: 6 }}>
              Why Choose Kayak?
            </Typography>
            <Grid container spacing={4}>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 2,
                    }}
                  >
                    <Search sx={{ fontSize: 40, color: 'white' }} />
                  </Box>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Search Hundreds of Sites
                  </Typography>
                  <Typography color="text.secondary">
                    Compare prices from hundreds of travel sites with one search
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 2,
                    }}
                  >
                    <SwapHoriz sx={{ fontSize: 40, color: 'white' }} />
                  </Box>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Best Price Guarantee
                  </Typography>
                  <Typography color="text.secondary">
                    Find the lowest prices on flights, hotels, and car rentals
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 2,
                    }}
                  >
                    <CalendarMonth sx={{ fontSize: 40, color: 'white' }} />
                  </Box>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Flexible Booking
                  </Typography>
                  <Typography color="text.secondary">
                    Free cancellation and flexible date options available
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Container>
        </Box>
      </Box>
    </LocalizationProvider>
  );
};

export default Home;

import React, { useState } from 'react';
import {
  Container,
  Paper,
  Tabs,
  Tab,
  Box,
  TextField,
  Button,
  Grid,
  Typography,
  Alert,
  MenuItem,
} from '@mui/material';
import { Flight, Hotel, DirectionsCar } from '@mui/icons-material';
import { listingsAPI } from '../services/api';

const Listings = () => {
  const [tab, setTab] = useState(0);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Flight Form
  const [flightData, setFlightData] = useState({
    flight_id: '',
    airline_name: '',
    departure_airport: '',
    arrival_airport: '',
    departure_datetime: '',
    arrival_datetime: '',
    duration: '',
    flight_class: 'Economy',
    ticket_price: '',
    total_seats: '',
    available_seats: '',
  });

  // Hotel Form
  const [hotelData, setHotelData] = useState({
    hotel_id: '',
    hotel_name: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    star_rating: '',
    total_rooms: '',
    available_rooms: '',
    room_type: '',
    price_per_night: '',
    amenities: '',
  });

  // Car Form
  const [carData, setCarData] = useState({
    car_id: '',
    car_type: '',
    company_name: '',
    model: '',
    year: '',
    transmission_type: 'Automatic',
    seats: '',
    daily_rental_price: '',
    availability_status: 'AVAILABLE',
  });

  const handleFlightSubmit = async (e) => {
    e.preventDefault();
    try {
      await listingsAPI.addFlight(flightData);
      setSuccess('Flight added successfully!');
      setError('');
      // Reset form
      setFlightData({
        flight_id: '',
        airline_name: '',
        departure_airport: '',
        arrival_airport: '',
        departure_datetime: '',
        arrival_datetime: '',
        duration: '',
        flight_class: 'Economy',
        ticket_price: '',
        total_seats: '',
        available_seats: '',
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add flight');
      setSuccess('');
    }
  };

  const handleHotelSubmit = async (e) => {
    e.preventDefault();
    try {
      const hotelPayload = {
        ...hotelData,
        amenities: hotelData.amenities.split(',').map((a) => a.trim()),
      };
      await listingsAPI.addHotel(hotelPayload);
      setSuccess('Hotel added successfully!');
      setError('');
      // Reset form
      setHotelData({
        hotel_id: '',
        hotel_name: '',
        address: '',
        city: '',
        state: '',
        zip_code: '',
        star_rating: '',
        total_rooms: '',
        available_rooms: '',
        room_type: '',
        price_per_night: '',
        amenities: '',
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add hotel');
      setSuccess('');
    }
  };

  const handleCarSubmit = async (e) => {
    e.preventDefault();
    try {
      await listingsAPI.addCar(carData);
      setSuccess('Car added successfully!');
      setError('');
      // Reset form
      setCarData({
        car_id: '',
        car_type: '',
        company_name: '',
        model: '',
        year: '',
        transmission_type: 'Automatic',
        seats: '',
        daily_rental_price: '',
        availability_status: 'AVAILABLE',
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add car');
      setSuccess('');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Manage Listings
      </Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper>
        <Tabs value={tab} onChange={(e, newValue) => setTab(newValue)}>
          <Tab icon={<Flight />} label="Add Flight" />
          <Tab icon={<Hotel />} label="Add Hotel" />
          <Tab icon={<DirectionsCar />} label="Add Car" />
        </Tabs>

        {/* Flight Form */}
        {tab === 0 && (
          <Box sx={{ p: 3 }}>
            <form onSubmit={handleFlightSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    required
                    fullWidth
                    label="Flight ID"
                    value={flightData.flight_id}
                    onChange={(e) =>
                      setFlightData({ ...flightData, flight_id: e.target.value })
                    }
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    required
                    fullWidth
                    label="Airline Name"
                    value={flightData.airline_name}
                    onChange={(e) =>
                      setFlightData({ ...flightData, airline_name: e.target.value })
                    }
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    required
                    fullWidth
                    label="Departure Airport"
                    value={flightData.departure_airport}
                    onChange={(e) =>
                      setFlightData({ ...flightData, departure_airport: e.target.value })
                    }
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    required
                    fullWidth
                    label="Arrival Airport"
                    value={flightData.arrival_airport}
                    onChange={(e) =>
                      setFlightData({ ...flightData, arrival_airport: e.target.value })
                    }
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    required
                    fullWidth
                    label="Departure Date & Time"
                    type="datetime-local"
                    InputLabelProps={{ shrink: true }}
                    value={flightData.departure_datetime}
                    onChange={(e) =>
                      setFlightData({ ...flightData, departure_datetime: e.target.value })
                    }
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    required
                    fullWidth
                    label="Arrival Date & Time"
                    type="datetime-local"
                    InputLabelProps={{ shrink: true }}
                    value={flightData.arrival_datetime}
                    onChange={(e) =>
                      setFlightData({ ...flightData, arrival_datetime: e.target.value })
                    }
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    required
                    fullWidth
                    label="Duration (minutes)"
                    type="number"
                    value={flightData.duration}
                    onChange={(e) =>
                      setFlightData({ ...flightData, duration: e.target.value })
                    }
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    required
                    fullWidth
                    select
                    label="Flight Class"
                    value={flightData.flight_class}
                    onChange={(e) =>
                      setFlightData({ ...flightData, flight_class: e.target.value })
                    }
                  >
                    <MenuItem value="Economy">Economy</MenuItem>
                    <MenuItem value="Business">Business</MenuItem>
                    <MenuItem value="First">First Class</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    required
                    fullWidth
                    label="Ticket Price"
                    type="number"
                    value={flightData.ticket_price}
                    onChange={(e) =>
                      setFlightData({ ...flightData, ticket_price: e.target.value })
                    }
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    required
                    fullWidth
                    label="Total Seats"
                    type="number"
                    value={flightData.total_seats}
                    onChange={(e) =>
                      setFlightData({ ...flightData, total_seats: e.target.value })
                    }
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    required
                    fullWidth
                    label="Available Seats"
                    type="number"
                    value={flightData.available_seats}
                    onChange={(e) =>
                      setFlightData({ ...flightData, available_seats: e.target.value })
                    }
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button type="submit" variant="contained" size="large" fullWidth>
                    Add Flight
                  </Button>
                </Grid>
              </Grid>
            </form>
          </Box>
        )}

        {/* Hotel Form */}
        {tab === 1 && (
          <Box sx={{ p: 3 }}>
            <form onSubmit={handleHotelSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    required
                    fullWidth
                    label="Hotel ID"
                    value={hotelData.hotel_id}
                    onChange={(e) =>
                      setHotelData({ ...hotelData, hotel_id: e.target.value })
                    }
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    required
                    fullWidth
                    label="Hotel Name"
                    value={hotelData.hotel_name}
                    onChange={(e) =>
                      setHotelData({ ...hotelData, hotel_name: e.target.value })
                    }
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    label="Address"
                    value={hotelData.address}
                    onChange={(e) =>
                      setHotelData({ ...hotelData, address: e.target.value })
                    }
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    required
                    fullWidth
                    label="City"
                    value={hotelData.city}
                    onChange={(e) => setHotelData({ ...hotelData, city: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    required
                    fullWidth
                    label="State"
                    value={hotelData.state}
                    onChange={(e) => setHotelData({ ...hotelData, state: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    required
                    fullWidth
                    label="ZIP Code"
                    value={hotelData.zip_code}
                    onChange={(e) =>
                      setHotelData({ ...hotelData, zip_code: e.target.value })
                    }
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    required
                    fullWidth
                    label="Star Rating"
                    type="number"
                    inputProps={{ min: 1, max: 5 }}
                    value={hotelData.star_rating}
                    onChange={(e) =>
                      setHotelData({ ...hotelData, star_rating: e.target.value })
                    }
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    required
                    fullWidth
                    label="Total Rooms"
                    type="number"
                    value={hotelData.total_rooms}
                    onChange={(e) =>
                      setHotelData({ ...hotelData, total_rooms: e.target.value })
                    }
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    required
                    fullWidth
                    label="Available Rooms"
                    type="number"
                    value={hotelData.available_rooms}
                    onChange={(e) =>
                      setHotelData({ ...hotelData, available_rooms: e.target.value })
                    }
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    required
                    fullWidth
                    label="Room Type"
                    value={hotelData.room_type}
                    onChange={(e) =>
                      setHotelData({ ...hotelData, room_type: e.target.value })
                    }
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    required
                    fullWidth
                    label="Price per Night"
                    type="number"
                    value={hotelData.price_per_night}
                    onChange={(e) =>
                      setHotelData({ ...hotelData, price_per_night: e.target.value })
                    }
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Amenities (comma-separated)"
                    placeholder="WiFi, Breakfast, Parking, Pool"
                    value={hotelData.amenities}
                    onChange={(e) =>
                      setHotelData({ ...hotelData, amenities: e.target.value })
                    }
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button type="submit" variant="contained" size="large" fullWidth>
                    Add Hotel
                  </Button>
                </Grid>
              </Grid>
            </form>
          </Box>
        )}

        {/* Car Form */}
        {tab === 2 && (
          <Box sx={{ p: 3 }}>
            <form onSubmit={handleCarSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    required
                    fullWidth
                    label="Car ID"
                    value={carData.car_id}
                    onChange={(e) => setCarData({ ...carData, car_id: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    required
                    fullWidth
                    label="Car Type"
                    value={carData.car_type}
                    onChange={(e) => setCarData({ ...carData, car_type: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    required
                    fullWidth
                    label="Company Name"
                    value={carData.company_name}
                    onChange={(e) =>
                      setCarData({ ...carData, company_name: e.target.value })
                    }
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    required
                    fullWidth
                    label="Model"
                    value={carData.model}
                    onChange={(e) => setCarData({ ...carData, model: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    required
                    fullWidth
                    label="Year"
                    type="number"
                    value={carData.year}
                    onChange={(e) => setCarData({ ...carData, year: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    required
                    fullWidth
                    select
                    label="Transmission Type"
                    value={carData.transmission_type}
                    onChange={(e) =>
                      setCarData({ ...carData, transmission_type: e.target.value })
                    }
                  >
                    <MenuItem value="Automatic">Automatic</MenuItem>
                    <MenuItem value="Manual">Manual</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    required
                    fullWidth
                    label="Number of Seats"
                    type="number"
                    value={carData.seats}
                    onChange={(e) => setCarData({ ...carData, seats: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    required
                    fullWidth
                    label="Daily Rental Price"
                    type="number"
                    value={carData.daily_rental_price}
                    onChange={(e) =>
                      setCarData({ ...carData, daily_rental_price: e.target.value })
                    }
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button type="submit" variant="contained" size="large" fullWidth>
                    Add Car
                  </Button>
                </Grid>
              </Grid>
            </form>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default Listings;

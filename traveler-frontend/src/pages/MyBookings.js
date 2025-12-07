import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Tabs,
  Tab,
  Alert,
} from '@mui/material';
import {
  Flight,
  Hotel,
  DirectionsCar,
  CalendarMonth,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { travelerAPI } from '../services/api';

const MyBookings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  const fetchBookings = async () => {
    try {
      const response = await travelerAPI.getUserBookings(user.user_id);
      if (response.data.success) {
        // Transform backend bookings to match frontend format
        const transformedBookings = response.data.data.map(b => ({
          id: b.booking_id,
          confirmationNumber: b.booking_id,
          type: b.booking_type.toLowerCase() + 's', // 'FLIGHT' -> 'flights'
          name: b.name || b.booking_id,
          from: b.departure_airport,
          to: b.arrival_airport,
          location: b.location,
          company: b.name,
          date: b.start_date,
          totalPrice: b.total_price,
          status: b.status.toLowerCase(),
        }));
        setBookings(transformedBookings);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  if (!user) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>Please sign in to view your bookings</Typography>
        <Button variant="contained" onClick={() => navigate('/login')}>Sign In</Button>
      </Container>
    );
  }

  const getIcon = (type) => {
    if (type === 'flights') return <Flight sx={{ color: 'primary.main' }} />;
    if (type === 'hotels') return <Hotel sx={{ color: 'primary.main' }} />;
    return <DirectionsCar sx={{ color: 'primary.main' }} />;
  };

  const getStatusColor = (status) => {
    if (status === 'confirmed') return 'success';
    if (status === 'pending') return 'warning';
    if (status === 'completed') return 'default';
    return 'error';
  };

  const now = new Date();
  const filteredBookings = tabValue === 0 
    ? bookings 
    : bookings.filter(b => {
        const bookingDate = new Date(b.date);
        return tabValue === 1 ? bookingDate >= now : bookingDate < now;
      });

  const handleCancelBooking = async (bookingId) => {
    if (window.confirm('Are you sure you want to cancel this booking?')) {
      try {
        const response = await travelerAPI.cancelBooking(bookingId);
        if (response.data.success) {
          // Refresh bookings
          fetchBookings();
        }
      } catch (error) {
        console.error('Error cancelling booking:', error);
        alert('Failed to cancel booking. Please try again.');
      }
    }
  };

  return (
    <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        <Typography variant="h4" fontWeight={600} sx={{ mb: 1 }}>
          My Bookings
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 4 }}>
          View and manage your travel reservations
        </Typography>

        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 4 }}>
          <Tab label={`All Bookings (${bookings.length})`} />
          <Tab label="Upcoming" />
          <Tab label="Past" />
        </Tabs>

        {bookings.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Alert severity="info" sx={{ mb: 3, maxWidth: 500, mx: 'auto' }}>
              You haven't made any bookings yet. Start exploring!
            </Alert>
            <Button variant="contained" onClick={() => navigate('/')} sx={{ mt: 2 }}>
              Search Flights, Hotels & Cars
            </Button>
          </Box>
        ) : filteredBookings.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary">No {tabValue === 1 ? 'upcoming' : 'past'} bookings</Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {filteredBookings.map((booking) => (
              <Grid item xs={12} key={booking.id}>
                <Card className="card-hover">
                  <CardContent>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={1}>
                        {getIcon(booking.type)}
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Typography variant="h6" fontWeight={600}>
                          {booking.name}
                        </Typography>
                        {booking.type === 'flights' && (
                          <Typography color="text.secondary">
                            {booking.from} → {booking.to}
                          </Typography>
                        )}
                        {booking.type === 'hotels' && (
                          <Typography color="text.secondary">
                            {booking.location}
                          </Typography>
                        )}
                        {booking.type === 'cars' && (
                          <Typography color="text.secondary">
                            {booking.company}
                          </Typography>
                        )}
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CalendarMonth fontSize="small" color="action" />
                          <Typography variant="body2">
                            {new Date(booking.date).toLocaleDateString()}
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          Confirmation: {booking.confirmationNumber}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <Chip
                          label={booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          color={getStatusColor(booking.status)}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} md={2} sx={{ textAlign: 'right' }}>
                        <Typography variant="h6" fontWeight={600} color="primary.main">
                          ${booking.totalPrice}
                        </Typography>
                        {booking.status === 'confirmed' && (
                          <Button 
                            size="small" 
                            color="error" 
                            onClick={() => handleCancelBooking(booking.id)}
                            sx={{ mt: 1 }}
                          >
                            Cancel
                          </Button>
                        )}
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  );
};

export default MyBookings;

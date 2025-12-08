import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  TextField,
  Button,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Divider,
  Alert,
  IconButton,
} from '@mui/material';
import {
  Flight,
  Hotel,
  DirectionsCar,
  Person,
  Payment,
  CheckCircle,
  Add,
  Remove,
  Warning,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { travelerAPI } from '../services/api';

const steps = ['Traveler Info', 'Payment', 'Confirmation'];

const Booking = () => {
  const { type, id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Determine actual booking type (handle bundle route)
  const location = window.location;
  const actualType = type || (location.pathname.includes('/bundle') ? 'bundle' : null);
  const actualId = id || 'bundle-1';
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [confirmationNumber, setConfirmationNumber] = useState('');
  const [bookingError, setBookingError] = useState('');
  
  // Get booking data from localStorage or URL params
  const storedBooking = JSON.parse(localStorage.getItem('currentBooking') || '{}');
  const providerName = searchParams.get('provider') || storedBooking.selectedProvider?.name || 'Direct';
  const providerPrice = parseInt(searchParams.get('price')) || storedBooking.selectedProvider?.price || 100;
  const initialPassengers = parseInt(searchParams.get('passengers')) || storedBooking.passengers || 1;
  
  const [passengers, setPassengers] = useState(initialPassengers);
  const [item, setItem] = useState(null);
  const [availableSeats, setAvailableSeats] = useState(100);
  
  // Load item data from backend API
  useEffect(() => {
    const fetchItem = async () => {
      setBookingError(''); // Clear any previous errors
      try {
        let foundItem = null;
        
        // Handle bundle bookings from AI Assistant
        if (actualType === 'bundle') {
          if (storedBooking && storedBooking.bundle) {
            const bundle = storedBooking.bundle;
            foundItem = {
              id: bundle.bundle_id || 'bundle-1',
              name: `${bundle.flight.airline} Flight + ${bundle.hotel.name}`,
              type: 'bundle',
              flight: {
                airline: bundle.flight.airline,
                from: bundle.flight.origin,
                to: bundle.flight.destination,
                price: bundle.flight.price,
                stops: bundle.flight.stops
              },
              hotel: {
                name: bundle.hotel.name,
                location: `${bundle.hotel.city}${bundle.hotel.neighbourhood ? ', ' + bundle.hotel.neighbourhood : ''}`,
                price: bundle.hotel.price_per_night,
                petFriendly: bundle.hotel.pet_friendly,
                hasBreakfast: bundle.hotel.has_breakfast,
                nearTransit: bundle.hotel.near_transit
              },
              price: bundle.total_price,
              fit_score: bundle.fit_score,
              why_this: bundle.why_this,
              what_to_watch: bundle.what_to_watch
            };
            setItem(foundItem);
            setBookingError('');
            return;
          } else {
            setBookingError('Bundle information not found. Please select a bundle from AI Assistant.');
            return;
          }
        }
        
        if (actualType === 'flights') {
          const response = await travelerAPI.getAllFlights();
          if (response.data.success) {
            const flight = response.data.data.find(f => f.flight_id === id);
            if (flight) {
              foundItem = {
                id: flight.flight_id,
                name: `${flight.airline_name} - ${flight.departure_airport} to ${flight.arrival_airport}`,
                airline: flight.airline_name,
                from: flight.departure_airport,
                to: flight.arrival_airport,
                price: parseFloat(flight.ticket_price),
                seatsAvailable: flight.available_seats
              };
              setAvailableSeats(flight.available_seats);
            }
          }
        } else if (actualType === 'hotels') {
          const response = await travelerAPI.getAllHotels();
          if (response.data.success) {
            const hotel = response.data.data.find(h => h.hotel_id === id);
            if (hotel) {
              foundItem = {
                id: hotel.hotel_id,
                name: hotel.hotel_name,
                location: `${hotel.city}, ${hotel.state}`,
                price: parseFloat(hotel.price_per_night),
                roomsAvailable: hotel.available_rooms
              };
              setAvailableSeats(hotel.available_rooms);
            }
          }
        } else if (actualType === 'cars') {
          const response = await travelerAPI.getAllCars();
          if (response.data.success) {
            const car = response.data.data.find(c => c.car_id === id);
            if (car) {
              foundItem = {
                id: car.car_id,
                name: `${car.company_name} - ${car.model}`,
                model: car.model,
                type: car.car_type,
                price: parseFloat(car.daily_rental_price),
                carsAvailable: car.availability_status === 'AVAILABLE' ? 10 : 0
              };
              setAvailableSeats(car.availability_status === 'AVAILABLE' ? 10 : 0);
            }
          }
        }
        
        // If not found in API, try stored booking
        if (!foundItem && storedBooking && storedBooking.id === id) {
          foundItem = storedBooking;
        }
        
        if (foundItem) {
          setItem(foundItem);
          setBookingError(''); // Clear error on success
        } else {
          // Only show error if we truly have no data
          setBookingError(`${type.slice(0, -1).charAt(0).toUpperCase() + type.slice(1, -1)} not found. Please search again.`);
        }
      } catch (error) {
        console.error('Error fetching item:', error);
        // Try fallback to stored booking
        if (storedBooking && storedBooking.id === id) {
          setItem(storedBooking);
          setBookingError(''); // Clear error if fallback works
        } else {
          setBookingError('Failed to load booking details. Please search again.');
        }
      }
    };
    fetchItem();
  }, [actualType, actualId]);

  // Additional travelers state
  const [additionalTravelers, setAdditionalTravelers] = useState([]);
  
  useEffect(() => {
    const newTravelers = [];
    for (let i = 1; i < passengers; i++) {
      newTravelers.push(additionalTravelers[i-1] || { firstName: '', lastName: '', email: '' });
    }
    setAdditionalTravelers(newTravelers);
  }, [passengers]);

  const [travelerInfo, setTravelerInfo] = useState({
    firstName: user?.first_name || '',
    lastName: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    ssn: user?.user_id || '',
  });

  // Sync traveler info with user data
  useEffect(() => {
    if (user) {
      setTravelerInfo({
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        ssn: user.user_id || '',
      });
    }
  }, [user]);

  const [paymentInfo, setPaymentInfo] = useState({
    cardNumber: '',
    expiry: '',
    cvv: '',
    nameOnCard: '',
  });

  const [errors, setErrors] = useState({});

  // Redirect to login if not authenticated
  if (!user) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          Please sign in to make a booking
        </Alert>
        <Button variant="contained" onClick={() => navigate('/login')}>
          Sign In
        </Button>
      </Container>
    );
  }

  const validatePhone = (phone) => {
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.length === 10;
  };

  const validateStep1 = () => {
    const newErrors = {};
    if (!travelerInfo.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!travelerInfo.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!travelerInfo.email.includes('@')) newErrors.email = 'Valid email is required';
    if (!validatePhone(travelerInfo.phone)) newErrors.phone = 'Phone must be 10 digits';
    // Validate additional travelers
    additionalTravelers.forEach((t, idx) => {
      if (!t.firstName.trim()) newErrors[`t${idx}fn`] = 'Required';
      if (!t.lastName.trim()) newErrors[`t${idx}ln`] = 'Required';
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    if (paymentInfo.cardNumber.replace(/\s/g, '').length < 16) newErrors.cardNumber = 'Enter valid card number';
    if (!paymentInfo.expiry.match(/^\d{2}\/\d{2}$/)) {
      newErrors.expiry = 'Use MM/YY format';
    } else {
      const [month] = paymentInfo.expiry.split('/');
      if (parseInt(month) < 1 || parseInt(month) > 12) newErrors.expiry = 'Month must be 01-12';
    }
    if (paymentInfo.cvv.length < 3) newErrors.cvv = 'Enter valid CVV';
    if (!paymentInfo.nameOnCard.trim()) newErrors.nameOnCard = 'Name on card is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const updateInventory = () => {
    if (actualType === 'flights') {
      const flights = JSON.parse(localStorage.getItem('flightsInventory') || '[]');
      const updated = flights.map(f => f.id === actualId ? { ...f, seatsAvailable: f.seatsAvailable - passengers } : f);
      localStorage.setItem('flightsInventory', JSON.stringify(updated));
    } else if (actualType === 'hotels') {
      const hotels = JSON.parse(localStorage.getItem('hotelsInventory') || '[]');
      const updated = hotels.map(h => h.id === actualId ? { ...h, roomsAvailable: h.roomsAvailable - 1 } : h);
      localStorage.setItem('hotelsInventory', JSON.stringify(updated));
    } else if (actualType === 'cars') {
      const cars = JSON.parse(localStorage.getItem('carsInventory') || '[]');
      const updated = cars.map(c => c.id === actualId ? { ...c, carsAvailable: c.carsAvailable - 1 } : c);
      localStorage.setItem('carsInventory', JSON.stringify(updated));
    }
    // Bundle bookings don't update inventory (handled by backend)
  };

  const handleNext = () => {
    setBookingError('');
    if (activeStep === 0 && !validateStep1()) return;
    if (activeStep === 1) {
      if (!validateStep2()) return;
      handleConfirm();
      return;
    }
    if (activeStep === steps.length - 1) {
      navigate('/my-bookings');
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
    setErrors({});
  };

  const handleConfirm = async () => {
    setLoading(true);
    setBookingError('');
    
    try {
      // Prepare booking data for backend
      let bookingType = 'BUNDLE';
      if (actualType === 'flights') bookingType = 'FLIGHT';
      else if (actualType === 'hotels') bookingType = 'HOTEL';
      else if (actualType === 'cars') bookingType = 'CAR';
      
      const bookingData = {
        user_id: user.user_id,
        booking_type: bookingType,
        reference_id: actualId || 'bundle-1',
        provider_name: providerName,
        start_date: new Date().toISOString().split('T')[0],
        end_date: actualType === 'hotels' || actualType === 'bundle' ? new Date(Date.now() + 86400000).toISOString().split('T')[0] : null,
        quantity: passengers,
        unit_price: providerPrice,
        total_price: getTotalPrice(),
        traveler_details: [
          { ...travelerInfo, isPrimary: true },
          ...additionalTravelers.map(t => ({ ...t, isPrimary: false }))
        ],
        special_requests: null
      };

      // Create booking via backend API
      const response = await travelerAPI.createBooking(bookingData);

      if (response.data.success) {
        const confNum = response.data.data.confirmation_number;
        setConfirmationNumber(confNum);
        
        // Reduce inventory in localStorage for immediate UI update
        updateInventory();

        setLoading(false);
        setActiveStep((prev) => prev + 1);
      } else {
        setBookingError(response.data.message || 'Booking failed');
        setLoading(false);
      }
    } catch (error) {
      console.error('Booking error:', error);
      if (error.response?.data?.message) {
        setBookingError(error.response.data.message);
      } else {
        setBookingError('Failed to create booking. Please try again.');
      }
      setLoading(false);
    }
  };

  const getIcon = () => {
    if (actualType === 'flights') return <Flight sx={{ fontSize: 40, color: 'primary.main' }} />;
    if (actualType === 'hotels') return <Hotel sx={{ fontSize: 40, color: 'primary.main' }} />;
    if (actualType === 'bundle') return <><Flight sx={{ fontSize: 30, color: 'primary.main' }} /><Hotel sx={{ fontSize: 30, color: 'primary.main' }} /></>;
    return <DirectionsCar sx={{ fontSize: 40, color: 'primary.main' }} />;
  };

  const getSubtotal = () => {
    if (actualType === 'flights') return providerPrice * passengers;
    if (actualType === 'bundle' && item) return item.price || providerPrice;
    return providerPrice;
  };

  const getTotalPrice = () => {
    const subtotal = getSubtotal();
    return subtotal + Math.round(subtotal * 0.1);
  };

  const updateAdditionalTraveler = (idx, field, value) => {
    const updated = [...additionalTravelers];
    updated[idx] = { ...updated[idx], [field]: value };
    setAdditionalTravelers(updated);
  };

  if (!item) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <Typography>Loading booking details...</Typography>
      </Container>
    );
  }

  const formatCardNumber = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiry = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 2) {
      // Validate month (01-12)
      let month = parseInt(digits.slice(0, 2));
      if (month < 1) month = '01';
      else if (month > 12) month = '12';
      else month = digits.slice(0, 2);
      return month + '/' + digits.slice(2);
    }
    return digits;
  };

  return (
    <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        <Typography variant="h4" fontWeight={600} sx={{ mb: 4 }}>
          Complete Your Booking
        </Typography>

        {bookingError && (
          <Alert severity="error" sx={{ mb: 3 }} icon={<Warning />}>
            {bookingError}
          </Alert>
        )}

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Grid container spacing={4}>
          {/* Main Content */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 4 }}>
              {/* Step 1: Traveler Info */}
              {activeStep === 0 && (
                <>
                  {/* Passenger Count for Flights */}
                  {actualType === 'flights' && (
                    <Box sx={{ mb: 4, p: 2, bgcolor: 'grey.100', borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="h6" fontWeight={600}>Passengers</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <IconButton onClick={() => setPassengers(Math.max(1, passengers - 1))} disabled={passengers <= 1} color="primary">
                            <Remove />
                          </IconButton>
                          <Typography variant="h5" fontWeight={600}>{passengers}</Typography>
                          <IconButton onClick={() => setPassengers(passengers + 1)} disabled={passengers >= availableSeats || passengers >= 9} color="primary">
                            <Add />
                          </IconButton>
                        </Box>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {availableSeats} seats available
                      </Typography>
                      {passengers > availableSeats && (
                        <Alert severity="error" sx={{ mt: 1 }}>Not enough seats!</Alert>
                      )}
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Person color="primary" />
                    <Typography variant="h6" fontWeight={600}>Primary Traveler</Typography>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField fullWidth label="First Name" value={travelerInfo.firstName} onChange={(e) => setTravelerInfo({ ...travelerInfo, firstName: e.target.value })} required error={!!errors.firstName} helperText={errors.firstName} />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField fullWidth label="Last Name" value={travelerInfo.lastName} onChange={(e) => setTravelerInfo({ ...travelerInfo, lastName: e.target.value })} required error={!!errors.lastName} helperText={errors.lastName} />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField fullWidth label="Email" type="email" value={travelerInfo.email} onChange={(e) => setTravelerInfo({ ...travelerInfo, email: e.target.value })} required error={!!errors.email} helperText={errors.email} />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField fullWidth label="Phone Number" value={travelerInfo.phone} onChange={(e) => setTravelerInfo({ ...travelerInfo, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} required error={!!errors.phone} helperText={errors.phone || '10 digits'} />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField 
                        fullWidth 
                        label="SSN" 
                        value={travelerInfo.ssn} 
                        disabled
                        helperText="From your profile"
                      />
                    </Grid>
                  </Grid>
                  
                  {/* Additional Travelers */}
                  {additionalTravelers.map((t, idx) => (
                    <Box key={idx} sx={{ mt: 4 }}>
                      <Divider sx={{ mb: 3 }} />
                      <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Passenger {idx + 2}</Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <TextField fullWidth label="First Name" value={t.firstName} onChange={(e) => updateAdditionalTraveler(idx, 'firstName', e.target.value)} required error={!!errors[`t${idx}fn`]} />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField fullWidth label="Last Name" value={t.lastName} onChange={(e) => updateAdditionalTraveler(idx, 'lastName', e.target.value)} required error={!!errors[`t${idx}ln`]} />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField fullWidth label="Email (optional)" value={t.email} onChange={(e) => updateAdditionalTraveler(idx, 'email', e.target.value)} />
                        </Grid>
                      </Grid>
                    </Box>
                  ))}
                </>
              )}

              {/* Step 2: Payment */}
              {activeStep === 1 && (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Payment color="primary" />
                    <Typography variant="h6" fontWeight={600}>Payment Details</Typography>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Card Number"
                        placeholder="1234 5678 9012 3456"
                        value={paymentInfo.cardNumber}
                        onChange={(e) => setPaymentInfo({ ...paymentInfo, cardNumber: formatCardNumber(e.target.value) })}
                        required
                        error={!!errors.cardNumber}
                        helperText={errors.cardNumber}
                        inputProps={{ maxLength: 19 }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Expiry Date"
                        placeholder="MM/YY"
                        value={paymentInfo.expiry}
                        onChange={(e) => setPaymentInfo({ ...paymentInfo, expiry: formatExpiry(e.target.value) })}
                        required
                        error={!!errors.expiry}
                        helperText={errors.expiry}
                        inputProps={{ maxLength: 5 }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="CVV"
                        placeholder="123"
                        value={paymentInfo.cvv}
                        onChange={(e) => setPaymentInfo({ ...paymentInfo, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                        required
                        error={!!errors.cvv}
                        helperText={errors.cvv}
                        inputProps={{ maxLength: 4 }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Name on Card"
                        value={paymentInfo.nameOnCard}
                        onChange={(e) => setPaymentInfo({ ...paymentInfo, nameOnCard: e.target.value })}
                        required
                        error={!!errors.nameOnCard}
                        helperText={errors.nameOnCard}
                      />
                    </Grid>
                  </Grid>
                  <Alert severity="info" sx={{ mt: 2 }}>
                    For demo: Use any valid card format (e.g., 4111 1111 1111 1111)
                  </Alert>
                </>
              )}

              {/* Step 3: Confirmation */}
              {activeStep === 2 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
                  <Typography variant="h5" fontWeight={600} gutterBottom>
                    Booking Confirmed!
                  </Typography>
                  <Typography color="text.secondary" sx={{ mb: 3 }}>
                    Your confirmation number is <strong>{confirmationNumber}</strong>
                  </Typography>
                  <Typography color="text.secondary">
                    A confirmation email has been sent to {travelerInfo.email}
                  </Typography>
                  <Alert severity="success" sx={{ mt: 3, maxWidth: 400, mx: 'auto' }}>
                    This booking is saved to your account: {user.email}
                  </Alert>
                </Box>
              )}

              {/* Navigation Buttons */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                <Button
                  disabled={activeStep === 0}
                  onClick={handleBack}
                  variant="outlined"
                >
                  Back
                </Button>
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={loading || (actualType === 'flights' && passengers > availableSeats)}
                >
                  {loading 
                    ? 'Processing...' 
                    : activeStep === 1 
                      ? `Pay $${getTotalPrice()}` 
                      : activeStep === steps.length - 1 
                        ? 'View My Bookings' 
                        : 'Continue'
                  }
                </Button>
              </Box>
            </Paper>
          </Grid>

          {/* Order Summary */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  {getIcon()}
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      {item?.name || item?.airline || item?.type}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">via {providerName}</Typography>
                  </Box>
                </Box>
                <Divider sx={{ my: 2 }} />
                
                {actualType === 'flights' && (
                  <>
                    <Typography color="text.secondary">Flight</Typography>
                    <Typography fontWeight={500} gutterBottom>{item?.flightNumber}</Typography>
                    <Typography color="text.secondary">Route</Typography>
                    <Typography fontWeight={500} gutterBottom>{item?.from} → {item?.to}</Typography>
                    <Typography color="text.secondary">Passengers</Typography>
                    <Typography fontWeight={500} gutterBottom>{passengers}</Typography>
                    <Typography color="text.secondary">Seats After Booking</Typography>
                    <Typography fontWeight={500} color={availableSeats - passengers > 10 ? 'success.main' : 'warning.main'} gutterBottom>{availableSeats - passengers}</Typography>
                  </>
                )}
                
                {actualType === 'hotels' && (
                  <>
                    <Typography color="text.secondary">Location</Typography>
                    <Typography fontWeight={500} gutterBottom>{item?.location}</Typography>
                    <Typography color="text.secondary">Rooms Available</Typography>
                    <Typography fontWeight={500} gutterBottom>{item?.roomsAvailable}</Typography>
                  </>
                )}
                
                {actualType === 'cars' && (
                  <>
                    <Typography color="text.secondary">Vehicle</Typography>
                    <Typography fontWeight={500} gutterBottom>{item?.model}</Typography>
                    <Typography color="text.secondary">Available</Typography>
                    <Typography fontWeight={500} gutterBottom>{item?.carsAvailable}</Typography>
                  </>
                )}
                
                {actualType === 'bundle' && item && (
                  <>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 600, mb: 1 }}>
                        ✈️ Flight
                      </Typography>
                      <Typography color="text.secondary">Airline</Typography>
                      <Typography fontWeight={500}>{item.flight.airline}</Typography>
                      <Typography color="text.secondary">Route</Typography>
                      <Typography fontWeight={500} gutterBottom>{item.flight.from} → {item.flight.to}</Typography>
                      <Typography color="text.secondary">Stops</Typography>
                      <Typography fontWeight={500} gutterBottom>{item.flight.stops}</Typography>
                    </Box>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 600, mb: 1 }}>
                        🏨 Hotel
                      </Typography>
                      <Typography color="text.secondary">Name</Typography>
                      <Typography fontWeight={500}>{item.hotel.name}</Typography>
                      <Typography color="text.secondary">Location</Typography>
                      <Typography fontWeight={500} gutterBottom>{item.hotel.location}</Typography>
                      {item.hotel.petFriendly && (
                        <Typography variant="caption" sx={{ display: 'block', color: 'success.main' }}>
                          🐾 Pet Friendly
                        </Typography>
                      )}
                      {item.hotel.hasBreakfast && (
                        <Typography variant="caption" sx={{ display: 'block', color: 'success.main' }}>
                          🍳 Breakfast Included
                        </Typography>
                      )}
                    </Box>
                    
                    {item.fit_score && (
                      <Box sx={{ mb: 2, p: 1.5, bgcolor: 'primary.light', borderRadius: 1 }}>
                        <Typography variant="caption" color="white" sx={{ fontWeight: 600 }}>
                          Match Score: {item.fit_score}%
                        </Typography>
                      </Box>
                    )}
                    
                    {item.why_this && (
                      <Alert severity="info" sx={{ mb: 1 }}>
                        <Typography variant="caption">
                          💡 {item.why_this}
                        </Typography>
                      </Alert>
                    )}
                  </>
                )}

                <Divider sx={{ my: 2 }} />
                
                {actualType === 'flights' ? (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography>${providerPrice} × {passengers}</Typography>
                    <Typography>${providerPrice * passengers}</Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography>Subtotal</Typography>
                    <Typography>${providerPrice}</Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Taxes & Fees (10%)</Typography>
                  <Typography>${Math.round(getSubtotal() * 0.1)}</Typography>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6" fontWeight={600}>Total</Typography>
                  <Typography variant="h6" fontWeight={600} color="primary.main">
                    ${getTotalPrice()}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
            
            {/* Logged in user info */}
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Booking as:
                </Typography>
                <Typography fontWeight={500}>
                  {user.first_name} {user.last_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {user.email}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Booking;

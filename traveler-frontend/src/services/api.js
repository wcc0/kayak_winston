import axios from 'axios';

const API_BASE_URL = (process.env.REACT_APP_API_BASE || 'http://localhost:5001') + '/api/admin';
const TRAVELER_API_BASE_URL = (process.env.REACT_APP_API_BASE || 'http://localhost:5001') + '/api/traveler';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const travelerApi = axios.create({
  baseURL: TRAVELER_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Listings APIs (public endpoints)
export const listingsAPI = {
  getAllFlights: (params) => api.get('/listings/flights', { params }),
  getAllHotels: (params) => api.get('/listings/hotels', { params }),
  getAllCars: (params) => api.get('/listings/cars', { params }),
  // Images (public reads)
  getHotelImages: (hotelId) => api.get(`/listings/hotel/${hotelId}/images`),
  getCarImages: (carId) => api.get(`/listings/car/${carId}/images`),
};

// Traveler APIs (user registration, login, bookings)
export const travelerAPI = {
  register: (userData) => travelerApi.post('/register', userData),
  login: (credentials) => travelerApi.post('/login', credentials),
  createBooking: (bookingData) => travelerApi.post('/bookings', bookingData),
  getUserBookings: (userId) => travelerApi.get(`/bookings/${userId}`),
  cancelBooking: (bookingId) => travelerApi.put(`/bookings/${bookingId}/cancel`),
  // Listings access for travelers
  getAllFlights: (params) => api.get('/listings/flights', { params }),
  getAllHotels: (params) => api.get('/listings/hotels', { params }),
  getAllCars: (params) => api.get('/listings/cars', { params }),
  // Reviews
  createReview: (payload) => travelerApi.post('/reviews', payload),
  getReviewsByListing: (listingType, listingId) => travelerApi.get(`/reviews/${listingType}/${listingId}`),
  getReviewsByUser: (userId) => travelerApi.get(`/reviews/user/${userId}`),
};

export default api;

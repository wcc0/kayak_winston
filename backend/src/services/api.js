import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001/api/admin';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  verifyToken: () => api.get('/auth/verify'),
};

// Listings APIs
export const listingsAPI = {
  addFlight: (data) => api.post('/listings/flight', data),
  addHotel: (data) => api.post('/listings/hotel', data),
  addCar: (data) => api.post('/listings/car', data),
  search: (type, keyword) => api.get(`/listings/search?type=${type}&keyword=${keyword}`),
};

// Users APIs
export const usersAPI = {
  getAll: (page = 1, limit = 50) => api.get(`/users?page=${page}&limit=${limit}`),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

// Billing APIs
export const billingAPI = {
  getAll: (page = 1, limit = 50) => api.get(`/billing?page=${page}&limit=${limit}`),
  getById: (id) => api.get(`/billing/${id}`),
  search: (params) => api.get('/billing/search', { params }),
  getStats: (year) => api.get(`/billing/stats?year=${year}`),
};

// Analytics APIs
export const analyticsAPI = {
  topProperties: (year) => api.get(`/analytics/revenue/top-properties?year=${year}`),
  cityRevenue: (year) => api.get(`/analytics/revenue/by-city?year=${year}`),
  topProviders: (year, month) => api.get(`/analytics/providers/top-performers?year=${year}&month=${month}`),
  pageClicks: (startDate, endDate) => api.get(`/analytics/page-clicks?startDate=${startDate}&endDate=${endDate}`),
  listingClicks: (type) => api.get(`/analytics/listing-clicks?type=${type}`),
  userTracking: (params) => api.get('/analytics/user-tracking', { params }),
};

export default api;

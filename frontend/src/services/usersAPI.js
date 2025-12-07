import axios from 'axios';

const api = axios.create({ baseURL: process.env.REACT_APP_API_BASE || 'http://localhost:5001' });

// Attach user JWT (if present) to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default {
  register: (payload) => api.post('/api/users', payload),
  login: (payload) => api.post('/api/users/login', payload),
  getProfile: (userId) => api.get(`/api/users/${encodeURIComponent(userId)}`),
  updateProfile: (userId, payload) => api.put(`/api/users/${encodeURIComponent(userId)}`, payload),
  updateProfileMultipart: (userId, formData) => api.put(`/api/users/${encodeURIComponent(userId)}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deleteProfile: (userId) => api.delete(`/api/users/${encodeURIComponent(userId)}`),
  createBooking: (userId, payload) => api.post(`/api/users/${encodeURIComponent(userId)}/bookings`, payload),
  getBookings: (userId, params) => api.get(`/api/users/${encodeURIComponent(userId)}/bookings`, { params }),
};

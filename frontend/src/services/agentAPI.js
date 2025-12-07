// Agent API Service for Concierge and Deals agents
import axios from 'axios';

// Agent endpoints
export const CONCIERGE_URL = process.env.REACT_APP_CONCIERGE_URL || 'http://127.0.0.1:8002';
export const DEALS_URL = process.env.REACT_APP_DEALS_URL || 'http://127.0.0.1:8003';

// Concierge Agent Client
export const conciergeAPI = {
  // Health check
  health: () => axios.get(`${CONCIERGE_URL}/health`),
  
  // Get trip bundles
  getBundles: (origin, destination, hotelLocation, numNights) => 
    axios.post(`${CONCIERGE_URL}/bundles`, {
      origin,
      destination,
      hotel_location: hotelLocation,
      num_nights: numNights,
    }),
  
  // Chat with LLM
  chat: (sessionId, message) =>
    axios.post(`${CONCIERGE_URL}/chat`, {
      session_id: sessionId,
      message,
    }),
  
  // Get policy answer
  getPolicy: (bundleId, question) =>
    axios.post(`${CONCIERGE_URL}/policy?bundle_id=${bundleId}&question=${encodeURIComponent(question)}`),
  
  // Set price watch alert
  setWatch: (sessionId, bundleId, alertType, threshold) =>
    axios.post(`${CONCIERGE_URL}/watch`, {
      session_id: sessionId,
      bundle_id: bundleId,
      alert_type: alertType,
      threshold,
    }),
  
  // Seed test data
  seedData: () => axios.post(`${CONCIERGE_URL}/seed`),
};

// Deals Agent Client
export const dealsAPI = {
  // Health check
  health: () => axios.get(`${DEALS_URL}/agent/health`),
  
  // Get scheduler stats
  getStats: () => axios.get(`${DEALS_URL}/stats`),
  
  // Normalize a record
  normalize: (record) =>
    axios.post(`${DEALS_URL}/agent/normalize`, record),
  
  // Ingest and process a record
  ingest: (record, persist = true) =>
    axios.post(`${DEALS_URL}/agent/ingest?persist=${persist}`, record),
  
  // Process record through pipeline
  process: (record) =>
    axios.post(`${DEALS_URL}/agent/process`, record),
};

// Utility function to check system health
export const checkSystemHealth = async () => {
  try {
    const [conciergeHealth, dealsHealth] = await Promise.all([
      conciergeAPI.health(),
      dealsAPI.health(),
    ]);
    return {
      concierge: conciergeHealth.data?.status === 'ok',
      deals: dealsHealth.data?.status === 'ok',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Health check failed:', error);
    return {
      concierge: false,
      deals: false,
      error: error.message,
    };
  }
};

export default {
  conciergeAPI,
  dealsAPI,
  checkSystemHealth,
};

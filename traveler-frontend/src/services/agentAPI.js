/**
 * Agent API Service Layer
 * Centralized client for FastAPI microservices:
 * - Concierge Agent (8002): Chat, bundles, policy
 * - Deals Agent (8003): Real-time deals, data ingestion
 */

const CONCIERGE_URL = process.env.REACT_APP_CONCIERGE_URL || 'http://127.0.0.1:8002';
const DEALS_URL = process.env.REACT_APP_DEALS_URL || 'http://127.0.0.1:8003';

// ==========================================
// CONCIERGE AGENT (Port 8002)
// ==========================================

export const conciergeAPI = {
  /**
   * Health check
   */
  health: async () => {
    const res = await fetch(`${CONCIERGE_URL}/health`);
    if (!res.ok) throw new Error('Concierge health check failed');
    return res.json();
  },

  /**
   * Get trip bundles matching criteria
   * @param {Object} params - { origin, destination, departure_date, return_date, budget, travelers, constraints }
   */
  getBundles: async (params) => {
    const res = await fetch(`${CONCIERGE_URL}/bundles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('Failed to fetch bundles');
    return res.json();
  },

  /**
   * Chat with Concierge AI
   * Uses LLM (llama3.2) to extract intent and recommend bundles
   */
  chat: async (sessionId, message) => {
    const res = await fetch(`${CONCIERGE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        message: message,
      }),
    });
    if (!res.ok) throw new Error('Chat failed');
    return res.json();
  },

  /**
   * Get policy/constraint answers
   */
  getPolicy: async (question) => {
    const res = await fetch(`${CONCIERGE_URL}/policy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: question }),
    });
    if (!res.ok) throw new Error('Policy query failed');
    return res.json();
  },

  /**
   * Set price watch alert
   */
  setWatch: async (origin, destination, alertPrice) => {
    const res = await fetch(`${CONCIERGE_URL}/watch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin,
        destination,
        alert_price: alertPrice,
      }),
    });
    if (!res.ok) throw new Error('Watch alert failed');
    return res.json();
  },

  /**
   * Seed test data
   */
  seedData: async () => {
    const res = await fetch(`${CONCIERGE_URL}/seed`, { method: 'POST' });
    if (!res.ok) throw new Error('Seed failed');
    return res.json();
  },
};

// ==========================================
// DEALS AGENT (Port 8003)
// ==========================================

export const dealsAPI = {
  /**
   * Health check
   */
  health: async () => {
    const res = await fetch(`${DEALS_URL}/agent/health`);
    if (!res.ok) throw new Error('Deals health check failed');
    return res.json();
  },

  /**
   * Get agent statistics
   */
  getStats: async () => {
    const res = await fetch(`${DEALS_URL}/stats`);
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  },

  /**
   * Normalize a deal record with LLM tags (optional)
   */
  normalize: async (dealData, enableLLM = false) => {
    const res = await fetch(`${DEALS_URL}/agent/normalize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deal: dealData,
        enable_llm: enableLLM,
      }),
    });
    if (!res.ok) throw new Error('Normalize failed');
    return res.json();
  },

  /**
   * Trigger ingestion (import Kaggle data)
   */
  ingest: async () => {
    const res = await fetch(`${DEALS_URL}/agent/ingest`, { method: 'POST' });
    if (!res.ok) throw new Error('Ingest failed');
    return res.json();
  },

  /**
   * Process deals through pipeline
   */
  process: async () => {
    const res = await fetch(`${DEALS_URL}/agent/process`, { method: 'POST' });
    if (!res.ok) throw new Error('Process failed');
    return res.json();
  },
};

// ==========================================
// SYSTEM UTILITIES
// ==========================================

/**
 * Check overall system health
 */
export const checkSystemHealth = async () => {
  try {
    const [conciergeHealth, dealsHealth] = await Promise.all([
      conciergeAPI.health().catch(() => ({ status: 'down' })),
      dealsAPI.health().catch(() => ({ status: 'down' })),
    ]);

    return {
      concierge: conciergeHealth.status === 'healthy' ? 'up' : 'down',
      deals: dealsHealth.status === 'healthy' ? 'up' : 'down',
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.error('System health check failed:', err);
    return {
      concierge: 'down',
      deals: 'down',
      error: err.message,
    };
  }
};

/**
 * Connect to Concierge WebSocket for real-time events
 */
export const connectToConciergeEvents = (onMessage, onError) => {
  try {
    const wsUrl = CONCIERGE_URL.replace('http', 'ws') + '/events';
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('✅ Connected to Concierge events');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      if (onError) onError(err);
    };

    ws.onclose = () => {
      console.log('⚠️ Concierge events disconnected');
    };

    return ws;
  } catch (err) {
    console.error('Failed to connect to Concierge events:', err);
    if (onError) onError(err);
    return null;
  }
};

export default {
  conciergeAPI,
  dealsAPI,
  checkSystemHealth,
  connectToConciergeEvents,
};

const AIChat = require('../models/AIChat');

const createSession = async (req, res, next) => {
  try {
    const { chat_id, title } = req.body || {};
    const id = chat_id || `chat_${Date.now()}`;
    const result = await AIChat.createSession(id, title || `Chat ${new Date().toISOString()}`);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

const listSessions = async (req, res, next) => {
  try {
    const { limit, offset } = req.query;
    const rows = await AIChat.listSessions(limit || 50, offset || 0);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

const addMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, content } = req.body || {};
    if (!id || !role || !content) return res.status(400).json({ success: false, message: 'missing parameters' });
    await AIChat.addMessage(id, role, content);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

const getMessages = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { limit, offset } = req.query;
    if (!id) return res.status(400).json({ success: false, message: 'missing id' });
    const rows = await AIChat.getMessages(id, limit || 100, offset || 0);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

// Persist user message, forward to configured AI (LLAMA/concierge), persist bot reply, return reply
const messageAndReply = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content } = req.body || {};
    if (!id || !content) return res.status(400).json({ success: false, message: 'missing parameters' });

    // persist user message
    await AIChat.addMessage(id, 'user', content);

    // Determine AI endpoint: prefer LLAMA_URL, fall back to CONCIERGE_AI_URL
    const axios = require('axios');
    const LLAMA_URL = process.env.LLAMA_URL || process.env.CONCIERGE_AI_URL || 'http://127.0.0.1:8002/chat';

    let replyText = null;
    try {
      // forward request to AI; expect JSON reply { reply: '...' } or { message: '...' }
      const resp = await axios.post(LLAMA_URL, { session_id: id, message: content }, { timeout: 20000 });
      if (resp && resp.data) {
        replyText = resp.data.reply || resp.data.response || resp.data.message || (typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data));
      }
    } catch (e) {
      console.warn('AI call failed', e.message || e.toString());
      // fallback reply
      replyText = 'Sorry — AI service currently unavailable.';
    }

    // persist bot reply
    await AIChat.addMessage(id, 'bot', replyText);

    res.json({ success: true, reply: replyText });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createSession,
  listSessions,
  addMessage,
  getMessages,
  messageAndReply,
};




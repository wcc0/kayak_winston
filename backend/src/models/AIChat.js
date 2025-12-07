const { mysqlPool } = require('../config/database');

const AIChat = {
  createSession: async (chat_id, title) => {
    const id = chat_id || `chat_${Date.now()}`;
    await mysqlPool.execute(
      `INSERT INTO ai_chat_sessions (chat_id, title) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE title = VALUES(title)`,
      [id, title || null]
    );
    return { chat_id: id, title: title || null };
  },

  listSessions: async (limit = 50, offset = 0) => {
    const [rows] = await mysqlPool.execute(
      `SELECT chat_id, title, created_at FROM ai_chat_sessions ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [Number(limit), Number(offset)]
    );
    return rows;
  },

  addMessage: async (chat_id, role, content) => {
    await mysqlPool.execute(
      `INSERT INTO ai_chat_messages (chat_id, role, content) VALUES (?, ?, ?)`,
      [chat_id, role, content]
    );
    return true;
  },

  getMessages: async (chat_id, limit = 100, offset = 0) => {
    const [rows] = await mysqlPool.execute(
      `SELECT id, role, content, created_at FROM ai_chat_messages WHERE chat_id = ? ORDER BY created_at ASC LIMIT ? OFFSET ?`,
      [chat_id, Number(limit), Number(offset)]
    );
    return rows;
  }
};

module.exports = AIChat;

#!/usr/bin/env node
const { mysqlPool } = require('../src/config/database');

async function run() {
  try {
    console.log('Creating ai_chat_sessions table (if not exists)...');
    await mysqlPool.execute(`
      CREATE TABLE IF NOT EXISTS ai_chat_sessions (
        chat_id VARCHAR(128) NOT NULL PRIMARY KEY,
        title VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    console.log('Creating ai_chat_messages table (if not exists)...');
    await mysqlPool.execute(`
      CREATE TABLE IF NOT EXISTS ai_chat_messages (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        chat_id VARCHAR(128) NOT NULL,
        role VARCHAR(32) NOT NULL,
        content TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX (chat_id),
        CONSTRAINT fk_ai_chat_session FOREIGN KEY (chat_id) REFERENCES ai_chat_sessions(chat_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    console.log('Migration complete.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message || err);
    process.exit(2);
  }
}

run();

const { query } = require('../database/pool');

async function ensureSchema() {
  // Create conversations table
  await query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student_id INT NOT NULL,
      facilitator_id INT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_conv_pair (student_id, facilitator_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Create conversation messages table
  await query(`
    CREATE TABLE IF NOT EXISTS conversation_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      conversation_id INT NOT NULL,
      sender_id INT NOT NULL,
      sender_role VARCHAR(30) NOT NULL,
      content LONGTEXT NOT NULL,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_conv_id (conversation_id),
      CONSTRAINT fk_conv_msg_conv FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

async function getOrCreateConversation(studentId, facilitatorId) {
  const rows = await query('SELECT * FROM conversations WHERE student_id = ? AND facilitator_id = ? LIMIT 1', [studentId, facilitatorId]);
  if (rows.length) return rows[0];

  const res = await query('INSERT INTO conversations (student_id, facilitator_id) VALUES (?, ?)', [studentId, facilitatorId]);
  const newRows = await query('SELECT * FROM conversations WHERE id = ?', [res.insertId]);
  return newRows[0];
}

async function getConversationsForUser(userId, role, limit = 50, offset = 0) {
  if (role === 'student') {
    const sql = `
      SELECT c.id, c.student_id, c.facilitator_id, f.name AS facilitator_name,
        (SELECT content FROM conversation_messages m WHERE m.conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
        (SELECT COUNT(*) FROM conversation_messages m WHERE m.conversation_id = c.id AND m.is_read = FALSE AND m.sender_role <> 'student') AS unread_count
      FROM conversations c
      LEFT JOIN facilitators f ON f.id = c.facilitator_id
      WHERE c.student_id = ?
      ORDER BY c.updated_at DESC
      LIMIT ? OFFSET ?
    `;
    return await query(sql, [userId, limit, offset]);
  }

  // facilitator
  const sql = `
    SELECT c.id, c.student_id, c.facilitator_id, s.name AS student_name,
      (SELECT content FROM conversation_messages m WHERE m.conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
      (SELECT COUNT(*) FROM conversation_messages m WHERE m.conversation_id = c.id AND m.is_read = FALSE AND m.sender_role = 'student') AS unread_count
    FROM conversations c
    LEFT JOIN students s ON s.id = c.student_id
    WHERE c.facilitator_id = ?
    ORDER BY c.updated_at DESC
    LIMIT ? OFFSET ?
  `;
  return await query(sql, [userId, limit, offset]);
}

async function getMessages(conversationId, limit = 100, offset = 0) {
  const sql = `
    SELECT id, conversation_id, sender_id, sender_role, content, is_read, created_at
    FROM conversation_messages
    WHERE conversation_id = ?
    ORDER BY created_at ASC
    LIMIT ? OFFSET ?
  `;
  return await query(sql, [conversationId, limit, offset]);
}

async function createMessage(conversationId, senderId, senderRole, content) {
  const res = await query('INSERT INTO conversation_messages (conversation_id, sender_id, sender_role, content) VALUES (?, ?, ?, ?)', [conversationId, senderId, senderRole, content]);
  // Update conversation updated_at
  await query('UPDATE conversations SET updated_at = NOW() WHERE id = ?', [conversationId]);
  const rows = await query('SELECT * FROM conversation_messages WHERE id = ?', [res.insertId]);
  return rows[0];
}

module.exports = {
  ensureSchema,
  getOrCreateConversation,
  getConversationsForUser,
  getMessages,
  createMessage
};

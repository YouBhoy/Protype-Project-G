const { query } = require('../database/pool');

async function saveMessage(data) {
  const { sender_id, receiver_id, room_id, message } = data;
  const sql = `
    INSERT INTO messages (sender_id, receiver_id, room_id, message, is_read, created_at)
    VALUES (?, ?, ?, ?, FALSE, NOW())
  `;
  return await query(sql, [sender_id, receiver_id, room_id, message]);
}

async function getMessageHistory(roomId, limit = 50, offset = 0) {
  const sql = `
    SELECT id, sender_id, receiver_id, message, is_read, created_at
    FROM messages
    WHERE room_id = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `;
  const results = await query(sql, [roomId, limit, offset]);
  return results.reverse(); // Return in chronological order
}

async function getUnreadCount(userId) {
  const sql = `
    SELECT COUNT(*) as unread_count
    FROM messages
    WHERE receiver_id = ? AND is_read = FALSE
  `;
  const results = await query(sql, [userId]);
  return results[0]?.unread_count || 0;
}

async function getUnreadCountByRoom(roomId, userId) {
  const sql = `
    SELECT COUNT(*) as unread_count
    FROM messages
    WHERE room_id = ? AND receiver_id = ? AND is_read = FALSE
  `;
  const results = await query(sql, [roomId, userId]);
  return results[0]?.unread_count || 0;
}

async function markMessagesAsRead(messageIds) {
  if (!Array.isArray(messageIds) || messageIds.length === 0) {
    return;
  }
  const placeholders = messageIds.map(() => '?').join(',');
  const sql = `
    UPDATE messages
    SET is_read = TRUE
    WHERE id IN (${placeholders})
  `;
  return await query(sql, messageIds);
}

async function getConversationListForFacilitator(facilitatorId, limit = 20, offset = 0) {
  const sql = `
    SELECT DISTINCT
      m.sender_id as student_id,
      u.first_name,
      u.last_name,
      u.email,
      (SELECT COUNT(*) FROM messages 
       WHERE room_id = m.room_id AND receiver_id = ? AND is_read = FALSE) as unread_count,
      MAX(m.created_at) as last_message_time,
      (SELECT message FROM messages 
       WHERE room_id = m.room_id ORDER BY created_at DESC LIMIT 1) as last_message
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.receiver_id = ? OR m.sender_id = ?
    GROUP BY m.sender_id
    ORDER BY last_message_time DESC
    LIMIT ? OFFSET ?
  `;
  return await query(sql, [facilitatorId, facilitatorId, facilitatorId, limit, offset]);
}

async function getRoomId(studentId, facilitatorId) {
  return `chat_${Math.min(studentId, facilitatorId)}_${Math.max(studentId, facilitatorId)}`;
}

module.exports = {
  saveMessage,
  getMessageHistory,
  getUnreadCount,
  getUnreadCountByRoom,
  markMessagesAsRead,
  getConversationListForFacilitator,
  getRoomId
};

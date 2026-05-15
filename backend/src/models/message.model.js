const { query } = require('../database/pool');

function splitFullName(fullName) {
  const normalized = String(fullName || '').trim();

  if (!normalized) {
    return { firstName: '', lastName: '' };
  }

  const parts = normalized.split(/\s+/);

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ')
  };
}

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
    SELECT
      id,
      sender_id AS senderId,
      receiver_id AS receiverId,
      message,
      is_read AS isRead,
      created_at AS createdAt
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
  const rows = await query(
    `SELECT
       id,
       room_id,
       sender_id,
       receiver_id,
       message,
       is_read,
       created_at,
       CASE
         WHEN sender_id = ? THEN receiver_id
         ELSE sender_id
       END AS student_id
     FROM messages
     WHERE sender_id = ? OR receiver_id = ?
     ORDER BY created_at DESC`,
    [facilitatorId, facilitatorId, facilitatorId]
  );

  // Proceed even if there are no message rows so that we can
  // fall back to returning assigned students when no conversations exist.

  const grouped = new Map();

  for (const row of rows) {
    const studentId = Number(row.student_id);
    const roomId = row.room_id;
    const key = `${studentId}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        room_id: roomId,
        student_id: studentId,
        last_message_time: row.created_at,
        unread_count: 0,
        last_message: row.message || ''
      });
    }

    const conversation = grouped.get(key);
    if (!conversation.last_message_time) {
      conversation.last_message_time = row.created_at;
      conversation.room_id = roomId;
      conversation.last_message = row.message || '';
    }
    if (row.receiver_id === facilitatorId && !row.is_read) {
      conversation.unread_count += 1;
    }
  }

  const summaries = [...grouped.values()].sort((left, right) => {
    const leftTime = new Date(left.last_message_time).getTime();
    const rightTime = new Date(right.last_message_time).getTime();
    return rightTime - leftTime;
  }).slice(offset, offset + limit);
  let studentIds = [...new Set(summaries.map((row) => Number(row.student_id)).filter(Number.isFinite))];

  // If no message-based conversations exist, return students assigned to the facilitator's college
  if (studentIds.length === 0) {
    // Expect facilitatorId to be provided in the outer scope arguments; if not, caller should fall back elsewhere
    const facilitatorRows = await query('SELECT assigned_college FROM facilitators WHERE id = ?', [facilitatorId]);
    const assignedCollege = facilitatorRows[0]?.assigned_college || null;

    if (assignedCollege) {
      const students = await query(
        `SELECT id, name, email FROM students WHERE college = ? ORDER BY id ASC LIMIT ? OFFSET ?`,
        [assignedCollege, limit, offset]
      );

      return students.map((student) => {
        const fullName = student?.name || 'Student';
        const { firstName, lastName } = splitFullName(fullName);
        return {
          student_id: Number(student.id),
          student_name: fullName,
          first_name: firstName,
          last_name: lastName,
          email: student?.email || '',
          unread_count: 0,
          last_message_time: null,
          last_message: ''
        };
      });
    }
  }

  const placeholders = studentIds.map(() => '?').join(', ');
  const studentRows = placeholders
    ? await query(
        `SELECT id, name, email FROM students WHERE id IN (${placeholders})`,
        studentIds
      )
    : [];
  const studentById = new Map(studentRows.map((student) => [Number(student.id), student]));

  return summaries.map((row) => {
    const student = studentById.get(Number(row.student_id)) || null;
    const fullName = student?.name || 'Student';
    const { firstName, lastName } = splitFullName(fullName);

    return {
      student_id: Number(row.student_id),
      student_name: fullName,
      first_name: firstName,
      last_name: lastName,
      email: student?.email || '',
      unread_count: Number(row.unread_count) || 0,
      last_message_time: row.last_message_time,
      last_message: row.last_message || ''
    };
  });
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

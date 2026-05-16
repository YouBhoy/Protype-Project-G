const jwt = require('jsonwebtoken');
const env = require('../config/env');
const messageModel = require('../models/message.model');
const conversationModel = require('../models/conversation.model');

// Store active users: { userId: socketId }
const activeUsers = {};
let ioRef = null;

function setupChatSocket(io) {
  ioRef = io;

  // Middleware for Socket.io authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error: no token provided'));
      }

      const decoded = jwt.verify(token, env.jwtSecret);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch (error) {
      next(new Error('Authentication error: invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User ${socket.userId} connected with socket ${socket.id}`);
    activeUsers[socket.userId] = socket.id;

    // Emit user online status
    io.emit('user_online', { userId: socket.userId, status: 'online' });

    // Join room event
    socket.on('join_room', (data) => {
      const { studentId, facilitatorId } = data;
      
      // Create room ID (always in ascending order for consistency)
      const roomId = `chat_${Math.min(studentId, facilitatorId)}_${Math.max(
        studentId,
        facilitatorId
      )}`;

      socket.join(roomId);
      console.log(`User ${socket.userId} joined room ${roomId}`);

      // Notify the other user that this user is in the room
      socket.emit('room_joined', { roomId, userId: socket.userId });
    });

    // Send message event
    socket.on('send_message', async (data) => {
      try {
        const { roomId, receiverId, message } = data;
        const senderId = socket.userId;

        // Save message to legacy messages table for compatibility
        const savedMessage = await messageModel.saveMessage({
          sender_id: senderId,
          receiver_id: receiverId,
          room_id: roomId,
          message
        });

        // Also persist into conversations / conversation_messages
        // Parse roomId expecting format chat_{min}_{max}
        const parts = String(roomId || '').split('_');
        let conv = null;
        if (parts.length === 3 && parts[0] === 'chat') {
          const a = Number(parts[1]);
          const b = Number(parts[2]);
          // determine student/facilitator by roles: if socket.userRole === 'student' then studentId=socket.userId else choose other
          let studentId = a;
          let facilitatorId = b;
          // If both numeric, ensure mapping: if sender role is facilitator and senderId equals a, swap
          if (socket.userRole === 'student') {
            studentId = socket.userId;
            facilitatorId = (socket.userId === a) ? b : a;
          } else if (socket.userRole === 'ogc' || socket.userRole === 'facilitator') {
            facilitatorId = socket.userId;
            studentId = (socket.userId === a) ? b : a;
          }

          try {
            conv = await conversationModel.getOrCreateConversation(studentId, facilitatorId);
            await conversationModel.createMessage(conv.id, senderId, socket.userRole === 'ogc' ? 'facilitator' : socket.userRole, message);
          } catch (err) {
            console.warn('Failed to save conversation message:', err.message || err);
          }
        }

        // Emit message to room
        io.to(roomId).emit('receive_message', {
          id: savedMessage.insertId,
          senderId,
          receiverId,
          message,
          createdAt: new Date().toISOString(),
          isRead: false,
          roomId,
          conversationId: conv ? conv.id : null
        });
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('message_error', { error: 'Failed to send message' });
      }
    });

    // Typing indicator event
    socket.on('typing', (data) => {
      const { roomId, isTyping } = data;
      socket.to(roomId).emit('typing_indicator', {
        userId: socket.userId,
        isTyping
      });
    });

    // Mark messages as read
    socket.on('message_read', async (data) => {
      try {
        const { roomId, messageIds } = data;
        await messageModel.markMessagesAsRead(messageIds);

        // Notify sender that messages were read
        socket.to(roomId).emit('messages_read', {
          messageIds,
          readBy: socket.userId
        });
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });

    // Disconnect event
    socket.on('disconnect', () => {
      console.log(`User ${socket.userId} disconnected`);
      delete activeUsers[socket.userId];

      // Emit user offline status
      io.emit('user_offline', { userId: socket.userId, status: 'offline' });
    });
  });
}

function emitAppointmentUpdate(payload) {
  if (ioRef) {
    ioRef.emit('appointment_updated', payload);
  }
}

module.exports = setupChatSocket;
module.exports.emitAppointmentUpdate = emitAppointmentUpdate;

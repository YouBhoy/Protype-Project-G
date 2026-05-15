const jwt = require('jsonwebtoken');
const env = require('../config/env');
const messageModel = require('../models/message.model');

// Store active users: { userId: socketId }
const activeUsers = {};

function setupChatSocket(io) {
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
        let { roomId, receiverId, message } = data;
        const senderId = Number(socket.userId);
        receiverId = Number(receiverId);

        // If client mistakenly sent receiver equal to sender, try to infer the other participant from the roomId
        if (receiverId === senderId && typeof roomId === 'string') {
          const parts = roomId.split('_');
          if (parts.length === 3) {
            const a = Number(parts[1]);
            const b = Number(parts[2]);
            receiverId = a === senderId ? b : a;
          }
        }

        // Save message to database
        const savedMessage = await messageModel.saveMessage({
          sender_id: senderId,
          receiver_id: receiverId,
          room_id: roomId,
          message
        });

        // Log what was saved for debugging
        console.log('Saved message', {
          id: savedMessage.insertId,
          senderId,
          receiverId,
          roomId,
          message
        });

        // Emit message to room
        io.to(roomId).emit('receive_message', {
          id: savedMessage.insertId,
          senderId,
          receiverId,
          message,
          createdAt: new Date().toISOString(),
          isRead: false,
          roomId
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

module.exports = setupChatSocket;

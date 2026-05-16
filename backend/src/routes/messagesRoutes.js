const express = require('express');
const { authenticate } = require('../middleware/auth');
const messageModel = require('../models/message.model');
const { query } = require('../database/pool');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// Get assigned facilitator for a student
router.get(
  '/assigned-facilitator',
  authenticate,
  asyncHandler(async (req, res) => {
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        error: 'only_students_allowed',
        message: 'Only students can query assigned facilitator'
      });
    }

    const studentId = req.user.id;
    // Try to determine student's college from token or DB
    const college = req.user.college || null;

    if (!college) {
      return res.status(404).json({ success: false, message: 'Student college not available' });
    }

    // Find a facilitator assigned to the student's college
    const rows = await query('SELECT id, name, email, assigned_college AS assignedCollege FROM facilitators WHERE assigned_college = ? LIMIT 1', [college]);

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'No facilitator assigned for your college' });
    }

    const facilitator = rows[0];
    res.json({ success: true, facilitator });
  })
);

// Get message history for a room (JWT protected)
router.get(
  '/history/:roomId',
  authenticate,
  asyncHandler(async (req, res) => {
    const { roomId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const messages = await messageModel.getMessageHistory(
      roomId,
      parseInt(limit, 10),
      parseInt(offset, 10)
    );

    res.json({
      success: true,
      data: messages,
      count: messages.length
    });
  })
);

// Get unread message count for current user
router.get(
  '/unread/total',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const unreadCount = await messageModel.getUnreadCount(userId);

    res.json({
      success: true,
      unreadCount
    });
  })
);

// Get unread count for a specific room
router.get(
  '/unread/:roomId',
  authenticate,
  asyncHandler(async (req, res) => {
    const { roomId } = req.params;
    const userId = req.user.id;

    const unreadCount = await messageModel.getUnreadCountByRoom(roomId, userId);

    res.json({
      success: true,
      unreadCount
    });
  })
);

// Get conversation list for facilitator
router.get(
  '/conversations',
  authenticate,
  asyncHandler(async (req, res) => {
    if (req.user.role !== 'ogc') {
      return res.status(403).json({
        success: false,
        error: 'only_facilitators_allowed',
        message: 'Only OGC facilitators can view conversations'
      });
    }

    const facilitatorId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;

    const conversations = await messageModel.getConversationListForFacilitator(
      facilitatorId,
      parseInt(limit, 10),
      parseInt(offset, 10)
    );

    res.json({
      success: true,
      data: conversations,
      count: conversations.length
    });
  })
);

// Mark messages as read
router.post(
  '/mark-read',
  authenticate,
  asyncHandler(async (req, res) => {
    const { messageIds } = req.body;

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'invalid_request',
        message: 'messageIds must be a non-empty array'
      });
    }

    await messageModel.markMessagesAsRead(messageIds);

    res.json({
      success: true,
      message: 'Messages marked as read',
      markedCount: messageIds.length
    });
  })
);

// Conversation endpoints using the new conversation model
const conversationModel = require('../models/conversation.model');

// Get conversations for the authenticated user
router.get(
  '/conversations/list',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const role = req.user.role;
    const { limit = 50, offset = 0 } = req.query;
    const conv = await conversationModel.getConversationsForUser(userId, role, parseInt(limit, 10), parseInt(offset, 10));
    res.json({ success: true, data: conv, count: conv.length });
  })
);

// Create a new conversation between student and facilitator
router.post(
  '/conversations',
  authenticate,
  asyncHandler(async (req, res) => {
    const { studentId, facilitatorId } = req.body;
    if (!studentId || !facilitatorId) {
      return res.status(400).json({ success: false, message: 'studentId and facilitatorId are required' });
    }
    const conv = await conversationModel.getOrCreateConversation(parseInt(studentId, 10), parseInt(facilitatorId, 10));
    res.json({ success: true, data: conv });
  })
);

// Student can request assignment; try to find facilitator by student's college and create conversation
router.post(
  '/request-assignment',
  authenticate,
  asyncHandler(async (req, res) => {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Only students may request assignment' });
    }
    const studentId = req.user.id;
    const college = req.user.college || null;
    if (!college) return res.status(400).json({ success: false, message: 'Student college not available' });

    const rows = await query('SELECT id, name, email, assigned_college AS assignedCollege FROM facilitators WHERE assigned_college = ? LIMIT 1', [college]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'No facilitator available for your college' });

    const facilitator = rows[0];
    const conv = await conversationModel.getOrCreateConversation(studentId, facilitator.id);
    res.json({ success: true, facilitator, conversation: conv });
  })
);

// Get messages for a conversation
router.get(
  '/conversations/:conversationId/messages',
  authenticate,
  asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const { limit = 100, offset = 0 } = req.query;
    const msgs = await conversationModel.getMessages(parseInt(conversationId, 10), parseInt(limit, 10), parseInt(offset, 10));
    res.json({ success: true, data: msgs, count: msgs.length });
  })
);

// Post a message to a conversation
router.post(
  '/conversations/:conversationId/messages',
  authenticate,
  asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ success: false, message: 'Message content required' });
    }
    const senderId = req.user.id;
    const senderRole = req.user.role === 'ogc' ? 'facilitator' : req.user.role;
    const msg = await conversationModel.createMessage(parseInt(conversationId, 10), senderId, senderRole, content);
    res.json({ success: true, data: msg });
  })
);

module.exports = router;


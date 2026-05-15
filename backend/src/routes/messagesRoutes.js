const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');
const { query } = require('../database/pool');
const messageModel = require('../models/message.model');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

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

// Get the facilitator assigned to the current student
router.get(
  '/assigned-facilitator',
  authenticate,
  requireRole('student'),
  asyncHandler(async (req, res) => {
    const studentRows = await query('SELECT college FROM students WHERE id = ?', [req.user.id]);
    const studentCollege = studentRows[0]?.college || req.user.college || '';

    let rows = [];

    if (studentCollege) {
      rows = await query(
        `SELECT f.id, f.name, f.email, f.assigned_college AS assignedCollege
         FROM facilitators f
         WHERE f.assigned_college = ?
         ORDER BY f.id ASC
         LIMIT 1`,
        [studentCollege]
      );
    }

    if (!rows.length) {
      rows = await query(
        `SELECT id, name, email, assigned_college AS assignedCollege
         FROM facilitators
         ORDER BY id ASC
         LIMIT 1`
      );
    }

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: 'Assigned facilitator not found'
      });
    }

    res.json({
      success: true,
      facilitator: rows[0]
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

module.exports = router;

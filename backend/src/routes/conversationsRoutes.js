const express = require('express');
const { authenticate } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const conversationModel = require('../models/conversation.model');

const router = express.Router();

// GET /api/conversations/:userId
router.get(
  '/:userId',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = Number(req.params.userId);
    if (!userId || userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden conversation access' });
    }
    const role = req.user.role;
    const data = await conversationModel.getConversationsForUser(userId, role);
    res.json({ success: true, data, count: data.length });
  })
);

// POST /api/conversations
router.post(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const { studentId, facilitatorId } = req.body;
    if (!studentId || !facilitatorId) {
      return res.status(400).json({ success: false, message: 'studentId and facilitatorId are required' });
    }
    const data = await conversationModel.getOrCreateConversation(Number(studentId), Number(facilitatorId));
    res.json({ success: true, data });
  })
);

// GET /api/conversations/:conversationId/messages
router.get(
  '/:conversationId/messages',
  authenticate,
  asyncHandler(async (req, res) => {
    const conversationId = Number(req.params.conversationId);
    const data = await conversationModel.getMessages(conversationId);
    res.json({ success: true, data, count: data.length });
  })
);

// POST /api/conversations/:conversationId/messages
router.post(
  '/:conversationId/messages',
  authenticate,
  asyncHandler(async (req, res) => {
    const conversationId = Number(req.params.conversationId);
    const content = String(req.body?.content || '').trim();
    if (!content) {
      return res.status(400).json({ success: false, message: 'Message content required' });
    }
    const senderRole = req.user.role === 'ogc' ? 'facilitator' : 'student';
    const data = await conversationModel.createMessage(conversationId, req.user.id, senderRole, content);
    res.json({ success: true, data });
  })
);

module.exports = router;

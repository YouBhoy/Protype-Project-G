# SPARTAN-G Real-Time Chat System - Setup Guide

## Overview
This guide provides step-by-step instructions for implementing the real-time chat system between students and OGC facilitators using Socket.io.

## Phase 1: Backend Setup

### Step 1.1: Install Socket.io Dependency
```bash
cd backend
npm install socket.io@4.7.2
```

### Step 1.2: Create Database Table
Run the migration SQL to create the messages table:
```sql
-- Run this in your MySQL client (e.g., phpMyAdmin)
-- Located in: database/migrations_messages.sql
```

Or via terminal:
```bash
mysql -u root -p your_database_name < database/migrations_messages.sql
```

### Step 1.3: Verify Backend Files
The following files have been created/modified:
- ✅ `backend/src/server.js` - Updated to use HTTP server with Socket.io
- ✅ `backend/src/app.js` - Updated to include messages routes
- ✅ `backend/src/sockets/chat.socket.js` - Socket.io event handlers
- ✅ `backend/src/models/message.model.js` - Database queries for messages
- ✅ `backend/src/routes/messagesRoutes.js` - REST API endpoints
- ✅ `database/migrations_messages.sql` - Messages table schema

### Step 1.4: Backend Routes Documentation
New REST endpoints available (all JWT protected):

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/messages/history/:roomId` | Get message history for a conversation |
| GET | `/api/messages/unread/total` | Get total unread message count |
| GET | `/api/messages/unread/:roomId` | Get unread count for a specific room |
| GET | `/api/messages/conversations` | Get conversation list (facilitators only) |
| POST | `/api/messages/mark-read` | Mark messages as read |

### Step 1.5: Socket.io Events
The backend listens for these Socket.io events:

**Client → Server:**
- `join_room` - Join a chat room
  ```javascript
  socket.emit('join_room', { studentId, facilitatorId })
  ```
- `send_message` - Send a message
  ```javascript
  socket.emit('send_message', { roomId, receiverId, message })
  ```
- `typing` - Send typing indicator
  ```javascript
  socket.emit('typing', { roomId, isTyping: true/false })
  ```
- `message_read` - Mark messages as read
  ```javascript
  socket.emit('message_read', { roomId, messageIds: [1, 2, 3] })
  ```

**Server → Client:**
- `receive_message` - Receive incoming message
- `typing_indicator` - Receive typing indicator
- `messages_read` - Notification that messages were read
- `user_online` - User came online
- `user_offline` - User went offline

## Phase 2: Frontend Setup

### Step 2.1: Install Socket.io Client Dependency
```bash
cd frontend
npm install socket.io-client@4.7.2
```

### Step 2.2: Environment Configuration
Ensure your `.env` or `vite.config.js` has:
```javascript
// In frontend/vite.config.js or .env
VITE_API_URL=http://localhost:4000
```

### Step 2.3: Verify Frontend Files
The following files have been created:
- ✅ `frontend/src/socket.js` - Socket.io singleton
- ✅ `frontend/src/components/ChatPanel.jsx` - Chat UI component
- ✅ `frontend/src/components/ChatPanel.css` - Chat styles
- ✅ `frontend/src/components/ChatButton.jsx` - Floating chat button
- ✅ `frontend/src/components/ChatButton.css` - Button styles
- ✅ `frontend/src/components/ConversationList.jsx` - Conversation list for facilitators
- ✅ `frontend/src/components/ConversationList.css` - List styles

### Step 2.4: Updated Pages
- ✅ `frontend/src/pages/StudentDashboardPage.jsx` - Added chat button and panel
- ✅ `frontend/src/pages/FacilitatorDashboardPage.jsx` - Added conversation list and chat

## Phase 3: Database Configuration

### Step 3.1: Create Messages Table
Execute the migration file:

```bash
# From project root
mysql -u root -p your_db_name < database/migrations_messages.sql
```

**Table Structure:**
```sql
CREATE TABLE messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sender_id INT NOT NULL,
  receiver_id INT NOT NULL,
  room_id VARCHAR(100) NOT NULL,
  message LONGTEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id),
  FOREIGN KEY (receiver_id) REFERENCES users(id),
  INDEX idx_room_id (room_id),
  INDEX idx_receiver_id (receiver_id),
  INDEX idx_sender_id (sender_id),
  INDEX idx_created_at (created_at),
  INDEX idx_is_read (is_read)
);
```

## Phase 4: Integration Notes

### Backend Integration:
1. The socket system uses your existing JWT authentication
2. CORS is configured to accept requests from `http://localhost:5173`
3. All existing routes continue to work unchanged
4. Helmet and CORS middleware remain intact

### Frontend Integration:
1. Socket is initialized automatically when user logs in
2. `ChatPanel` component handles all chat UI
3. `ChatButton` provides quick access to chat
4. `ConversationList` shows all active conversations for facilitators
5. Real-time updates via Socket.io events

### Authentication Flow:
1. User logs in via existing auth system
2. JWT token is stored in `localStorage` as `spartang_token`
3. Socket connects using the stored JWT token
4. Socket authenticates using the token via `socket.handshake.auth`

## Phase 5: Testing the System

### Step 5.1: Start Both Servers
```bash
# From project root
./start-spartang.bat
```

This will start:
- Backend on `http://localhost:4000`
- Frontend on `http://localhost:5173`

### Step 5.2: Test Student Chat
1. Log in as a student
2. Go to Student Dashboard
3. Click the blue chat button (bottom-right)
4. Type and send a message
5. Message should appear in ChatPanel

### Step 5.3: Test Facilitator Chat
1. Log in as a facilitator
2. Go to Facilitator Dashboard
3. See conversation list with students
4. Click on a student to start chatting
5. Send and receive messages in real-time

### Step 5.4: Test Real-Time Features
1. Open two browser windows (one student, one facilitator)
2. Send message from student side
3. Should appear instantly on facilitator side
4. Test typing indicator
5. Test read receipts

## Common Issues & Troubleshooting

### Issue: Socket Connection Failed
**Solution:** 
- Check backend is running on port 4000
- Verify CORS is configured correctly
- Check JWT token is valid
- Check browser console for errors

### Issue: Messages Not Sending
**Solution:**
- Verify MySQL connection works
- Check user IDs are correct
- Look at backend console for error logs
- Ensure messages table exists

### Issue: Real-Time Updates Not Working
**Solution:**
- Check Socket.io connection in browser DevTools
- Verify both backend and frontend servers are running
- Clear browser cache and refresh
- Check for port conflicts

### Issue: Styling Looks Off
**Solution:**
- Ensure all CSS files are imported correctly
- Check that z-index doesn't conflict with other elements
- Verify viewport settings in HTML

## Important Notes

### Room ID Format
- Room IDs are generated as: `chat_${min(studentId, facilitatorId)}_${max(studentId, facilitatorId)}`
- This ensures consistency regardless of who initiates the chat

### Message History
- Messages are persisted in MySQL database
- History is loaded when ChatPanel opens
- Last 50 messages fetched by default

### Facilitator Student Assignment
**TODO:** Update the following based on your implementation:
1. In `StudentDashboardPage.jsx`, the `getFacilitatorId()` function needs to be updated to fetch the actual assigned facilitator
2. Add an API endpoint to get assigned facilitator for a student
3. Update to use actual facilitator data instead of placeholder ID `1`

### User ID Verification
Ensure that:
- `user.id` is available in `AuthContext` after login
- Message senders/receivers use consistent user IDs from database
- JWT token includes `id` and `role` claims

## Next Steps for Customization

1. **Add File/Image Sharing** - Extend message model to support attachments
2. **Add Message Search** - Implement search functionality
3. **Add Archive/Delete** - Add message management features
4. **Add Notifications** - Add browser push notifications for new messages
5. **Add Message Status** - Add typing indicators and delivery status
6. **Add Block/Report** - Add user safety features

## Files Summary

### Backend
| File | Purpose |
|------|---------|
| `server.js` | HTTP server with Socket.io attachment |
| `app.js` | Express app with messages routes |
| `sockets/chat.socket.js` | Socket.io event handlers |
| `models/message.model.js` | Database queries |
| `routes/messagesRoutes.js` | REST API endpoints |

### Frontend
| File | Purpose |
|------|---------|
| `socket.js` | Socket.io singleton instance |
| `components/ChatPanel.jsx` | Main chat UI |
| `components/ChatPanel.css` | Chat styling |
| `components/ChatButton.jsx` | Floating button |
| `components/ChatButton.css` | Button styling |
| `components/ConversationList.jsx` | Facilitator conversation list |
| `components/ConversationList.css` | List styling |
| `pages/StudentDashboardPage.jsx` | Student dashboard with chat |
| `pages/FacilitatorDashboardPage.jsx` | Facilitator dashboard with chat |

### Database
| File | Purpose |
|------|---------|
| `database/migrations_messages.sql` | Messages table schema |

---

**Last Updated:** May 15, 2026
**Chat System Version:** 1.0.0

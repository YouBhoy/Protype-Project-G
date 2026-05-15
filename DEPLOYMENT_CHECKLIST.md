# SPARTAN-G Chat System - Pre-Deployment Checklist

## ✅ Pre-Deployment Verification Checklist

Use this checklist to verify everything is configured correctly before deploying the chat system.

---

## Backend Setup

- [ ] **Dependencies Installed**
  ```bash
  cd backend && npm install socket.io@4.7.2
  ```
  Run: `npm list socket.io` to verify

- [ ] **Database Table Created**
  ```bash
  mysql -u root -p your_database < database/migrations_messages.sql
  ```
  Verify in phpMyAdmin: `messages` table exists with all columns and indexes

- [ ] **server.js Updated**
  - [ ] Imports `http`, `Server`, and `setupChatSocket`
  - [ ] Creates `httpServer` with `http.createServer(app)`
  - [ ] Creates `io` with proper CORS config
  - [ ] Calls `setupChatSocket(io)`
  - [ ] Uses `httpServer.listen()` instead of `app.listen()`

- [ ] **app.js Updated**
  - [ ] Imports `messagesRoutes`
  - [ ] Mounts at `/api/messages`

- [ ] **Files Present**
  - [ ] `backend/src/sockets/chat.socket.js` (created)
  - [ ] `backend/src/models/message.model.js` (created)
  - [ ] `backend/src/routes/messagesRoutes.js` (created)
  - [ ] `database/migrations_messages.sql` (created)

- [ ] **Existing Features Not Broken**
  - [ ] `npm run dev` starts without errors
  - [ ] Health check: `curl http://localhost:4000/api/health`
  - [ ] Existing auth routes still work

---

## Frontend Setup

- [ ] **Dependencies Installed**
  ```bash
  cd frontend && npm install socket.io-client@4.7.2
  ```
  Run: `npm list socket.io-client` to verify

- [ ] **Environment Variables**
  - [ ] `VITE_API_URL` set to `http://localhost:4000` (or appropriate URL)
  - [ ] Verify in vite.config.js or .env

- [ ] **Files Present**
  - [ ] `frontend/src/socket.js` (created)
  - [ ] `frontend/src/components/ChatPanel.jsx` (created)
  - [ ] `frontend/src/components/ChatPanel.css` (created)
  - [ ] `frontend/src/components/ChatButton.jsx` (created)
  - [ ] `frontend/src/components/ChatButton.css` (created)
  - [ ] `frontend/src/components/ConversationList.jsx` (created)
  - [ ] `frontend/src/components/ConversationList.css` (created)

- [ ] **Pages Updated**
  - [ ] `StudentDashboardPage.jsx` imports and uses ChatButton & ChatPanel
  - [ ] `FacilitatorDashboardPage.jsx` imports and uses ConversationList, ChatButton & ChatPanel
  - [ ] Both pages initialize socket on mount

- [ ] **Existing Features Not Broken**
  - [ ] `npm run dev` starts without errors
  - [ ] Login page still works
  - [ ] Dashboard pages load without console errors

---

## Integration Testing

### Start Both Servers
- [ ] Run `./start-spartang.bat`
  - [ ] Backend window shows: `SPARTAN-G API listening on port 4000`
  - [ ] Frontend window shows: Vite dev server running on port 5173

### Student Chat Flow
- [ ] Open `http://localhost:5173`
- [ ] Log in as a student
- [ ] Go to Student Dashboard
- [ ] See blue chat button in bottom-right corner
- [ ] Click chat button → ChatPanel slides in from right
- [ ] Type a message and click Send
- [ ] Message appears with timestamp in ChatPanel
- [ ] Check browser DevTools Network tab for WebSocket connection
- [ ] Check browser DevTools Console for errors (should be none)

### Facilitator Chat Flow
- [ ] Open second browser tab
- [ ] Log in as facilitator (different account/browser tab)
- [ ] Go to Facilitator Dashboard
- [ ] See "Messages" section with conversation list
- [ ] See student name in list (if student sent message)
- [ ] Click on student → ChatPanel opens
- [ ] Receive message sent by student in real-time
- [ ] Type reply and send
- [ ] Verify student receives message instantly

### Real-Time Testing
- [ ] Open three browser windows:
  - Browser 1: Student A logged in
  - Browser 2: Facilitator logged in
  - Browser 3: Student B logged in
  
- [ ] Student A sends message to Facilitator
- [ ] Facilitator receives instantly (no page refresh needed)
- [ ] Facilitator sends reply to Student A
- [ ] Student A receives instantly
- [ ] Student B tries to send message to same Facilitator
- [ ] Facilitator sees both students in conversation list

### Feature Testing

#### Typing Indicator
- [ ] Student types in input field
- [ ] Facilitator sees "..." animation while typing
- [ ] Student stops typing
- [ ] Typing indicator disappears after ~1 second

#### Read Receipts
- [ ] Student sends message
- [ ] Shows ✓ (one check) initially
- [ ] Facilitator opens chat or views message
- [ ] Student side updates to ✓✓ (two checks)

#### Message History
- [ ] Student has existing messages in database
- [ ] Open ChatPanel
- [ ] Load previous messages
- [ ] Scroll up to see full history
- [ ] Messages in correct chronological order

#### Unread Badges
- [ ] Facilitator has unread messages
- [ ] ConversationList shows badge with count
- [ ] Click student to open chat
- [ ] Mark messages as read
- [ ] Badge disappears from conversation list

#### Responsive Design
- [ ] Resize browser window to mobile size
- [ ] ChatPanel adjusts to smaller screen
- [ ] All buttons still clickable
- [ ] Text readable
- [ ] Chat input works properly

---

## Database Verification

```sql
-- Run these queries to verify database setup

-- Check messages table exists
SHOW TABLES LIKE 'messages';

-- Check table structure
DESCRIBE messages;

-- Check indexes
SHOW INDEX FROM messages;

-- Verify sample message was saved (after sending one)
SELECT * FROM messages LIMIT 1;

-- Check foreign keys
SELECT * FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
WHERE TABLE_NAME = 'messages';
```

---

## Common Issues & Fixes

### Issue: "Cannot find module 'socket.io'"
**Fix:** Run `npm install socket.io@4.7.2` in backend directory

### Issue: "Cannot find module 'socket.io-client'"
**Fix:** Run `npm install socket.io-client@4.7.2` in frontend directory

### Issue: WebSocket connection fails
**Fix:**
- [ ] Check backend is running on port 4000
- [ ] Check CORS is configured in server.js
- [ ] Verify JWT token is valid
- [ ] Check firewall isn't blocking port 4000

### Issue: Messages not persisting
**Fix:**
- [ ] Verify MySQL connection works: `npm run dev` should show "MySQL connection verified"
- [ ] Verify messages table exists
- [ ] Check user IDs are correct in database

### Issue: Chat button doesn't appear
**Fix:**
- [ ] Check ChatButton component is imported in StudentDashboardPage
- [ ] Check ChatPanel.css and ChatButton.css are loaded
- [ ] Open DevTools → Elements to inspect styling

### Issue: Old messages don't load
**Fix:**
- [ ] Verify messages exist in database
- [ ] Check API endpoint: `GET http://localhost:4000/api/messages/history/chat_1_2`
- [ ] Verify JWT token is valid

### Issue: Real-time messages not appearing
**Fix:**
- [ ] Check Socket.io connection in DevTools
- [ ] Check browser console for JavaScript errors
- [ ] Verify both browser tabs have WebSocket connection
- [ ] Try hard refresh (Ctrl+Shift+R)
- [ ] Check browser DevTools → Network → WS for WebSocket frames

---

## Performance Checks

- [ ] Message load time < 1 second for first 50 messages
- [ ] Real-time message delivery < 500ms latency
- [ ] No console errors or warnings
- [ ] CPU usage stable (not continuously high)
- [ ] Memory not growing indefinitely

---

## Security Verification

- [ ] JWT token required for Socket.io connection
- [ ] Cannot access messages without authentication
- [ ] CORS restricted to appropriate origin
- [ ] SQL injection not possible (using parameterized queries)
- [ ] XSS protection (React escapes by default)

Test:
```bash
# Without token - should fail
curl -i http://localhost:4000/api/messages/history/chat_1_2

# With token - should work
curl -i -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  http://localhost:4000/api/messages/history/chat_1_2
```

---

## Final Checklist

- [ ] All dependencies installed
- [ ] Database table created
- [ ] All new files present and correct
- [ ] No existing features broken
- [ ] Chat sends and receives in real-time
- [ ] Message history loads correctly
- [ ] Real-time features work (typing, read receipts)
- [ ] Responsive design works on mobile
- [ ] No console errors
- [ ] No database errors
- [ ] Performance acceptable
- [ ] Security verified

---

## Deployment Sign-Off

**System Ready for Deployment:** _____ (Date)
**Tested By:** _____ (Name)
**Issues Found:** _____
**Issues Resolved:** _____

---

## Post-Deployment

- [ ] Monitor backend logs for errors
- [ ] Monitor database performance
- [ ] Check real-time functionality with multiple users
- [ ] Gather user feedback
- [ ] Plan for future enhancements (file sharing, reactions, etc.)

---

**Last Updated:** May 15, 2026
**Checklist Version:** 1.0

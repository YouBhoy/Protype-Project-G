# SPARTAN-G Chat System - Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React + Vite)                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Student Dashboard              Facilitator Dashboard              │
│  ├─ ChatButton (💬)            ├─ ConversationList                │
│  │  └─ onClick → setOpen       │  ├─ Students list               │
│  └─ ChatPanel                   │  └─ onClick → openChat         │
│     ├─ Messages display         └─ ChatButton (💬)                │
│     ├─ Input & Send             └─ ChatPanel (for selected)      │
│     └─ Typing indicator                                           │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  socket.js (Singleton)                                      │  │
│  │  ├─ initializeSocket(token)                                │  │
│  │  ├─ getSocket()                                            │  │
│  │  └─ Events: send_message, receive_message, typing, ...    │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                    │                               │
│  ┌─────────────────────────────────┼────────────────────────────┐  │
│  │  Axios API Client               │                            │  │
│  │  /messages/history              │                            │  │
│  │  /messages/conversations        │                            │  │
│  │  /messages/mark-read            │                            │  │
│  └─────────────────────────────────┼────────────────────────────┘  │
│                                    │                               │
└────────────────────────────────────┼───────────────────────────────┘
                                     │ WebSocket (Socket.io)
                                     │ HTTP (REST API)
                                     │
┌────────────────────────────────────┼───────────────────────────────┐
│  BACKEND (Node.js + Express)       │                              │
├────────────────────────────────────┼───────────────────────────────┤
│                                    │                              │
│  ┌──────────────────────────────────▼─────────────────────────┐  │
│  │  server.js (HTTP Server + Socket.io)                      │  │
│  │  ├─ http.createServer()                                   │  │
│  │  ├─ io = new Server()                                     │  │
│  │  └─ CORS: localhost:5173                                  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                  │                             │                 │
│                  │                             │                 │
│         ┌────────▼────────┐         ┌──────────▼──────────┐     │
│         │ Socket.io       │         │ Express Routes      │     │
│         │ Events          │         │                     │     │
│         ├─ join_room      │         ├─ GET /messages/..   │     │
│         ├─ send_message   │         ├─ POST /mark-read    │     │
│         ├─ typing         │         └─ GET /conversations │     │
│         ├─ message_read   │                                      │
│         └─ receive_message│                                      │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Authentication Middleware                              │   │
│  │  ├─ Verify JWT token                                    │   │
│  │  ├─ Extract user ID and role                            │   │
│  │  └─ Attach to req.user                                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                    │                             │
│  ┌──────────────────────────────────▼─────────────────────────┐  │
│  │  Message Model (message.model.js)                        │  │
│  │  ├─ saveMessage()                                        │  │
│  │  ├─ getMessageHistory()                                  │  │
│  │  ├─ markMessagesAsRead()                                 │  │
│  │  └─ getConversationListForFacilitator()                  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                    │                             │
└────────────────────────────────────┼─────────────────────────────┘
                                     │ SQL Queries
                                     │
┌────────────────────────────────────┼─────────────────────────────┐
│  MYSQL DATABASE                    │                            │
├────────────────────────────────────▼─────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  messages table                                         │   │
│  │  ├─ id (PK)                                             │   │
│  │  ├─ sender_id (FK → users)                              │   │
│  │  ├─ receiver_id (FK → users)                            │   │
│  │  ├─ room_id (VARCHAR 100)                               │   │
│  │  ├─ message (LONGTEXT)                                  │   │
│  │  ├─ is_read (BOOLEAN)                                   │   │
│  │  ├─ created_at (TIMESTAMP)                              │   │
│  │  └─ INDEX on: room_id, receiver_id, sender_id, is_read  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  users table (existing)                                 │   │
│  │  ├─ id (PK)                                             │   │
│  │  ├─ first_name                                          │   │
│  │  ├─ last_name                                           │   │
│  │  ├─ email                                               │   │
│  │  ├─ role (student / ogc)                                │   │
│  │  └─ ...other fields                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Message Send Flow
```
Student clicks Send in ChatPanel
       ↓
socket.emit('send_message', {roomId, receiverId, message})
       ↓
Backend receives event (Socket.io)
       ↓
Verify sender_id from socket auth
       ↓
Save to MySQL (message.model.saveMessage)
       ↓
Broadcast to room via io.to(roomId).emit('receive_message')
       ↓
Facilitator ChatPanel receives in real-time
       ↓
Display in message list
```

### 2. Message History Load Flow
```
ChatPanel opens (useEffect)
       ↓
API call: GET /api/messages/history/:roomId
       ↓
Backend queries MySQL for messages
       ↓
Returns last 50 messages
       ↓
Frontend displays in ChatPanel
```

### 3. Facilitator Conversation List Flow
```
Facilitator Dashboard loads
       ↓
ConversationList component mounts
       ↓
API call: GET /api/messages/conversations
       ↓
Backend queries distinct senders + unread counts
       ↓
Returns conversation list with last messages
       ↓
Display in ConversationList component
       ↓
Poll every 5 seconds for new messages
```

### 4. Socket Connection Flow
```
User logs in → AuthContext updates
       ↓
token stored in localStorage
       ↓
Dashboard component mounts
       ↓
Call initializeSocket(token)
       ↓
Socket.io connects to backend:4000
       ↓
Sends JWT token in auth handshake
       ↓
Backend verifies token
       ↓
Socket connection authenticated
       ↓
Ready for real-time events
```

## Room ID Generation

```
Room ID = `chat_${Math.min(studentId, facilitatorId)}_${Math.max(studentId, facilitatorId)}`

Example:
- Student ID: 5
- Facilitator ID: 2

Room ID = chat_2_5

This ensures consistency regardless of who initiates the chat
```

## Message Status Lifecycle

```
Message Created
       ↓
  is_read = FALSE
       ↓
Sent to receiver via Socket.io
       ↓
Displayed in ChatPanel
       ↓
User sees message
       ↓
ChatPanel calls message_read event
       ↓
Backend marks as read in DB (is_read = TRUE)
       ↓
Sender sees ✓✓ indicator
```

## Authentication & Authorization

```
Login Process:
  User credentials → Backend auth endpoint
       ↓
  JWT token generated
       ↓
  Token stored in localStorage (key: 'spartang_token')

Socket.io Auth:
  initializeSocket(token)
       ↓
  Socket handshake includes token
       ↓
  Backend Socket.io middleware verifies JWT
       ↓
  Extract user ID and role
       ↓
  socket.userId = decoded.id
  socket.userRole = decoded.role

REST API Auth:
  Every request includes: Authorization: Bearer <token>
       ↓
  Backend middleware verifies
       ↓
  Request allowed only if token valid
```

## Typing Indicator Flow

```
User starts typing
       ↓
Input onChange handler
       ↓
socket.emit('typing', { roomId, isTyping: true })
       ↓
Other user receives typing_indicator event
       ↓
ConversationItem renders typing animation
       ↓
Timeout after 1 second of no typing
       ↓
socket.emit('typing', { roomId, isTyping: false })
       ↓
Typing indicator disappears
```

---

**Architecture designed for:**
- ✅ Real-time communication
- ✅ Scalability (Socket.io namespacing possible)
- ✅ Security (JWT auth)
- ✅ Persistence (MySQL)
- ✅ Responsiveness (WebSocket)
- ✅ Reliability (Reconnection logic)

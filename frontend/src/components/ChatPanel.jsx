import React, { useState, useEffect, useRef } from 'react';
import { getSocket } from '../socket';
import { api } from '../services/api';
import './ChatPanel.css';
import { useAuth } from '../contexts/AuthContext';

export function ChatPanel({ 
  studentId, 
  facilitatorId, 
  currentUserId,
  currentUserRole,
  studentName = 'Student',
  facilitatorName = 'Facilitator',
  isOpen, 
  onClose 
}) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [remoteIsTyping, setRemoteIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const { user: authUser } = useAuth();

  // CRITICAL FIX: Use authUser first (guaranteed to be logged-in user)
  // Then use prop, only fall back to studentId if truly needed
  const resolvedCurrentUserId = authUser?.id ?? currentUserId;
  const resolvedCurrentUserRole = authUser?.role ?? currentUserRole;

  // Force to numbers for reliable comparison
  const activeUserId = Number(resolvedCurrentUserId);
  const numStudentId = Number(studentId);
  const numFacilitatorId = Number(facilitatorId);
  const otherParticipantId = activeUserId === numStudentId ? numFacilitatorId : numStudentId;

  // Validate: activeUserId must be one of the two participants
  const isValidParticipant = activeUserId === numStudentId || activeUserId === numFacilitatorId;
  console.warn('[ChatPanel] VALIDATION:', {
    activeUserId,
    numStudentId,
    numFacilitatorId,
    isValidParticipant,
    authUserId: authUser?.id,
    currentUserIdProp: currentUserId
  });

  if (!isValidParticipant) {
    console.error('[ChatPanel] ERROR: activeUserId is not a valid participant!', {
      activeUserId,
      numStudentId,
      numFacilitatorId
    });
  }

  // DEBUG: Log user identification
  console.log('[ChatPanel] USER IDENTIFICATION:', {
    currentUserIdProp: currentUserId,
    authUserId: authUser?.id,
    authRole: authUser?.role,
    studentIdProp: studentId,
    facilitatorIdProp: facilitatorId,
    resolvedCurrentUserId,
    resolvedCurrentUserRole,
    activeUserId,
    numStudentId,
    numFacilitatorId,
    otherParticipantId,
    isStudent: activeUserId === numStudentId,
    isFacilitator: activeUserId === numFacilitatorId
  });

  const isSentMessage = (message) => {
    // Extract senderId, convert to number for comparison
    const rawSenderId = message.senderId ?? message.sender_id;
    const msgSenderId = Number(rawSenderId);
    
    // Compare as numbers (most reliable)
    const isSent = msgSenderId === activeUserId;
    
    console.log(`[isSentMessage] msgSenderId=${msgSenderId}, activeUserId=${activeUserId}, isSent=${isSent} (msg: ${message.message?.substring(0, 20)})`);
    
    return isSent;
  };

  const normalizeMessage = (message) => {
    const senderId = Number(message.senderId ?? message.sender_id);
    const receiverId = Number(message.receiverId ?? message.receiver_id);
    const rawCreated = message.createdAt ?? message.created_at;
    const createdAt = rawCreated ? new Date(rawCreated).toISOString() : null;
    
    return {
      ...message,
      senderId,  // Ensure numeric
      receiverId,  // Ensure numeric
      senderRole: message.senderRole ?? message.sender_role ?? null,
      createdAt,
      isRead: Boolean(message.isRead ?? message.is_read)
    };
  };

  // Generate room ID
  const roomId = `chat_${Math.min(Number(studentId), Number(facilitatorId))}_${Math.max(Number(studentId), Number(facilitatorId))}`;

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize socket and fetch message history
  useEffect(() => {
    if (!isOpen) return;

    const socket = getSocket();
    if (!socket || !socket.connected) {
      if (!socket) {
        console.warn('Socket not initialized');
        return;
      }

      socket.connect();
    }

    const handleConnect = () => {
      socket.emit('join_room', { studentId, facilitatorId });
    };

    const handleReceiveMessage = (message) => {
      const normalizedMessage = normalizeMessage(message);
      console.debug('ChatPanel receive_message', { activeUserId, normalizedMessage });
      setMessages((prev) => [...prev, normalizedMessage]);

      if (Number(normalizedMessage.receiverId) === activeUserId) {
        socket.emit('message_read', { roomId, messageIds: [normalizedMessage.id] });
      }
    };

    const handleTypingIndicator = (data) => {
      if (Number(data.userId) === activeUserId) return;
      setRemoteIsTyping(data.isTyping);
    };

    const handleMessagesRead = (data) => {
      setMessages((prev) =>
        prev.map((msg) =>
          data.messageIds.includes(msg.id) ? { ...msg, isRead: true } : msg
        )
      );
    };

    // Load message history
    const loadHistory = async () => {
      try {
        setIsLoading(true);
        const response = await api.get(`/messages/history/${roomId}?limit=50`);
        const history = response.data || [];
        const normalizedHistory = Array.isArray(history) ? history.map(normalizeMessage) : [];

        // DEBUG: Log all loaded messages
        console.log('[ChatPanel] LOADED MESSAGE HISTORY:', {
          roomId,
          count: normalizedHistory.length,
          messages: normalizedHistory.map(m => ({
            id: m.id,
            senderId: m.senderId,
            receiverId: m.receiverId,
            message: m.message.substring(0, 20),
            isSent: m.senderId === activeUserId
          }))
        });

        if (normalizedHistory.length > 0) {
          console.log('ChatPanel first message object:', normalizedHistory[0]);
        }

        setMessages(normalizedHistory);
      } catch (error) {
        console.error('Failed to load message history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();

    socket.on('connect', handleConnect);
    if (socket.connected) {
      handleConnect();
    }

    // Listen for incoming messages
    socket.on('receive_message', handleReceiveMessage);

    // Listen for typing indicator
    socket.on('typing_indicator', handleTypingIndicator);

    // Listen for messages marked as read
    socket.on('messages_read', handleMessagesRead);

    // Cleanup
    return () => {
      socket.off('connect', handleConnect);
      socket.off('receive_message', handleReceiveMessage);
      socket.off('typing_indicator', handleTypingIndicator);
      socket.off('messages_read', handleMessagesRead);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [isOpen, roomId, studentId, facilitatorId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!inputValue.trim()) return;

    const socket = getSocket();
    if (!socket) return;

    const message = inputValue.trim();
    setInputValue('');

    // Stop typing indicator
    socket.emit('typing', { roomId, isTyping: false });
    setIsTyping(false);

    // Send message
    socket.emit('send_message', {
      roomId,
      senderId: activeUserId,
      receiverId: otherParticipantId,
      message
    });
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);

    const socket = getSocket();
    if (!socket) return;

    // Emit typing indicator
    if (value && !isTyping) {
      setIsTyping(true);
      socket.emit('typing', { roomId, isTyping: true });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', { roomId, isTyping: false });
      setIsTyping(false);
    }, 1000);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const showDebug = typeof window !== 'undefined' && new URL(window.location.href).searchParams.get('chat_debug') === '1';

  if (!isOpen) return null;

  // Safety check: if activeUserId is not valid, show error
  if (!isValidParticipant) {
    return (
      <div className="chat-panel-overlay">
        <div className="chat-panel">
          <div className="chat-panel-content" style={{color: 'red', padding: '16px'}}>
            <p><strong>Error:</strong> Invalid participant ID</p>
            <p>activeUserId={activeUserId}, student={numStudentId}, facilitator={numFacilitatorId}</p>
            <p>Please refresh the page.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-panel-overlay">
      <div className="chat-panel">
        <div className="chat-header">
          <div className="chat-title">
            <h3>
              {studentId === facilitatorId
                ? facilitatorName
                : facilitatorName}
            </h3>
          </div>
          <button className="chat-close-btn" onClick={onClose} title="Close chat">
            ✕
          </button>
        </div>

        <div className="chat-messages">
          {showDebug && (
            <div style={{ padding: '8px', background: '#fff3', border: '1px dashed #ccc', marginBottom: '8px' }}>
              <strong>Debug:</strong> activeUserId={activeUserId} role={resolvedCurrentUserRole}
            </div>
          )}
          {isLoading ? (
            <div className="chat-loading">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="chat-empty">Start a conversation</div>
          ) : (
            messages.map((msg) => {
              const isSent = isSentMessage(msg);
              console.log(`[ChatPanel RENDER] Message id=${msg.id}: senderId=${msg.senderId}, isSent=${isSent}`);
              return (
                <div
                  key={msg.id}
                  className={`message ${isSent ? 'sent' : 'received'}`}
                >
                  <div className="message-content">
                    <p>{msg.message}</p>
                    <span className="message-time">{formatTime(msg.createdAt)}</span>
                    {showDebug && (
                      <span style={{ marginLeft: '8px', fontSize: '11px', color: '#666' }}>
                        ({msg.senderId}→{msg.receiverId})
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
          {remoteIsTyping && (
            <div className="chat-message received">
              <div className="message-content typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="chat-input-form" onSubmit={handleSendMessage}>
          <input
            type="text"
            className="chat-input"
            placeholder="Type a message..."
            value={inputValue}
            onChange={handleInputChange}
            disabled={isLoading}
          />
          <button
            type="submit"
            className="chat-send-btn"
            disabled={!inputValue.trim() || isLoading}
            title="Send message"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChatPanel;

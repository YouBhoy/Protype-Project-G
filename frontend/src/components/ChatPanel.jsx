import React, { useState, useEffect, useRef } from 'react';
import { getSocket } from '../socket';
import { api } from '../services/api';
import './ChatPanel.css';

export function ChatPanel({ 
  studentId, 
  facilitatorId, 
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

  // Generate room ID
  const roomId = `chat_${Math.min(studentId, facilitatorId)}_${Math.max(studentId, facilitatorId)}`;

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
      console.warn('Socket not connected');
      return;
    }

    // Load message history
    const loadHistory = async () => {
      try {
        setIsLoading(true);
        const response = await api.get(`/messages/history/${roomId}?limit=50`);
        setMessages(response.data || []);
      } catch (error) {
        console.error('Failed to load message history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();

    // Join room
    socket.emit('join_room', { studentId, facilitatorId });

    // Listen for incoming messages
    socket.on('receive_message', (message) => {
      setMessages((prev) => [...prev, message]);

      // Mark message as read if we're the receiver
      if (message.receiverId === (studentId !== facilitatorId ? studentId : facilitatorId)) {
        socket.emit('message_read', { roomId, messageIds: [message.id] });
      }
    });

    // Listen for typing indicator
    socket.on('typing_indicator', (data) => {
      if (data.userId !== studentId && data.userId !== facilitatorId) return;
      setRemoteIsTyping(data.isTyping);
    });

    // Listen for messages marked as read
    socket.on('messages_read', (data) => {
      setMessages((prev) =>
        prev.map((msg) =>
          data.messageIds.includes(msg.id) ? { ...msg, isRead: true } : msg
        )
      );
    });

    // Cleanup
    return () => {
      socket.off('receive_message');
      socket.off('typing_indicator');
      socket.off('messages_read');
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
      senderId: studentId,
      receiverId: facilitatorId,
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

  if (!isOpen) return null;

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
          {isLoading ? (
            <div className="chat-loading">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="chat-empty">Start a conversation</div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`chat-message ${
                  msg.senderId === studentId ? 'sent' : 'received'
                }`}
              >
                <div className="message-content">
                  <p>{msg.message}</p>
                  <span className="message-time">{formatTime(msg.createdAt)}</span>
                  {msg.senderId === studentId && (
                    <span className="message-status">
                      {msg.isRead ? '✓✓' : '✓'}
                    </span>
                  )}
                </div>
              </div>
            ))
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

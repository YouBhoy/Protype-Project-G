import React from 'react';
import './ChatButton.css';

export function ChatButton({ onClick, unreadCount = 0 }) {
  return (
    <button
      className="chat-button"
      onClick={onClick}
      title="Open chat"
      aria-label="Open chat"
    >
      <span className="chat-button-icon">💬</span>
      {unreadCount > 0 && (
        <span className="chat-button-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
      )}
    </button>
  );
}

export default ChatButton;

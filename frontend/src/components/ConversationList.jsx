import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import './ConversationList.css';

export function ConversationList({ onSelectConversation, selectedStudentId }) {
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const token = localStorage.getItem('spartang_facilitator_token')
      || localStorage.getItem('spartang_student_token');

    if (!token) {
      setError('No authentication token found');
      setIsLoading(false);
      return;
    }

    const fetchConversations = async () => {
      try {
        setIsLoading(true);
        setError('');

        const response = await api.get('/messages/conversations?limit=20');
        const data = response?.data?.data || response?.data || response || [];
        const items = Array.isArray(data) ? data : [];
        if (!active) return;
        setConversations(items);
      } catch (err) {
        const message = err?.response?.data?.message || err.message || String(err);
        if (!active) return;
        setError('Failed to load conversations: ' + message);
        console.error('ConversationList fetch error:', err);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    fetchConversations();

    return () => { active = false; };
  }, []);

  if (isLoading) {
    return <div className="conversation-list-loading">Loading conversations...</div>;
  }

  if (error) {
    return <div className="conversation-list-error">{error}</div>;
  }

  if (conversations.length === 0) {
    return <div className="conversation-list-empty">No conversations yet</div>;
  }

  const getConversationName = (conversation) => {
    if (conversation.student_name) {
      return conversation.student_name;
    }

    const parts = [conversation.first_name, conversation.last_name].filter(Boolean);
    return parts.length ? parts.join(' ') : 'Student';
  };

  return (
    <div className="conversation-list">
      <div className="conversation-list-header">
        <h3>Messages</h3>
        <span className="conversation-count">{conversations.length}</span>
      </div>
      <div className="conversation-list-items">
        {conversations.map((conversation) => (
          <button
            key={conversation.student_id}
            className={`conversation-item ${
              selectedStudentId === conversation.student_id ? 'active' : ''
            }`}
            type="button"
            onClick={() => onSelectConversation(conversation)}
          >
            <div className="conversation-info">
              <div className="conversation-name">
                {getConversationName(conversation)}
              </div>
              <div className="conversation-preview">
                {conversation.last_message?.substring(0, 50)}
                {conversation.last_message?.length > 50 ? '...' : ''}
              </div>
            </div>
            {conversation.unread_count > 0 && (
              <span className="conversation-unread">
                {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default ConversationList;

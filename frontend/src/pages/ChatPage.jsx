import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { ChatPanel } from '../components/ChatPanel';
import { ConversationList } from '../components/ConversationList';
import { useAuth } from '../contexts/AuthContext';
import { initializeSocket } from '../socket';

export function ChatPage() {
  const { user, token } = useAuth();
  const [facilitatorInfo, setFacilitatorInfo] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const selectedConversationName = selectedConversation?.student_name
    || [selectedConversation?.first_name, selectedConversation?.last_name].filter(Boolean).join(' ')
    || 'Student';

  useEffect(() => {
    let active = true;

    setLoading(true);

    // For students: get assigned facilitator
    if (user?.role === 'student') {
      api.get('/messages/assigned-facilitator').then((response) => {
        if (active) {
          setFacilitatorInfo(response.facilitator || null);
          setSelectedConversation(response.facilitator || null);
        }
      }).catch((err) => {
        if (active) {
          setError(err.message || 'Failed to load facilitator information');
          setFacilitatorInfo(null);
        }
      }).finally(() => {
        if (active) setLoading(false);
      });
    } 
    // For facilitators: load conversation list
    else if (user?.role === 'ogc') {
      // Load conversations - this would need a new endpoint or use ConversationList's internal logic
      if (active) setLoading(false);
    }

    // Initialize Socket.io connection
    if (token) {
      initializeSocket(token);
    }

    return () => {
      active = false;
    };
  }, [token, user?.role]);

  if (loading) {
    return (
      <div className="page-stack">
        <header className="page-header">
          <p className="eyebrow">Chat</p>
          <h1>Messaging</h1>
        </header>
        <p className="muted">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-stack">
        <header className="page-header">
          <p className="eyebrow">Chat</p>
          <h1>Messaging</h1>
        </header>
        <div className="error-banner">{error}</div>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Chat</p>
          <h1>Messaging</h1>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '20px', height: '600px' }}>
        {user?.role === 'ogc' ? (
          <>
            <div style={{ flex: '0 0 300px', borderRight: '1px solid #e0e0e0', overflowY: 'auto' }}>
              <ConversationList onSelectConversation={setSelectedConversation} />
            </div>
            <div style={{ flex: 1 }}>
              {selectedConversation ? (
                <ChatPanel
                  studentId={selectedConversation.student_id}
                  facilitatorId={user.id}
                  currentUserId={user.id}
                  currentUserRole={user.role}
                  studentName={selectedConversationName}
                  facilitatorName={user.name}
                  isOpen={true}
                  onClose={() => setSelectedConversation(null)}
                />
              ) : (
                <p className="muted">Select a conversation to start messaging</p>
              )}
            </div>
          </>
        ) : (
          <>
            {facilitatorInfo && user ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                <section className="data-panel" style={{ maxWidth: '720px' }}>
                  <p className="eyebrow">Assigned facilitator</p>
                  <h3 style={{ margin: '6px 0 8px' }}>{facilitatorInfo.name}</h3>
                  <p className="muted">Tap below to start a direct chat with your assigned facilitator.</p>
                  <button className="btn btn-primary" type="button" onClick={() => setIsChatOpen(true)}>
                    Start chat
                  </button>
                </section>

                <ChatPanel
                  studentId={user.id}
                  facilitatorId={facilitatorInfo.id}
                  currentUserId={user.id}
                  currentUserRole={user.role}
                  studentName={user.name}
                  facilitatorName={facilitatorInfo.name}
                  isOpen={isChatOpen}
                  onClose={() => setIsChatOpen(false)}
                />
              </div>
            ) : (
              <div className="data-panel">
                <p className="muted">No facilitator assigned yet. Please contact support.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

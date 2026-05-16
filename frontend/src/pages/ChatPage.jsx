import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { ChatPanel } from '../components/ChatPanel';
import { ConversationList } from '../components/ConversationList';
import { initializeSocket } from '../socket';

export function ChatPage() {
  const [user, setUser] = useState(null);
  const [facilitatorInfo, setFacilitatorInfo] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [error, setError] = useState('');
  const pathname = window.location.pathname || '';
  const isFacilitatorPortal = pathname.startsWith('/facilitator');

  const studentToken = localStorage.getItem('spartang_student_token')
    || localStorage.getItem('spartang_token')
    || '';

  const facilitatorToken = localStorage.getItem('spartang_facilitator_token')
    || localStorage.getItem('spartang_token')
    || '';

  const token = isFacilitatorPortal ? facilitatorToken : studentToken;

  const role = useMemo(() => {
    try {
      const payload = token ? JSON.parse(atob(token.split('.')[1])) : null;
      return payload?.role || '';
    } catch (err) {
      return '';
    }
  }, [token]);

  const userName = useMemo(() => {
    try {
      const payload = token ? JSON.parse(atob(token.split('.')[1])) : null;
      return payload?.name || '';
    } catch (err) {
      return '';
    }
  }, [token]);

  useEffect(() => {
    let active = true;

    try {
      const payload = token ? JSON.parse(atob(token.split('.')[1])) : null;
      if (active) {
        setUser(payload || null);
      }
    } catch (err) {
      if (active) {
        setUser(null);
      }
    }

    return () => {
      active = false;
    };
  }, [token]);

  const selectedConversationName = selectedConversation?.student_name
    || [selectedConversation?.first_name, selectedConversation?.last_name].filter(Boolean).join(' ')
    || 'Student';

  useEffect(() => {
    let active = true;

    if (token) {
      initializeSocket(token);
    }

    if (!isFacilitatorPortal) {
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
      });
    }

    return () => {
      active = false;
    };
  }, [token, isFacilitatorPortal]);

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
        {isFacilitatorPortal ? (
          <>
            <div style={{ flex: '0 0 300px', borderRight: '1px solid #e0e0e0', overflowY: 'auto' }}>
              <ConversationList onSelectConversation={setSelectedConversation} />
            </div>
            <div style={{ flex: 1 }}>
              {selectedConversation ? (
                <ChatPanel
                  studentId={selectedConversation.student_id}
                  facilitatorId={user?.id}
                  currentUserId={user?.id}
                  currentUserRole={role}
                  studentName={selectedConversationName}
                  facilitatorName={userName}
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
                  studentId={user?.id}
                  facilitatorId={facilitatorInfo.id}
                  currentUserId={user?.id}
                  currentUserRole={role}
                  studentName={userName}
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

import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { ChatPanel } from '../components/ChatPanel';
import { ConversationList } from '../components/ConversationList';
import { InfoCards } from '../components/InfoCards';
import { initializeSocket } from '../socket';

export function ChatPage() {
  const [user, setUser] = useState(null);
  const [facilitatorInfo, setFacilitatorInfo] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [error, setError] = useState('');
  const [cards, setCards] = useState([]);
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
          const msg = String(err?.message || '');
          // If backend doesn't expose this endpoint yet, don't treat as fatal — show no facilitator assigned
          if (/not_found|route not found/i.test(msg)) {
            setFacilitatorInfo(null);
          } else {
            setError(msg || 'Failed to load facilitator information');
            setFacilitatorInfo(null);
          }
        }
      });
    }

    return () => {
      active = false;
    };
  }, [token, isFacilitatorPortal]);

  // Fetch card metrics for the info cards (refresh periodically)
  useEffect(() => {
    let active = true;

    const formatTime = (ts) => {
      try {
        const d = new Date(ts);
        return d.toLocaleString();
      } catch (e) {
        return ts || '';
      }
    };

    const loadStats = async () => {
      try {
        if (!active) return;

        if (isFacilitatorPortal) {
          const resp = await api.get('/messages/conversations/list?limit=50');
          const conv = resp.data || [];
          const total = conv.length;
          const unread = conv.reduce((s, c) => s + (c.unread_count || 0), 0);
          const pending = conv.filter((c) => c.unread_count > 0).length;
          const activeStudents = conv.length;

          setCards([
            { key: 'total', label: 'Total Conversations', value: total, icon: '💬' },
            { key: 'unread', label: 'Unread Messages', value: unread, icon: '🔴' },
            { key: 'pending', label: 'Pending Responses', value: pending, icon: '⏳' },
            { key: 'active', label: 'Active Students', value: activeStudents, icon: '👥' }
          ]);
        } else {
          // Student
          const unreadResp = await api.get('/messages/unread/total');
          const unread = unreadResp.unreadCount || unreadResp.unread_count || 0;
          const activeConversations = facilitatorInfo ? 1 : 0;
          let lastMessageTime = '';
          if (facilitatorInfo && user) {
            const roomId = `chat_${Math.min(user.id, facilitatorInfo.id)}_${Math.max(user.id, facilitatorInfo.id)}`;
            const historyResp = await api.get(`/messages/history/${roomId}?limit=1`);
            const msgs = historyResp.data || [];
            const last = msgs.length ? msgs[msgs.length - 1] : null;
            lastMessageTime = last ? formatTime(last.created_at || last.createdAt) : '';
          }

          setCards([
            { key: 'active', label: 'Active Conversations', value: activeConversations, icon: '💬' },
            { key: 'unread', label: 'Unread Messages', value: unread, icon: '🔴' },
            { key: 'last', label: 'Last Message', value: lastMessageTime || '—', icon: '🕒' }
          ]);
        }
      } catch (err) {
        console.warn('Failed to load chat metrics', err);
        if (active) setCards([]);
      }
    };

    loadStats();
    const interval = setInterval(loadStats, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [isFacilitatorPortal, user, facilitatorInfo]);

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

      {/* Info cards (student/facilitator specific) */}
      <div style={{ padding: '0 4px 12px' }}>
        <InfoCards items={cards} />
      </div>

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
                <p className="muted">No facilitator assigned yet.</p>
                <p className="muted">You can request an available counselor for your college.</p>
                <div style={{ marginTop: '8px' }}>
                  <button
                    className="btn btn-outline"
                    type="button"
                    onClick={async () => {
                      try {
                        setError('');
                        const resp = await api.post('/messages/request-assignment');
                        const fac = resp.facilitator || resp.data?.facilitator || resp.data?.facilitator;
                        const conv = resp.conversation || resp.data?.conversation || resp.data;
                        if (fac) setFacilitatorInfo(fac);
                        if (conv) setSelectedConversation(conv);
                        setIsChatOpen(true);
                      } catch (err) {
                        setError(String(err?.message || 'Failed to request assignment'));
                      }
                    }}
                  >
                    Request a Counselor
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

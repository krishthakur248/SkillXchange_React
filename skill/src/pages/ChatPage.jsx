import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import MobileNav from '../components/MobileNav';
import Toast from '../components/Toast';
import { chatApi, learnTeachApi } from '../api';
import { useAuth } from '../context/AuthContext';
import './ChatPage.css';

function formatTime(date) {
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date) {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ChatPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const preselectedId = searchParams.get('with');

  const [conversations, setConversations] = useState([]);
  const [activeUserId, setActiveUserId]   = useState(preselectedId || null);
  const [messages,     setMessages]       = useState([]);
  const [draft,        setDraft]          = useState('');
  const [loadingConvs, setLoadingConvs]   = useState(true);
  const [loadingMsgs,  setLoadingMsgs]    = useState(false);
  const [sending,      setSending]        = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(!!preselectedId);
  const [toast, setToast]                 = useState(null);
  const [finishLoading, setFinishLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const pollRef = useRef(null);

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      const { conversations: convs } = await chatApi.conversations();
      setConversations(convs);
      // If the currently active user was removed (e.g. course finished), reset active user
      if (activeUserId && !convs.some((c) => String(c.userId) === String(activeUserId))) {
        setActiveUserId(null);
        setMessages([]);
      } else if (preselectedId && convs.length > 0 && !activeUserId) {
        if (convs.some((c) => String(c.userId) === String(preselectedId))) {
          setActiveUserId(preselectedId);
        }
      }
    } catch (err) {
      console.error('Load conversations error:', err);
    } finally {
      setLoadingConvs(false);
    }
  }, [preselectedId, activeUserId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load messages for active conversation
  const loadMessages = useCallback(async (userId) => {
    if (!userId) return;
    setLoadingMsgs(true);
    try {
      const res = await chatApi.messages(userId);
      setMessages(res.messages || []);
    } catch (err) {
      console.error('Load messages error:', err);
      // If connection no longer exists, clear active user
      setActiveUserId(null);
      setMessages([]);
      loadConversations();
    } finally {
      setLoadingMsgs(false);
    }
  }, [loadConversations]);

  useEffect(() => {
    if (activeUserId) {
      loadMessages(activeUserId);
      setMobileShowChat(true);
    }
  }, [activeUserId, loadMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Poll for new messages and conversation updates every 3 seconds
  useEffect(() => {
    if (!activeUserId) return;
    pollRef.current = setInterval(() => {
      chatApi.messages(activeUserId)
        .then((res) => setMessages(res.messages || []))
        .catch(() => {
          // If connection was finished by partner, reload conversations
          loadConversations();
        });
      chatApi.conversations()
        .then(({ conversations: convs }) => {
          setConversations(convs);
          if (!convs.some((c) => String(c.userId) === String(activeUserId))) {
            setActiveUserId(null);
            setMessages([]);
            setToast({
              message: 'Skill exchange completed! Active chat and connection have ended.',
              type: 'success',
            });
          }
        })
        .catch(() => {});
    }, 3000);
    return () => clearInterval(pollRef.current);
  }, [activeUserId, loadConversations]);

  const activeConv = conversations.find((c) => String(c.userId) === String(activeUserId));

  const handleSend = async (e) => {
    e.preventDefault();
    if (!draft.trim() || !activeUserId || sending) return;

    const text = draft.trim();
    setDraft('');
    setSending(true);

    const optimistic = {
      _id:       `opt-${Date.now()}`,
      from:      user._id,
      to:        activeUserId,
      text,
      type:      'text',
      createdAt: new Date().toISOString(),
      read:      false,
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const { message } = await chatApi.sendMessage(activeUserId, { text });
      setMessages((prev) => prev.map((m) => m._id === optimistic._id ? message : m));
      loadConversations();
    } catch (err) {
      console.error('Send error:', err);
      setMessages((prev) => prev.filter((m) => m._id !== optimistic._id));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const handleFinishLearning = async (requestId) => {
    if (!requestId) return;
    setFinishLoading(true);
    try {
      const res = await learnTeachApi.completeRequest(requestId);
      if (res.isFullyCompleted) {
        setToast({
          message: '🎉 Skill exchange concluded! Chat and active connection have been removed.',
          type: 'success',
        });
        setActiveUserId(null);
        setMessages([]);
        loadConversations();
      } else {
        setToast({
          message: 'Finish request sent in chat! Waiting for your partner to confirm.',
          type: 'info',
        });
        if (activeUserId) loadMessages(activeUserId);
        loadConversations();
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to finish exchange.', type: 'error' });
    } finally {
      setFinishLoading(false);
    }
  };

  const handleCancelFinish = async (requestId) => {
    if (!requestId) return;
    setFinishLoading(true);
    try {
      const res = await learnTeachApi.cancelCompleteRequest(requestId);
      setToast({ message: res.message || 'Finish request cancelled.', type: 'info' });
      if (activeUserId) loadMessages(activeUserId);
      loadConversations();
    } catch (err) {
      setToast({ message: err.message || 'Failed to cancel finish request.', type: 'error' });
    } finally {
      setFinishLoading(false);
    }
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, msg) => {
    const label = formatDate(msg.createdAt);
    if (!groups[label]) groups[label] = [];
    groups[label].push(msg);
    return groups;
  }, {});

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content chat-main">
        <div className="chat-shell">

          {/* ── Conversations sidebar ── */}
          <aside className={`chat-convs ${mobileShowChat ? 'mobile-hidden' : ''}`}>
            <div className="chat-convs-header">
              <h2 className="chat-convs-title">
                <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>chat</span>
                Messages
              </h2>
              {conversations.length > 0 && (
                <span className="chat-convs-count">{conversations.length}</span>
              )}
            </div>

            {loadingConvs ? (
              <div className="chat-loading-state">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="chat-skeleton-item">
                    <div className="chat-skeleton-avatar" />
                    <div className="chat-skeleton-lines">
                      <div className="chat-skeleton-line" style={{ width: '60%' }} />
                      <div className="chat-skeleton-line" style={{ width: '40%' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="chat-empty-convs">
                <span className="material-symbols-outlined chat-empty-icon">chat_bubble</span>
                <p className="chat-empty-title">No active chats</p>
                <p className="chat-empty-sub">Active conversations appear when you and a peer accept a skill exchange</p>
              </div>
            ) : (
              <div className="chat-convs-list">
                {conversations.map((conv) => (
                  <button
                    key={conv.userId}
                    className={`chat-conv-item ${String(conv.userId) === String(activeUserId) ? 'active' : ''}`}
                    onClick={() => setActiveUserId(String(conv.userId))}
                    id={`conv-${conv.userId}`}
                  >
                    <div className="chat-conv-avatar-wrap">
                      {conv.isClass ? (
                        <div className="chat-conv-avatar chat-conv-avatar-class" style={{ background: 'linear-gradient(135deg, #0043c8, #006b5c)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>school</span>
                        </div>
                      ) : conv.avatar ? (
                        <img src={conv.avatar} alt={conv.name} className="chat-conv-avatar" />
                      ) : (
                        <div className="chat-conv-avatar chat-conv-avatar-initials">{conv.initials}</div>
                      )}
                      <div className="chat-conv-online-dot" />
                    </div>
                    <div className="chat-conv-info">
                      <div className="chat-conv-top">
                        <span className="chat-conv-name">
                          {conv.name}
                        </span>
                        {conv.lastMessageAt && (
                          <span className="chat-conv-time">{formatTime(conv.lastMessageAt)}</span>
                        )}
                      </div>
                      <div className="chat-conv-bottom">
                        <span className="chat-conv-preview">
                          {conv.isClass && <strong style={{ color: 'var(--primary)', marginRight: 4 }}>[Class]</strong>}
                          {conv.peerVote && !conv.myVote
                            ? '🔔 Finish Course Requested'
                            : (conv.lastMessage || (conv.isClass ? 'Class Cohort' : `Exchange: ${conv.fromSkill} ↔ ${conv.toSkill}`))}
                        </span>
                        {conv.unreadCount > 0 && (
                          <span className="chat-conv-unread">{conv.unreadCount}</span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </aside>

          {/* ── Message pane ── */}
          <main className={`chat-pane ${!mobileShowChat ? 'mobile-hidden' : ''}`}>
            {!activeUserId ? (
              <div className="chat-pane-empty">
                <div className="chat-pane-empty-inner">
                  <div className="chat-pane-empty-icon-wrap">
                    <span className="material-symbols-outlined chat-pane-empty-icon">forum</span>
                  </div>
                  <h3 className="chat-pane-empty-title">Select a Conversation</h3>
                  <p className="chat-pane-empty-sub">Choose a class cohort or active peer connection to start messaging</p>
                </div>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="chat-pane-header">
                  <button
                    className="chat-back-btn"
                    onClick={() => setMobileShowChat(false)}
                  >
                    <span className="material-symbols-outlined">arrow_back</span>
                  </button>
                  <div className="chat-pane-header-avatar-wrap">
                    {activeConv?.isClass ? (
                      <div className="chat-pane-header-avatar chat-pane-header-avatar-initials" style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 22 }}>school</span>
                      </div>
                    ) : activeConv?.avatar ? (
                      <img src={activeConv.avatar} alt={activeConv?.name} className="chat-pane-header-avatar" />
                    ) : (
                      <div className="chat-pane-header-avatar chat-pane-header-avatar-initials">{activeConv?.initials}</div>
                    )}
                    <div className="chat-pane-online-dot" />
                  </div>
                  <div className="chat-pane-header-info">
                    <span className="chat-pane-header-name">{activeConv?.name || '…'}</span>
                    <span className="chat-pane-header-role">
                      {activeConv?.isClass
                        ? (activeConv?.role || 'Class Cohort')
                        : (activeConv?.role || 'Active Skill Partner')}
                    </span>
                  </div>
                  <div className="chat-pane-header-actions">
                    <button
                      className="chat-header-action-btn"
                      title={activeConv?.isClass ? 'Schedule Class Video Session' : 'Schedule Video Call'}
                      onClick={() => {
                        if (activeConv?.isClass) {
                          navigate(`/video-sessions?class=${activeConv.classId}`);
                        } else {
                          navigate(`/video-sessions?with=${activeUserId}`);
                        }
                      }}
                    >
                      <span className="material-symbols-outlined">videocam</span>
                    </button>
                  </div>
                </div>

                {/* Exchange / Class info banner */}
                {activeConv && activeConv.isClass ? (
                  <div className="chat-exchange-banner" style={{ background: 'rgba(0, 67, 200, 0.08)', color: 'var(--primary)' }}>
                    <div className="chat-banner-info">
                      <span className="material-symbols-outlined chat-banner-icon" style={{ color: 'var(--primary)' }}>groups</span>
                      <div className="chat-banner-text">
                        <span>
                          <strong>Class Cohort:</strong> {activeConv.name} · {activeConv.memberCount || 1} Members · {activeConv.skills?.join(', ') || 'All topics'}
                        </span>
                      </div>
                    </div>
                    <div className="chat-banner-actions">
                      <button
                        className="chat-banner-btn primary"
                        onClick={() => navigate(`/video-sessions?class=${activeConv.classId}`)}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>videocam</span>
                        Live Session
                      </button>
                    </div>
                  </div>
                ) : activeConv && (
                  <div className="chat-exchange-banner">
                    <div className="chat-banner-info">
                      <span className="material-symbols-outlined chat-banner-icon">swap_horiz</span>
                      <div className="chat-banner-text">
                        <span>
                          You teach <strong>{activeConv.fromSkill}</strong> · You learn <strong>{activeConv.toSkill}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="chat-banner-actions">
                      {activeConv.myVote ? (
                        <button
                          className="chat-banner-btn secondary"
                          onClick={() => handleCancelFinish(activeConv.requestId)}
                          disabled={finishLoading}
                          title="Cancel your finish request"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                          Cancel Finish Request
                        </button>
                      ) : activeConv.peerVote ? (
                        <button
                          className="chat-banner-btn highlight"
                          onClick={() => handleFinishLearning(activeConv.requestId)}
                          disabled={finishLoading}
                          title="Confirm finishing course and close connection"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                          Accept & End Course
                        </button>
                      ) : (
                        <button
                          className="chat-banner-btn primary"
                          onClick={() => handleFinishLearning(activeConv.requestId)}
                          disabled={finishLoading}
                          title="Send a finish request to your peer in chat"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>school</span>
                          Finish Learning Course
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Messages */}
                <div className="chat-messages">
                  {loadingMsgs ? (
                    <div className="chat-msgs-loading">
                      <span className="material-symbols-outlined animate-pulse" style={{ fontSize: 32, color: 'var(--outline)' }}>chat</span>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="chat-msgs-empty">
                      <div className="chat-msgs-empty-icon-wrap">
                        <span className="material-symbols-outlined">{activeConv?.isClass ? 'school' : 'waving_hand'}</span>
                      </div>
                      <p className="chat-msgs-empty-title">{activeConv?.isClass ? 'Welcome to the Class Cohort!' : 'Say hello!'}</p>
                      <p className="chat-msgs-empty-sub">
                        {activeConv?.isClass
                          ? `Start messaging with everyone enrolled in ${activeConv?.name}.`
                          : `Start your skill exchange conversation with ${activeConv?.name}`}
                      </p>
                    </div>
                  ) : (
                    Object.entries(groupedMessages).map(([date, msgs]) => (
                      <div key={date}>
                        <div className="chat-date-divider">
                          <span>{date}</span>
                        </div>
                        {msgs.map((msg) => {
                          const isMine = String(msg.from) === String(user._id) || String(msg.from?._id) === String(user._id);

                          // Interactive Finish Request Card inside Chat (only for peer exchanges)
                          if (msg.type === 'finish_request') {
                            return (
                              <div key={msg._id} className="chat-finish-request-wrapper">
                                <div className={`chat-finish-request-card ${isMine ? 'mine' : 'theirs'}`}>
                                  <div className="chat-finish-header">
                                    <div className="chat-finish-icon-wrap">
                                      <span className="material-symbols-outlined">school</span>
                                    </div>
                                    <div>
                                      <h4 className="chat-finish-title">
                                        {isMine ? 'Course Finish Request Sent' : `${activeConv?.name} requested to Finish Course`}
                                      </h4>
                                      <p className="chat-finish-subtitle">
                                        {isMine
                                          ? 'You requested to complete this skill exchange course. Waiting for your partner to accept.'
                                          : 'Accepting will conclude this learning course, grant rewards (+100 XP), and remove the active chat and connection.'}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="chat-finish-actions">
                                    {isMine ? (
                                      <button
                                        className="chat-finish-btn cancel"
                                        onClick={() => handleCancelFinish(msg.requestId || activeConv?.requestId)}
                                        disabled={finishLoading}
                                      >
                                        Withdraw Request
                                      </button>
                                    ) : (
                                      <>
                                        <button
                                          className="chat-finish-btn accept"
                                          onClick={() => handleFinishLearning(msg.requestId || activeConv?.requestId)}
                                          disabled={finishLoading}
                                        >
                                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check</span>
                                          Accept & End Connection
                                        </button>
                                        <button
                                          className="chat-finish-btn decline"
                                          onClick={() => handleCancelFinish(msg.requestId || activeConv?.requestId)}
                                          disabled={finishLoading}
                                        >
                                          Decline
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          // Regular Text Message
                          return (
                            <div key={msg._id} className={`chat-msg-row ${isMine ? 'mine' : 'theirs'}`}>
                              {!isMine && (
                                <div className="chat-msg-avatar">
                                  {msg.senderAvatar ? (
                                    <img src={msg.senderAvatar} alt={msg.senderName || 'Member'} className="chat-msg-avatar-img" />
                                  ) : (
                                    <div className="chat-msg-avatar-initials">
                                      {msg.senderInitials || (msg.senderName ? msg.senderName.slice(0, 2).toUpperCase() : (activeConv?.initials || 'U'))}
                                    </div>
                                  )}
                                </div>
                              )}
                              <div className="chat-msg-content-wrap">
                                {!isMine && activeConv?.isClass && (
                                  <span className="chat-msg-sender-name">
                                    <span>{msg.senderName || 'Member'}</span>
                                    {msg.isMentorMsg && (
                                      <span className="tab-mentor-badge" style={{ fontSize: 9, padding: '1px 5px' }}>👑 Mentor</span>
                                    )}
                                  </span>
                                )}
                                <div className={`chat-bubble ${isMine ? 'mine' : 'theirs'}`}>
                                  <p className="chat-bubble-text">{msg.text}</p>
                                  <span className="chat-bubble-time">{formatTime(msg.createdAt)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form className="chat-input-bar" onSubmit={handleSend}>
                  <div className="chat-input-wrap">
                    <textarea
                      ref={inputRef}
                      className="chat-input"
                      placeholder={`Message ${activeConv?.name || ''}…`}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={handleKeyDown}
                      rows={1}
                      id="chat-message-input"
                    />
                  </div>
                  <button
                    type="submit"
                    className={`chat-send-btn ${draft.trim() ? 'active' : ''}`}
                    disabled={!draft.trim() || sending}
                    id="chat-send-button"
                  >
                    <span className="material-symbols-outlined">send</span>
                  </button>
                </form>
              </>
            )}
          </main>
        </div>
      </div>
      <MobileNav />
      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}

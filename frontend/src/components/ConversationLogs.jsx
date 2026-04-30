import { useState, useEffect } from 'react';
import { getConversations, getConversation } from '../api/index.js';

export default function ConversationLogs() {
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showList, setShowList] = useState(true);

  useEffect(() => {
    getConversations()
      .then(setConversations)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function selectConversation(id) {
    setSelected(id);
    setDetail(null);
    setShowList(false);
    try {
      const data = await getConversation(id);
      setDetail(data);
    } catch (err) {
      console.error('Failed to load conversation:', err);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl shimmer-bg" />
          <span className="text-sm" style={{ color: 'var(--text-light)' }}>Loading conversations...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-57px)] sm:h-[calc(100vh-65px)]">
      <div
        className={`${showList ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-80 lg:w-96 shrink-0 overflow-hidden`}
        style={{ borderRight: '1px solid var(--border-light)', background: 'var(--bg-subtle)' }}
      >
        <div className="p-4 sm:p-5" style={{ borderBottom: '1px solid var(--border-light)' }}>
          <h2 className="text-base font-bold" style={{ color: 'var(--text-dark)', fontFamily: 'var(--font-display)' }}>Conversations</h2>
          <p className="text-xs mt-1" style={{ color: 'var(--text-light)' }}>{conversations.length} total</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-8 text-center animate-fade-in">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-medium)' }}>No conversations yet</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-light)' }}>Start chatting to see logs here</p>
            </div>
          ) : (
            <div>
              {conversations.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => selectConversation(c.id)}
                  className="w-full text-left px-4 sm:px-5 py-4 transition-all duration-200 cursor-pointer animate-fade-in"
                  style={{
                    animationDelay: `${i * 0.03}s`,
                    borderBottom: '1px solid var(--border-light)',
                    background: selected === c.id ? 'var(--bg-card)' : 'transparent',
                    borderLeft: selected === c.id ? '3px solid var(--primary)' : '3px solid transparent'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold" style={{ color: selected === c.id ? 'var(--primary)' : 'var(--text-dark)' }}>
                      Conversation #{c.id}
                    </span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="badge" style={{ background: 'var(--bg-card)', color: 'var(--text-light)', border: '1px solid var(--border-light)' }}>
                      {c.message_count || 0} msgs
                    </span>
                    <span className="text-xs font-mono" style={{ color: 'var(--primary)' }}>{c.total_tokens || 0} tok</span>
                  </div>
                  <div className="text-[10px] mt-1.5 font-mono" style={{ color: 'var(--text-muted)' }}>
                    {new Date(c.created_at + 'Z').toLocaleString()}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={`${!showList ? 'flex' : 'hidden'} md:flex flex-col flex-1 overflow-hidden`}>
        {!detail ? (
          <div className="flex flex-col items-center justify-center h-full px-6 animate-fade-in">
            <div className="w-20 h-20 rounded-2xl mb-5 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(224,123,76,0.1), rgba(244,162,97,0.05))', border: '1px solid var(--border-light)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
            <p className="text-sm text-center" style={{ color: 'var(--text-light)' }}>
              {selected ? 'Loading...' : 'Select a conversation to view details'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="px-4 sm:px-8 py-4 flex items-center gap-3 shrink-0" style={{ borderBottom: '1px solid var(--border-light)', background: 'var(--bg-card)' }}>
              <button
                className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg shrink-0"
                style={{ background: 'var(--bg-subtle)' }}
                onClick={() => { setShowList(true); setDetail(null); setSelected(null); }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-medium)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
              </button>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold truncate" style={{ color: 'var(--text-dark)', fontFamily: 'var(--font-display)' }}>
                  Conversation #{detail.id}
                </h3>
                <p className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                  {new Date(detail.created_at + 'Z').toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
              <div className="space-y-3 max-w-3xl">
                {(detail.messages || []).map((msg, i) => (
                  <LogEntry key={i} msg={msg} index={i} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LogEntry({ msg, index }) {
  const roleConfig = {
    user: { label: 'User', color: 'var(--primary)', bg: 'rgba(224,123,76,0.05)', border: 'rgba(224,123,76,0.15)', icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z' },
    assistant: { label: 'Assistant', color: 'var(--accent)', bg: 'rgba(123,97,255,0.04)', border: 'rgba(123,97,255,0.15)', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
    tool_call: { label: 'Tool Call', color: 'var(--text-medium)', bg: 'var(--bg-subtle)', border: 'var(--border-light)', icon: 'M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z' },
    tool_result: { label: 'Result', color: 'var(--success)', bg: 'rgba(34,197,94,0.04)', border: 'rgba(34,197,94,0.15)', icon: 'M9 11l3 3L22 4' },
    policy: { label: 'Policy', color: 'var(--danger)', bg: 'rgba(239,68,68,0.04)', border: 'rgba(239,68,68,0.15)', icon: 'M18.36 5.64l-12.72 12.72' }
  };

  const config = roleConfig[msg.role] || roleConfig.assistant;

  const policyColors = {
    allowed: { bg: 'rgba(34,197,94,0.1)', color: 'var(--success)' },
    blocked: { bg: 'rgba(239,68,68,0.1)', color: 'var(--danger)' },
    pending_approval: { bg: 'rgba(245,158,11,0.1)', color: 'var(--warning)' }
  };

  return (
    <div
      className="card rounded-xl px-4 sm:px-5 py-3 sm:py-4 animate-fade-in"
      style={{ background: config.bg, borderColor: config.border, animationDelay: `${index * 0.03}s` }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: `${config.color}12` }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={config.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d={config.icon}/>
            </svg>
          </div>
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: config.color }}>
            {config.label}
          </span>
          {msg.tool_name && (
            <span className="badge font-mono" style={{ background: 'var(--bg-subtle)', color: 'var(--text-medium)', border: '1px solid var(--border-light)' }}>
              {msg.tool_name}
            </span>
          )}
          {msg.policy_decision && (
            <span className="badge font-semibold" style={{
              background: policyColors[msg.policy_decision]?.bg || 'var(--bg-subtle)',
              color: policyColors[msg.policy_decision]?.color || 'var(--text-light)'
            }}>
              {msg.policy_decision}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
          {msg.token_count > 0 && <span>{msg.token_count} tok</span>}
          <span>{new Date(msg.created_at + 'Z').toLocaleTimeString()}</span>
        </div>
      </div>
      <div className="text-sm whitespace-pre-wrap break-words leading-relaxed" style={{ color: 'var(--text-medium)' }}>
        {msg.content}
      </div>
    </div>
  );
}

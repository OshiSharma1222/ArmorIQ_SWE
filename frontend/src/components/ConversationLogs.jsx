import { useState, useEffect } from 'react';
import { getConversations, getConversation } from '../api/index.js';

export default function ConversationLogs() {
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getConversations()
      .then(setConversations)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function selectConversation(id) {
    setSelected(id);
    setDetail(null);
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
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full animate-pulse-dot" style={{ background: 'var(--primary)' }} />
          <span style={{ color: 'var(--text-light)' }}>Loading conversations...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-73px)]">
      <div className="w-80 overflow-y-auto" style={{ borderRight: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
        <div className="p-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-sm font-bold" style={{ color: 'var(--text-dark)', fontWeight: 700 }}>Conversations</h2>
          <p className="text-xs mt-1" style={{ color: 'var(--text-light)' }}>{conversations.length} total</p>
        </div>

        {conversations.length === 0 ? (
          <div className="p-6 text-center">
            <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-light)" strokeWidth="1.5" strokeLinecap="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-light)' }}>No conversations yet</p>
          </div>
        ) : (
          <div>
            {conversations.map(c => (
              <button
                key={c.id}
                onClick={() => selectConversation(c.id)}
                className="w-full text-left px-5 py-4 transition-all duration-200 cursor-pointer"
                style={{
                  borderBottom: '1px solid var(--border-light)',
                  background: selected === c.id ? 'var(--bg)' : 'transparent',
                  borderLeft: selected === c.id ? '3px solid var(--primary)' : '3px solid transparent'
                }}
              >
                <div className="text-sm" style={{ color: 'var(--text-dark)', fontWeight: selected === c.id ? 700 : 500 }}>
                  Conversation #{c.id}
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-xs" style={{ color: 'var(--text-light)' }}>{c.message_count || 0} messages</span>
                  <span className="text-xs font-mono" style={{ color: 'var(--primary)' }}>{c.total_tokens || 0} tokens</span>
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-light)' }}>
                  {new Date(c.created_at + 'Z').toLocaleString()}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {!detail ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-16 h-16 rounded-2xl mb-4 flex items-center justify-center" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-light)" strokeWidth="1.5" strokeLinecap="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-light)' }}>
              {selected ? 'Loading...' : 'Select a conversation to view details'}
            </p>
          </div>
        ) : (
          <div className="p-8 animate-fade-in">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-bold" style={{ color: 'var(--text-dark)', fontWeight: 700 }}>
                  Conversation #{detail.id}
                </h3>
                <p className="text-xs mt-1" style={{ color: 'var(--text-light)' }}>
                  {new Date(detail.created_at + 'Z').toLocaleString()}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {(detail.messages || []).map((msg, i) => (
                <LogEntry key={i} msg={msg} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LogEntry({ msg }) {
  const roleConfig = {
    user: { label: 'User', color: 'var(--primary)', bg: 'rgba(224, 123, 76, 0.04)', border: 'rgba(224, 123, 76, 0.2)' },
    assistant: { label: 'Assistant', color: 'var(--text-dark)', bg: 'var(--bg-subtle)', border: 'var(--border)' },
    tool_call: { label: 'Tool Call', color: 'var(--text-medium)', bg: 'var(--bg)', border: 'var(--border)' },
    tool_result: { label: 'Tool Result', color: '#4CAF50', bg: 'rgba(76, 175, 80, 0.04)', border: 'rgba(76, 175, 80, 0.2)' },
    policy: { label: 'Policy', color: '#D32F2F', bg: 'rgba(211, 47, 47, 0.04)', border: 'rgba(211, 47, 47, 0.2)' }
  };

  const config = roleConfig[msg.role] || roleConfig.assistant;

  const policyColors = {
    allowed: { bg: 'rgba(76, 175, 80, 0.1)', color: '#4CAF50' },
    blocked: { bg: 'rgba(211, 47, 47, 0.1)', color: '#D32F2F' },
    pending_approval: { bg: 'rgba(224, 123, 76, 0.1)', color: '#E07B4C' }
  };

  return (
    <div
      className="rounded-xl px-5 py-4 animate-fade-in"
      style={{ background: config.bg, border: `1px solid ${config.border}` }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: config.color }} />
          <span className="text-xs font-bold uppercase tracking-wide" style={{ color: config.color }}>
            {config.label}
          </span>
          {msg.tool_name && (
            <span className="text-xs font-mono px-2 py-0.5 rounded-md" style={{ background: 'var(--bg-subtle)', color: 'var(--text-medium)' }}>
              {msg.tool_name}
            </span>
          )}
          {msg.policy_decision && (
            <span
              className="text-xs px-2 py-0.5 rounded-md font-bold"
              style={{
                background: policyColors[msg.policy_decision]?.bg || 'var(--bg-subtle)',
                color: policyColors[msg.policy_decision]?.color || 'var(--text-light)'
              }}
            >
              {msg.policy_decision}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-light)' }}>
          {msg.token_count > 0 && <span className="font-mono">{msg.token_count} tokens</span>}
          <span>{new Date(msg.created_at + 'Z').toLocaleTimeString()}</span>
        </div>
      </div>
      <div className="text-sm whitespace-pre-wrap break-words" style={{ color: 'var(--text-medium)' }}>
        {msg.content}
      </div>
    </div>
  );
}

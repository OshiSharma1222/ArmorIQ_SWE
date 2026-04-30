import { useState, useEffect, useRef } from 'react';
import { sendChat, approveToolCall, rejectToolCall, getPendingApprovals } from '../api/index.js';

export default function AgentChat({ ws }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [approvals, setApprovals] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    getPendingApprovals().then(setApprovals).catch(() => {});
  }, []);

  useEffect(() => {
    if (!ws?.addListener) return;
    return ws.addListener((msg) => {
      if (msg.type === 'tool_call') {
        setMessages(prev => [...prev, { type: 'tool_call', tool: msg.tool, args: msg.args, policy: msg.policy }]);
      } else if (msg.type === 'tool_result') {
        setMessages(prev => [...prev, { type: 'tool_result', tool: msg.tool, result: msg.result, isError: msg.isError }]);
      } else if (msg.type === 'approval_needed') {
        setApprovals(prev => [...prev, { id: msg.approvalId, tool_name: msg.tool, arguments: JSON.stringify(msg.args) }]);
      }
    });
  }, [ws]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { type: 'user', content: userMsg }]);
    setLoading(true);
    try {
      const result = await sendChat(userMsg);
      setMessages(prev => [...prev, { type: 'assistant', content: result.response, tokens: result.totalTokens }]);
    } catch (err) {
      setMessages(prev => [...prev, { type: 'error', content: err.message }]);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(id) {
    try { await approveToolCall(id); setApprovals(prev => prev.filter(a => a.id !== id)); }
    catch (err) { alert(err.message); }
  }

  async function handleReject(id) {
    try { await rejectToolCall(id); setApprovals(prev => prev.filter(a => a.id !== id)); }
    catch (err) { alert(err.message); }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-57px)] sm:h-[calc(100vh-65px)]">
      {approvals.length > 0 && (
        <div className="px-4 sm:px-8 py-3 animate-slide-up" style={{ background: 'linear-gradient(135deg, rgba(224,123,76,0.06), rgba(244,162,97,0.04))', borderBottom: '1px solid var(--border-light)' }}>
          <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--primary)' }}>Pending Approvals</p>
          {approvals.map(a => (
            <div key={a.id} className="card flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 mb-2 animate-fade-in-scale">
              <div className="flex items-center gap-3 mb-2 sm:mb-0 min-w-0">
                <div className="w-2 h-2 rounded-full shrink-0 animate-pulse-dot" style={{ background: 'var(--primary)' }} />
                <span className="text-sm font-mono font-semibold truncate" style={{ color: 'var(--text-dark)' }}>{a.tool_name}</span>
                <span className="text-xs font-mono truncate hidden sm:inline" style={{ color: 'var(--text-light)' }}>{a.arguments}</span>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => handleApprove(a.id)} className="btn-primary text-xs py-1.5 px-4" style={{ background: 'var(--success)' }}>Approve</button>
                <button onClick={() => handleReject(a.id)} className="btn-primary text-xs py-1.5 px-4" style={{ background: 'var(--danger)' }}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in px-4">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl mx-auto mb-6 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(224,123,76,0.1), rgba(244,162,97,0.05))', border: '1px solid var(--border-light)' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <defs>
                  <linearGradient id="chatGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="var(--primary)"/>
                    <stop offset="100%" stopColor="#F4A261"/>
                  </linearGradient>
                </defs>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="url(#chatGrad)"/>
              </svg>
            </div>
            <h2 className="text-lg sm:text-xl font-bold mb-2" style={{ color: 'var(--text-dark)', fontFamily: 'var(--font-display)' }}>
              Start a conversation
            </h2>
            <p className="text-sm max-w-md" style={{ color: 'var(--text-light)', lineHeight: '1.6' }}>
              Ask the agent to use tools from connected MCP servers. Guardrail policies control what it can do.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-6">
              {['Create a note', 'List all notes', "What's the weather?"].map((s, i) => (
                <button
                  key={i}
                  onClick={() => setInput(s)}
                  className="text-xs px-4 py-2 rounded-full transition-all hover:scale-105"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-medium)', cursor: 'pointer' }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3 max-w-3xl mx-auto">
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} index={i} />
          ))}

          {loading && (
            <div className="flex items-center gap-3 py-3 animate-fade-in">
              <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <div className="flex gap-1.5 items-center">
                <span className="w-2 h-2 rounded-full animate-pulse-dot" style={{ background: 'var(--primary)' }} />
                <span className="w-2 h-2 rounded-full animate-pulse-dot" style={{ background: 'var(--primary)', animationDelay: '0.2s' }} />
                <span className="w-2 h-2 rounded-full animate-pulse-dot" style={{ background: 'var(--primary)', animationDelay: '0.4s' }} />
              </div>
              <span className="text-xs" style={{ color: 'var(--text-light)' }}>Thinking...</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="px-4 sm:px-8 py-4 glass" style={{ borderTop: '1px solid var(--border-light)' }}>
        <form onSubmit={handleSend} className="flex gap-2 sm:gap-3 max-w-3xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask the agent something..."
            disabled={loading}
            className="input-field flex-1 disabled:opacity-50"
            style={{ borderRadius: 'var(--radius-xl)', padding: '12px 20px' }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="btn-primary shrink-0 flex items-center gap-2"
            style={{ borderRadius: 'var(--radius-xl)', padding: '12px 20px' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({ msg, index }) {
  const delay = Math.min(index * 0.05, 0.3);

  if (msg.type === 'user') {
    return (
      <div className="flex justify-end animate-fade-in" style={{ animationDelay: `${delay}s` }}>
        <div className="max-w-[85%] sm:max-w-md">
          <div className="px-4 sm:px-5 py-3 rounded-2xl rounded-tr-md text-sm" style={{ background: 'linear-gradient(135deg, var(--primary), #D06A3B)', color: 'white', fontWeight: 500, boxShadow: '0 2px 8px rgba(224,123,76,0.25)' }}>
            {msg.content}
          </div>
        </div>
      </div>
    );
  }

  if (msg.type === 'assistant') {
    return (
      <div className="flex justify-start gap-2 sm:gap-3 animate-fade-in" style={{ animationDelay: `${delay}s` }}>
        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <div className="max-w-[85%] sm:max-w-xl">
          <div className="card px-4 sm:px-5 py-3 rounded-2xl rounded-tl-md text-sm" style={{ color: 'var(--text-dark)' }}>
            <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
            {msg.tokens > 0 && (
              <div className="text-[10px] mt-2 font-mono" style={{ color: 'var(--text-muted)' }}>{msg.tokens} tokens</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (msg.type === 'tool_call') {
    const blocked = msg.policy && !msg.policy.allowed && !msg.policy.needsApproval;
    const needsApproval = msg.policy?.needsApproval;
    const statusColor = blocked ? 'var(--danger)' : needsApproval ? 'var(--warning)' : 'var(--accent)';
    const statusBg = blocked ? 'rgba(239,68,68,0.06)' : needsApproval ? 'rgba(245,158,11,0.06)' : 'rgba(123,97,255,0.06)';
    const statusLabel = blocked ? 'BLOCKED' : needsApproval ? 'APPROVAL NEEDED' : 'TOOL CALL';

    return (
      <div className="animate-fade-in-scale" style={{ animationDelay: `${delay}s` }}>
        <div className="rounded-xl px-4 py-3 font-mono text-xs overflow-hidden" style={{ background: statusBg, border: `1px solid ${statusColor}20`, borderLeft: `3px solid ${statusColor}` }}>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="badge" style={{ background: `${statusColor}18`, color: statusColor }}>{statusLabel}</span>
            <span className="font-semibold" style={{ color: 'var(--text-dark)' }}>{msg.tool}</span>
          </div>
          <pre className="text-xs overflow-x-auto whitespace-pre-wrap" style={{ color: 'var(--text-light)', margin: 0 }}>
            {JSON.stringify(msg.args, null, 2)}
          </pre>
          {blocked && msg.policy.reason && (
            <div className="mt-2 text-xs font-sans font-medium" style={{ color: 'var(--danger)' }}>{msg.policy.reason}</div>
          )}
        </div>
      </div>
    );
  }

  if (msg.type === 'tool_result') {
    const color = msg.isError ? 'var(--danger)' : 'var(--success)';
    const bg = msg.isError ? 'rgba(239,68,68,0.06)' : 'rgba(34,197,94,0.06)';
    return (
      <div className="animate-fade-in-scale" style={{ animationDelay: `${delay}s` }}>
        <div className="rounded-xl px-4 py-3 font-mono text-xs overflow-hidden" style={{ background: bg, border: `1px solid ${color}20`, borderLeft: `3px solid ${color}` }}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="badge" style={{ background: `${color}18`, color: color }}>{msg.isError ? 'ERROR' : 'RESULT'}</span>
            <span className="font-semibold" style={{ color: 'var(--text-dark)' }}>{msg.tool}</span>
          </div>
          <pre className="text-xs overflow-x-auto whitespace-pre-wrap" style={{ color: 'var(--text-medium)', margin: 0 }}>
            {msg.result}
          </pre>
        </div>
      </div>
    );
  }

  if (msg.type === 'error') {
    return (
      <div className="animate-fade-in" style={{ animationDelay: `${delay}s` }}>
        <div className="card px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.2)', color: 'var(--danger)' }}>
          <span className="font-semibold">Error:</span> {msg.content}
        </div>
      </div>
    );
  }

  return null;
}

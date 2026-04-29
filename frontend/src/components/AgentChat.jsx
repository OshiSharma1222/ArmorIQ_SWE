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
    <div className="flex flex-col h-[calc(100vh-73px)]">
      {approvals.length > 0 && (
        <div className="px-8 py-4 animate-fade-in" style={{ background: 'rgba(224, 123, 76, 0.06)', borderBottom: '1px solid var(--border)' }}>
          <p className="text-sm font-bold mb-3" style={{ color: 'var(--primary)' }}>Pending Approvals</p>
          {approvals.map(a => (
            <div
              key={a.id}
              className="flex items-center justify-between rounded-xl p-4 mb-2"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full animate-pulse-dot" style={{ background: 'var(--primary)' }} />
                <span className="text-sm font-mono" style={{ color: 'var(--text-dark)', fontWeight: 700 }}>{a.tool_name}</span>
                <span className="text-xs font-mono" style={{ color: 'var(--text-light)' }}>{a.arguments}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(a.id)}
                  className="text-xs px-4 py-1.5 rounded-lg transition-all duration-200 cursor-pointer"
                  style={{ background: '#4CAF50', color: 'white', fontWeight: 500 }}
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReject(a.id)}
                  className="text-xs px-4 py-1.5 rounded-lg transition-all duration-200 cursor-pointer"
                  style={{ background: '#D32F2F', color: 'white', fontWeight: 500 }}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-24 animate-fade-in">
            <div className="w-20 h-20 rounded-2xl mx-auto mb-5 flex items-center justify-center" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <p className="text-base" style={{ color: 'var(--text-dark)', fontWeight: 700 }}>
              Start a conversation
            </p>
            <p className="text-sm mt-2 max-w-sm mx-auto" style={{ color: 'var(--text-light)' }}>
              The agent can use tools from connected MCP servers. Guardrail policies control what it can do.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}

        {loading && (
          <div className="flex items-center gap-3 py-2 animate-fade-in">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: 'var(--primary)', animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: 'var(--primary)', animationDelay: '200ms' }} />
              <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: 'var(--primary)', animationDelay: '400ms' }} />
            </div>
            <span className="text-sm" style={{ color: 'var(--text-light)' }}>Agent is thinking...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSend}
        className="px-8 py-5 flex gap-3"
        style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-subtle)' }}
      >
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask the agent something..."
          disabled={loading}
          className="flex-1 rounded-xl px-5 py-3 text-sm outline-none transition-all duration-200 disabled:opacity-50"
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            color: 'var(--text-dark)',
            fontFamily: 'var(--font-sunflower)',
            fontWeight: 500
          }}
          onFocus={e => e.target.style.borderColor = 'var(--primary)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-6 py-3 rounded-xl text-sm transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: 'var(--primary)',
            color: 'white',
            fontWeight: 500,
            fontFamily: 'var(--font-sunflower)'
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
}

function MessageBubble({ msg }) {
  if (msg.type === 'user') {
    return (
      <div className="flex justify-end animate-fade-in">
        <div
          className="px-5 py-3 rounded-2xl rounded-tr-md max-w-lg text-sm"
          style={{ background: 'var(--primary)', color: 'white', fontWeight: 500 }}
        >
          {msg.content}
        </div>
      </div>
    );
  }

  if (msg.type === 'assistant') {
    return (
      <div className="flex justify-start animate-fade-in">
        <div
          className="px-5 py-3 rounded-2xl rounded-tl-md max-w-2xl text-sm"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-dark)' }}
        >
          <div className="whitespace-pre-wrap">{msg.content}</div>
          {msg.tokens > 0 && (
            <div className="text-xs mt-2" style={{ color: 'var(--text-light)' }}>{msg.tokens} tokens</div>
          )}
        </div>
      </div>
    );
  }

  if (msg.type === 'tool_call') {
    const blocked = msg.policy && !msg.policy.allowed && !msg.policy.needsApproval;
    const needsApproval = msg.policy?.needsApproval;

    const borderColor = blocked ? '#D32F2F' : needsApproval ? '#E07B4C' : 'var(--border)';
    const bgColor = blocked ? 'rgba(211, 47, 47, 0.04)' : needsApproval ? 'rgba(224, 123, 76, 0.04)' : 'var(--bg-subtle)';
    const labelColor = blocked ? '#D32F2F' : needsApproval ? '#E07B4C' : 'var(--text-light)';

    return (
      <div
        className="text-xs rounded-xl px-4 py-3 font-mono animate-fade-in"
        style={{ background: bgColor, border: `1px solid ${borderColor}` }}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: borderColor }} />
          <span style={{ color: labelColor, fontWeight: 700 }}>
            {blocked ? 'BLOCKED' : needsApproval ? 'APPROVAL NEEDED' : 'Tool Call'}
          </span>
          <span style={{ color: 'var(--text-dark)', fontWeight: 700 }}>{msg.tool}</span>
        </div>
        <pre className="mt-1 text-xs overflow-x-auto" style={{ color: 'var(--text-light)' }}>
          {JSON.stringify(msg.args, null, 2)}
        </pre>
        {blocked && msg.policy.reason && (
          <div className="mt-2 text-xs" style={{ color: '#D32F2F' }}>{msg.policy.reason}</div>
        )}
      </div>
    );
  }

  if (msg.type === 'tool_result') {
    return (
      <div
        className="text-xs rounded-xl px-4 py-3 font-mono animate-fade-in"
        style={{
          background: msg.isError ? 'rgba(211, 47, 47, 0.04)' : 'rgba(76, 175, 80, 0.04)',
          border: `1px solid ${msg.isError ? '#D32F2F' : '#4CAF50'}`
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: msg.isError ? '#D32F2F' : '#4CAF50' }} />
          <span style={{ color: msg.isError ? '#D32F2F' : '#4CAF50', fontWeight: 700 }}>Result</span>
          <span style={{ color: 'var(--text-dark)', fontWeight: 700 }}>{msg.tool}</span>
        </div>
        <pre className="mt-1 text-xs overflow-x-auto whitespace-pre-wrap" style={{ color: 'var(--text-medium)' }}>
          {msg.result}
        </pre>
      </div>
    );
  }

  if (msg.type === 'error') {
    return (
      <div
        className="px-5 py-3 rounded-xl text-sm animate-fade-in"
        style={{ background: 'rgba(211, 47, 47, 0.06)', border: '1px solid #D32F2F', color: '#D32F2F' }}
      >
        Error: {msg.content}
      </div>
    );
  }

  return null;
}

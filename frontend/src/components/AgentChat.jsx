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
        setMessages(prev => [...prev, {
          type: 'tool_call',
          tool: msg.tool,
          args: msg.args,
          policy: msg.policy
        }]);
      } else if (msg.type === 'tool_result') {
        setMessages(prev => [...prev, {
          type: 'tool_result',
          tool: msg.tool,
          result: msg.result,
          isError: msg.isError
        }]);
      } else if (msg.type === 'approval_needed') {
        setApprovals(prev => [...prev, {
          id: msg.approvalId,
          tool_name: msg.tool,
          arguments: JSON.stringify(msg.args)
        }]);
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
      setMessages(prev => [...prev, {
        type: 'assistant',
        content: result.response,
        tokens: result.totalTokens
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        type: 'error',
        content: err.message
      }]);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(id) {
    try {
      await approveToolCall(id);
      setApprovals(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleReject(id) {
    try {
      await rejectToolCall(id);
      setApprovals(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {approvals.length > 0 && (
        <div className="border-b border-slate-700 bg-yellow-500/10 px-6 py-3">
          <p className="text-sm font-medium text-yellow-400 mb-2">Pending Approvals</p>
          {approvals.map(a => (
            <div key={a.id} className="flex items-center justify-between bg-slate-800 rounded p-3 mb-2">
              <div>
                <span className="text-sm text-white font-mono">{a.tool_name}</span>
                <span className="text-xs text-slate-400 ml-2">{a.arguments}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(a.id)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1 rounded transition-colors"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReject(a.id)}
                  className="bg-red-600 hover:bg-red-500 text-white text-xs px-3 py-1 rounded transition-colors"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-20 text-slate-500">
            <p className="text-lg">Send a message to start chatting with the agent</p>
            <p className="text-sm mt-2">
              The agent can use tools from connected MCP servers.
              Guardrail policies will control what it can do.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <span className="inline-block w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            Agent is thinking...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="border-t border-slate-700 px-6 py-4 flex gap-3">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask the agent something..."
          disabled={loading}
          className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm px-5 py-2.5 rounded-lg transition-colors"
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
      <div className="flex justify-end">
        <div className="bg-blue-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-lg text-sm">
          {msg.content}
        </div>
      </div>
    );
  }

  if (msg.type === 'assistant') {
    return (
      <div className="flex justify-start">
        <div className="bg-slate-800 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-2xl rounded-tl-sm max-w-2xl text-sm">
          <div className="whitespace-pre-wrap">{msg.content}</div>
          {msg.tokens > 0 && (
            <div className="text-xs text-slate-500 mt-2">{msg.tokens} tokens used</div>
          )}
        </div>
      </div>
    );
  }

  if (msg.type === 'tool_call') {
    const blocked = msg.policy && !msg.policy.allowed && !msg.policy.needsApproval;
    const needsApproval = msg.policy?.needsApproval;

    return (
      <div className={`text-xs rounded-lg px-3 py-2 font-mono border ${
        blocked
          ? 'bg-red-500/10 border-red-500/30 text-red-300'
          : needsApproval
            ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'
            : 'bg-slate-800/50 border-slate-700 text-slate-400'
      }`}>
        <span className="font-semibold">
          {blocked ? '[BLOCKED] ' : needsApproval ? '[APPROVAL NEEDED] ' : ''}
          Tool call: {msg.tool}
        </span>
        <pre className="mt-1 text-xs opacity-80 overflow-x-auto">
          {JSON.stringify(msg.args, null, 2)}
        </pre>
        {blocked && msg.policy.reason && (
          <div className="mt-1 text-red-400">{msg.policy.reason}</div>
        )}
      </div>
    );
  }

  if (msg.type === 'tool_result') {
    return (
      <div className={`text-xs rounded-lg px-3 py-2 font-mono border ${
        msg.isError
          ? 'bg-red-500/10 border-red-500/30 text-red-300'
          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
      }`}>
        <span className="font-semibold">Result from {msg.tool}:</span>
        <pre className="mt-1 text-xs opacity-80 overflow-x-auto whitespace-pre-wrap">
          {msg.result}
        </pre>
      </div>
    );
  }

  if (msg.type === 'error') {
    return (
      <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-2.5 rounded-lg text-sm">
        Error: {msg.content}
      </div>
    );
  }

  return null;
}

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
        <span className="text-slate-400">Loading conversations...</span>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)]">
      <div className="w-80 border-r border-slate-700 overflow-y-auto">
        <div className="p-4 border-b border-slate-700">
          <h2 className="text-sm font-semibold text-white">Conversations</h2>
          <p className="text-xs text-slate-500 mt-1">{conversations.length} total</p>
        </div>

        {conversations.length === 0 ? (
          <div className="p-4 text-sm text-slate-500 text-center">
            No conversations yet
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {conversations.map(c => (
              <button
                key={c.id}
                onClick={() => selectConversation(c.id)}
                className={`w-full text-left px-4 py-3 transition-colors ${
                  selected === c.id
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:bg-slate-800/50'
                }`}
              >
                <div className="text-sm font-medium">Conversation #{c.id}</div>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                  <span>{c.message_count || 0} messages</span>
                  <span>{c.total_tokens || 0} tokens</span>
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  {new Date(c.created_at + 'Z').toLocaleString()}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {!detail ? (
          <div className="flex items-center justify-center h-full text-slate-500 text-sm">
            {selected ? 'Loading...' : 'Select a conversation to view details'}
          </div>
        ) : (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">
                Conversation #{detail.id}
              </h3>
              <span className="text-xs text-slate-500">
                {new Date(detail.created_at + 'Z').toLocaleString()}
              </span>
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
  const roleStyles = {
    user: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
    assistant: 'bg-slate-800 border-slate-700 text-slate-200',
    tool_call: 'bg-slate-800/50 border-slate-700 text-slate-400',
    tool_result: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
    policy: 'bg-red-500/10 border-red-500/30 text-red-300'
  };

  const roleLabels = {
    user: 'User',
    assistant: 'Assistant',
    tool_call: 'Tool Call',
    tool_result: 'Tool Result',
    policy: 'Policy Decision'
  };

  const style = roleStyles[msg.role] || roleStyles.assistant;

  return (
    <div className={`border rounded-lg px-4 py-3 ${style}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide opacity-70">
            {roleLabels[msg.role] || msg.role}
          </span>
          {msg.tool_name && (
            <span className="text-xs font-mono bg-black/20 px-1.5 py-0.5 rounded">
              {msg.tool_name}
            </span>
          )}
          {msg.policy_decision && (
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              msg.policy_decision === 'allowed'
                ? 'bg-emerald-500/20 text-emerald-400'
                : msg.policy_decision === 'blocked'
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-yellow-500/20 text-yellow-400'
            }`}>
              {msg.policy_decision}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs opacity-50">
          {msg.token_count > 0 && <span>{msg.token_count} tokens</span>}
          <span>{new Date(msg.created_at + 'Z').toLocaleTimeString()}</span>
        </div>
      </div>
      <div className="text-sm whitespace-pre-wrap break-words">{msg.content}</div>
    </div>
  );
}

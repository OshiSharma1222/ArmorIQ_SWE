import { useState } from 'react'
import useWebSocket from './hooks/useWebSocket.js'
import PolicyManager from './components/PolicyManager.jsx'
import AgentChat from './components/AgentChat.jsx'
import ConversationLogs from './components/ConversationLogs.jsx'

const TABS = [
  { key: 'Chat', label: 'Chat' },
  { key: 'Policies', label: 'Policies' },
  { key: 'Logs', label: 'Logs' }
];

function App() {
  const [activeTab, setActiveTab] = useState('Chat');
  const ws = useWebSocket();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <header className="px-8 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--primary)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <h1 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-dark)', fontFamily: 'var(--font-sunflower)', fontWeight: 700 }}>
              ArmorIQ
            </h1>
          </div>
          <span
            className="text-xs px-2.5 py-1 rounded-full font-medium"
            style={{ background: 'var(--bg-subtle)', color: 'var(--text-light)', border: '1px solid var(--border-light)' }}
          >
            Guarded Agent
          </span>
        </div>

        <div className="flex items-center gap-6">
          <nav className="flex gap-1">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="px-4 py-2 text-sm rounded-lg transition-all duration-200"
                style={{
                  fontFamily: 'var(--font-sunflower)',
                  fontWeight: activeTab === tab.key ? 700 : 500,
                  color: activeTab === tab.key ? 'var(--primary)' : 'var(--text-light)',
                  background: activeTab === tab.key ? 'rgba(224, 123, 76, 0.08)' : 'transparent'
                }}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 pl-6" style={{ borderLeft: '1px solid var(--border-light)' }}>
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: ws.connected ? '#4CAF50' : '#E07B4C' }}
            />
            <span className="text-xs" style={{ color: 'var(--text-light)' }}>
              {ws.connected ? 'Live' : 'Offline'}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        {activeTab === 'Chat' && <AgentChat ws={ws} />}
        {activeTab === 'Policies' && <PolicyManager ws={ws} />}
        {activeTab === 'Logs' && <ConversationLogs />}
      </main>
    </div>
  )
}

export default App

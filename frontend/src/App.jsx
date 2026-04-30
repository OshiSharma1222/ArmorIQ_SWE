import { useState } from 'react'
import useWebSocket from './hooks/useWebSocket.js'
import PolicyManager from './components/PolicyManager.jsx'
import AgentChat from './components/AgentChat.jsx'
import ConversationLogs from './components/ConversationLogs.jsx'

const TABS = [
  { key: 'Chat', label: 'Chat', icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
  { key: 'Policies', label: 'Policies', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
  { key: 'Logs', label: 'Logs', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8' }
];

function App() {
  const [activeTab, setActiveTab] = useState('Chat');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const ws = useWebSocket();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <header className="glass sticky top-0 z-50 px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center animate-glow-pulse" style={{ background: 'linear-gradient(135deg, var(--primary), #F4A261)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight leading-none" style={{ color: 'var(--text-dark)', fontFamily: 'var(--font-display)' }}>
              ArmorIQ
            </h1>
            <span className="text-[10px] sm:text-xs hidden sm:inline" style={{ color: 'var(--text-light)' }}>Guarded Agent</span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-subtle)' }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-all duration-200"
              style={{
                fontWeight: activeTab === tab.key ? 600 : 500,
                color: activeTab === tab.key ? 'white' : 'var(--text-light)',
                background: activeTab === tab.key ? 'var(--primary)' : 'transparent',
                boxShadow: activeTab === tab.key ? 'var(--shadow-md)' : 'none'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={tab.icon}/>
              </svg>
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: ws.connected ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)' }}>
            <span className="relative flex h-2 w-2">
              {ws.connected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: 'var(--success)' }} />}
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: ws.connected ? 'var(--success)' : 'var(--danger)' }} />
            </span>
            <span className="text-xs font-medium hidden sm:inline" style={{ color: ws.connected ? 'var(--success)' : 'var(--danger)' }}>
              {ws.connected ? 'Live' : 'Offline'}
            </span>
          </div>

          <button
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
            style={{ background: mobileMenuOpen ? 'var(--bg-subtle)' : 'transparent' }}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-medium)" strokeWidth="2" strokeLinecap="round">
              {mobileMenuOpen
                ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                : <><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></>
              }
            </svg>
          </button>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="md:hidden glass animate-fade-in p-3" style={{ borderBottom: '1px solid var(--border-light)' }}>
          <div className="flex gap-2">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setMobileMenuOpen(false); }}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all"
                style={{
                  color: activeTab === tab.key ? 'white' : 'var(--text-light)',
                  background: activeTab === tab.key ? 'var(--primary)' : 'var(--bg-subtle)',
                  boxShadow: activeTab === tab.key ? 'var(--shadow-md)' : 'none'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={tab.icon}/>
                </svg>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <main className="flex-1 overflow-hidden">
        {activeTab === 'Chat' && <AgentChat ws={ws} />}
        {activeTab === 'Policies' && <PolicyManager ws={ws} />}
        {activeTab === 'Logs' && <ConversationLogs />}
      </main>
    </div>
  )
}

export default App

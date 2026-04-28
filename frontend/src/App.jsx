import { useState } from 'react'
import useWebSocket from './hooks/useWebSocket.js'
import PolicyManager from './components/PolicyManager.jsx'
import AgentChat from './components/AgentChat.jsx'
import ConversationLogs from './components/ConversationLogs.jsx'

const TABS = ['Chat', 'Policies', 'Logs'];

function App() {
  const [activeTab, setActiveTab] = useState('Chat');
  const ws = useWebSocket();

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 flex flex-col">
      <header className="border-b border-slate-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight text-white">ArmorIQ</h1>
          <span className="text-xs bg-slate-700 px-2 py-0.5 rounded text-slate-400">
            Guarded Agent
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${ws.connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
          <span className="text-xs text-slate-400">
            {ws.connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </header>

      <nav className="border-b border-slate-700 px-6">
        <div className="flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </nav>

      <main className="flex-1 overflow-hidden">
        {activeTab === 'Chat' && <AgentChat ws={ws} />}
        {activeTab === 'Policies' && <PolicyManager ws={ws} />}
        {activeTab === 'Logs' && <ConversationLogs />}
      </main>
    </div>
  )
}

export default App

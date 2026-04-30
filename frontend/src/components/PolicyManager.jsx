import { useState, useEffect, useCallback } from 'react';
import { getPolicies, createPolicy, deletePolicy, togglePolicy, getTools } from '../api/index.js';

const RULE_TYPES = [
  { value: 'block', label: 'Block', description: 'Completely block this tool', color: 'var(--danger)', icon: 'M18.36 5.64l-12.72 12.72 M5.64 5.64l12.72 12.72' },
  { value: 'require_approval', label: 'Approval', description: 'Require human approval first', color: 'var(--warning)', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
  { value: 'input_validation', label: 'Validation', description: 'Validate arguments via regex', color: 'var(--accent)', icon: 'M9 11l3 3L22 4 M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11' }
];

export default function PolicyManager({ ws }) {
  const [policies, setPolicies] = useState([]);
  const [tools, setTools] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', type: 'block', tool_name: '*', config: {} });
  const [validationField, setValidationField] = useState('');
  const [validationPattern, setValidationPattern] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [policyData, toolData] = await Promise.all([getPolicies(), getTools()]);
      setPolicies(policyData);
      setTools(toolData);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!ws?.addListener) return;
    return ws.addListener((msg) => {
      if (msg.type === 'policy_update') loadData();
    });
  }, [ws, loadData]);

  async function handleCreate(e) {
    e.preventDefault();
    const config = form.type === 'input_validation'
      ? { field: validationField, pattern: validationPattern }
      : {};
    try {
      await createPolicy({ ...form, config });
      setShowForm(false);
      setForm({ name: '', type: 'block', tool_name: '*', config: {} });
      setValidationField('');
      setValidationPattern('');
      await loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleToggle(id) {
    try { await togglePolicy(id); await loadData(); }
    catch (err) { alert(err.message); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this policy?')) return;
    try { await deletePolicy(id); await loadData(); }
    catch (err) { alert(err.message); }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl shimmer-bg" />
          <span className="text-sm" style={{ color: 'var(--text-light)' }}>Loading policies...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-dark)', fontFamily: 'var(--font-display)' }}>
            Guardrail Policies
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-light)' }}>
            {policies.length} rule{policies.length !== 1 ? 's' : ''} controlling the agent
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={showForm ? 'btn-ghost' : 'btn-primary'}
        >
          {showForm ? 'Cancel' : '+ New Policy'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card p-5 sm:p-6 mb-6 sm:mb-8 animate-fade-in-scale">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 mb-5">
            <div>
              <label className="block text-sm mb-2 font-medium" style={{ color: 'var(--text-medium)' }}>Policy Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="input-field"
                placeholder="e.g. Block delete operations"
              />
            </div>
            <div>
              <label className="block text-sm mb-2 font-medium" style={{ color: 'var(--text-medium)' }}>Target Tool</label>
              <select
                value={form.tool_name}
                onChange={e => setForm({ ...form, tool_name: e.target.value })}
                className="input-field cursor-pointer"
              >
                <option value="*">All Tools (*)</option>
                {tools.map(t => (
                  <option key={t.name} value={t.name}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-sm mb-3 font-medium" style={{ color: 'var(--text-medium)' }}>Rule Type</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {RULE_TYPES.map(rt => {
                const selected = form.type === rt.value;
                return (
                  <button
                    key={rt.value}
                    type="button"
                    onClick={() => setForm({ ...form, type: rt.value })}
                    className="p-4 rounded-xl text-left transition-all duration-200 cursor-pointer"
                    style={{
                      background: selected ? 'var(--bg-card)' : 'transparent',
                      border: selected ? `2px solid ${rt.color}` : '1px solid var(--border)',
                      boxShadow: selected ? `0 0 0 3px ${rt.color}15` : 'none'
                    }}
                  >
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${rt.color}12` }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={rt.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d={rt.icon}/>
                        </svg>
                      </div>
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-dark)' }}>{rt.label}</span>
                    </div>
                    <div className="text-xs leading-relaxed" style={{ color: 'var(--text-light)' }}>{rt.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {form.type === 'input_validation' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 mb-5 animate-fade-in">
              <div>
                <label className="block text-sm mb-2 font-medium" style={{ color: 'var(--text-medium)' }}>Field Name</label>
                <input
                  type="text"
                  value={validationField}
                  onChange={e => setValidationField(e.target.value)}
                  className="input-field"
                  placeholder="e.g. path, content"
                />
              </div>
              <div>
                <label className="block text-sm mb-2 font-medium" style={{ color: 'var(--text-medium)' }}>Regex Pattern</label>
                <input
                  type="text"
                  value={validationPattern}
                  onChange={e => setValidationPattern(e.target.value)}
                  className="input-field font-mono"
                  placeholder="e.g. ^/sandbox/"
                />
              </div>
            </div>
          )}

          <button type="submit" className="btn-primary">Create Policy</button>
        </form>
      )}

      {policies.length === 0 ? (
        <div className="text-center py-16 sm:py-20 animate-fade-in">
          <div className="w-20 h-20 rounded-2xl mx-auto mb-5 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(224,123,76,0.1), rgba(244,162,97,0.05))', border: '1px solid var(--border-light)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <p className="text-base font-semibold" style={{ color: 'var(--text-medium)' }}>No policies configured</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-light)' }}>Create one to start controlling the agent</p>
        </div>
      ) : (
        <div className="space-y-3">
          {policies.map((policy, i) => {
            const ruleType = RULE_TYPES.find(r => r.value === policy.type);
            return (
              <div
                key={policy.id}
                className="card p-4 sm:p-5 animate-fade-in"
                style={{ opacity: policy.enabled ? 1 : 0.55, animationDelay: `${i * 0.05}s` }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${ruleType?.color || 'var(--text-light)'}12` }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={ruleType?.color || 'var(--text-light)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d={ruleType?.icon || 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'}/>
                        </svg>
                      </div>
                      <span className="font-semibold text-sm" style={{ color: 'var(--text-dark)' }}>{policy.name}</span>
                      <span className="badge" style={{ background: `${ruleType?.color || 'var(--text-light)'}12`, color: ruleType?.color || 'var(--text-light)' }}>
                        {policy.type.replace('_', ' ')}
                      </span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded-md" style={{ background: 'var(--bg-subtle)', color: 'var(--text-light)' }}>
                        {policy.tool_name}
                      </span>
                    </div>
                    {policy.config && policy.config !== '{}' && (
                      <div className="text-xs font-mono mt-2 ml-9 truncate" style={{ color: 'var(--text-light)' }}>
                        {typeof policy.config === 'string' ? policy.config : JSON.stringify(policy.config)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 sm:gap-4 ml-9 sm:ml-0">
                    <button
                      onClick={() => handleToggle(policy.id)}
                      className="w-11 h-6 rounded-full transition-all duration-200 relative cursor-pointer shrink-0"
                      style={{ background: policy.enabled ? 'var(--primary)' : 'var(--border)' }}
                    >
                      <span
                        className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200"
                        style={{ left: policy.enabled ? '24px' : '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }}
                      />
                    </button>
                    <button
                      onClick={() => handleDelete(policy.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg transition-all cursor-pointer"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

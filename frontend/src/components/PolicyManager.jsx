import { useState, useEffect, useCallback } from 'react';
import { getPolicies, createPolicy, deletePolicy, togglePolicy, getTools } from '../api/index.js';

const RULE_TYPES = [
  { value: 'block', label: 'Block', description: 'Completely block this tool from executing', color: '#D32F2F' },
  { value: 'require_approval', label: 'Require Approval', description: 'Require human approval before executing', color: '#E07B4C' },
  { value: 'input_validation', label: 'Input Validation', description: 'Validate tool arguments against a pattern', color: '#7B61FF' }
];

export default function PolicyManager({ ws }) {
  const [policies, setPolicies] = useState([]);
  const [tools, setTools] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: '',
    type: 'block',
    tool_name: '*',
    config: {}
  });
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
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full animate-pulse-dot" style={{ background: 'var(--primary)' }} />
          <span style={{ color: 'var(--text-light)' }}>Loading policies...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-dark)', fontWeight: 700 }}>
            Guardrail Policies
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-light)' }}>
            Define rules that control how the agent uses its tools
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-sm px-5 py-2.5 rounded-lg transition-all duration-200 cursor-pointer"
          style={{
            background: showForm ? 'var(--bg-subtle)' : 'var(--primary)',
            color: showForm ? 'var(--text-medium)' : 'white',
            border: showForm ? '1px solid var(--border)' : 'none',
            fontWeight: 500
          }}
        >
          {showForm ? 'Cancel' : 'New Policy'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-xl p-6 mb-8 animate-fade-in"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
        >
          <div className="grid grid-cols-2 gap-5 mb-5">
            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--text-medium)', fontWeight: 500 }}>
                Policy Name
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-colors"
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-dark)',
                  fontFamily: 'var(--font-sunflower)'
                }}
                placeholder="e.g. Block delete operations"
              />
            </div>
            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--text-medium)', fontWeight: 500 }}>
                Tool
              </label>
              <select
                value={form.tool_name}
                onChange={e => setForm({ ...form, tool_name: e.target.value })}
                className="w-full rounded-lg px-4 py-2.5 text-sm outline-none cursor-pointer"
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-dark)',
                  fontFamily: 'var(--font-sunflower)'
                }}
              >
                <option value="*">All Tools (*)</option>
                {tools.map(t => (
                  <option key={t.name} value={t.name}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-sm mb-3" style={{ color: 'var(--text-medium)', fontWeight: 500 }}>
              Rule Type
            </label>
            <div className="grid grid-cols-3 gap-3">
              {RULE_TYPES.map(rt => (
                <button
                  key={rt.value}
                  type="button"
                  onClick={() => setForm({ ...form, type: rt.value })}
                  className="p-4 rounded-xl text-left text-sm transition-all duration-200 cursor-pointer"
                  style={{
                    background: form.type === rt.value ? 'var(--bg)' : 'transparent',
                    border: form.type === rt.value
                      ? `2px solid ${rt.color}`
                      : '1px solid var(--border)',
                    boxShadow: form.type === rt.value ? '0 2px 8px rgba(0,0,0,0.06)' : 'none'
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: rt.color }} />
                    <span style={{ color: 'var(--text-dark)', fontWeight: 700 }}>{rt.label}</span>
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-light)' }}>{rt.description}</div>
                </button>
              ))}
            </div>
          </div>

          {form.type === 'input_validation' && (
            <div className="grid grid-cols-2 gap-5 mb-5 animate-fade-in">
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-medium)', fontWeight: 500 }}>
                  Field Name
                </label>
                <input
                  type="text"
                  value={validationField}
                  onChange={e => setValidationField(e.target.value)}
                  className="w-full rounded-lg px-4 py-2.5 text-sm outline-none"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-dark)' }}
                  placeholder="e.g. path, content"
                />
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-medium)', fontWeight: 500 }}>
                  Regex Pattern
                </label>
                <input
                  type="text"
                  value={validationPattern}
                  onChange={e => setValidationPattern(e.target.value)}
                  className="w-full rounded-lg px-4 py-2.5 text-sm font-mono outline-none"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-dark)' }}
                  placeholder="e.g. ^/sandbox/"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="text-sm px-6 py-2.5 rounded-lg transition-all duration-200 cursor-pointer"
            style={{ background: 'var(--primary)', color: 'white', fontWeight: 500 }}
          >
            Create Policy
          </button>
        </form>
      )}

      {policies.length === 0 ? (
        <div className="text-center py-16 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--bg-subtle)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-light)" strokeWidth="1.5" strokeLinecap="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-medium)' }}>No policies configured yet</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-light)' }}>Create one to start controlling the agent</p>
        </div>
      ) : (
        <div className="space-y-3">
          {policies.map(policy => {
            const ruleType = RULE_TYPES.find(r => r.value === policy.type);
            return (
              <div
                key={policy.id}
                className="rounded-xl p-5 flex items-center justify-between transition-all duration-200 animate-fade-in"
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  opacity: policy.enabled ? 1 : 0.5,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full" style={{ background: ruleType?.color || 'var(--text-light)' }} />
                    <span className="font-bold text-sm" style={{ color: 'var(--text-dark)' }}>{policy.name}</span>
                    <span
                      className="text-xs px-2.5 py-0.5 rounded-full"
                      style={{ background: 'var(--bg-subtle)', color: 'var(--text-light)' }}
                    >
                      {policy.type.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-mono" style={{ color: 'var(--text-light)' }}>{policy.tool_name}</span>
                  </div>
                  {policy.config && policy.config !== '{}' && (
                    <div className="text-xs font-mono mt-2 ml-5" style={{ color: 'var(--text-light)' }}>
                      {typeof policy.config === 'string' ? policy.config : JSON.stringify(policy.config)}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4 ml-6">
                  <button
                    onClick={() => handleToggle(policy.id)}
                    className="w-11 h-6 rounded-full transition-all duration-200 relative cursor-pointer"
                    style={{
                      background: policy.enabled ? 'var(--primary)' : 'var(--border)'
                    }}
                  >
                    <span
                      className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200"
                      style={{
                        left: policy.enabled ? '24px' : '4px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                      }}
                    />
                  </button>
                  <button
                    onClick={() => handleDelete(policy.id)}
                    className="text-xs px-3 py-1.5 rounded-lg transition-all duration-200 cursor-pointer"
                    style={{ color: 'var(--text-light)', border: '1px solid var(--border)' }}
                    onMouseEnter={e => { e.target.style.color = '#D32F2F'; e.target.style.borderColor = '#D32F2F'; }}
                    onMouseLeave={e => { e.target.style.color = 'var(--text-light)'; e.target.style.borderColor = 'var(--border)'; }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

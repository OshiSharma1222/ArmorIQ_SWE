import { useState, useEffect, useCallback } from 'react';
import { getPolicies, createPolicy, deletePolicy, togglePolicy, getTools } from '../api/index.js';

const RULE_TYPES = [
  { value: 'block', label: 'Block', description: 'Completely block this tool from executing' },
  { value: 'require_approval', label: 'Require Approval', description: 'Require human approval before executing' },
  { value: 'input_validation', label: 'Input Validation', description: 'Validate tool arguments against a pattern' }
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

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!ws?.addListener) return;
    return ws.addListener((msg) => {
      if (msg.type === 'policy_update') {
        loadData();
      }
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
    try {
      await togglePolicy(id);
      await loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this policy?')) return;
    try {
      await deletePolicy(id);
      await loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-slate-400">Loading policies...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white">Guardrail Policies</h2>
          <p className="text-sm text-slate-400 mt-1">
            Control which tools the agent can use and how
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          {showForm ? 'Cancel' : 'New Policy'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-slate-800 border border-slate-700 rounded-lg p-5 mb-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Policy Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder="e.g. Block delete operations"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Tool</label>
              <select
                value={form.tool_name}
                onChange={e => setForm({ ...form, tool_name: e.target.value })}
                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="*">All Tools (*)</option>
                {tools.map(t => (
                  <option key={t.name} value={t.name}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm text-slate-400 mb-2">Rule Type</label>
            <div className="grid grid-cols-3 gap-3">
              {RULE_TYPES.map(rt => (
                <button
                  key={rt.value}
                  type="button"
                  onClick={() => setForm({ ...form, type: rt.value })}
                  className={`p-3 rounded-lg border text-left text-sm transition-colors ${
                    form.type === rt.value
                      ? 'border-blue-500 bg-blue-500/10 text-white'
                      : 'border-slate-600 bg-slate-900 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <div className="font-medium">{rt.label}</div>
                  <div className="text-xs mt-1 opacity-70">{rt.description}</div>
                </button>
              ))}
            </div>
          </div>

          {form.type === 'input_validation' && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Field Name</label>
                <input
                  type="text"
                  value={validationField}
                  onChange={e => setValidationField(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  placeholder="e.g. path, content"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Regex Pattern</label>
                <input
                  type="text"
                  value={validationPattern}
                  onChange={e => setValidationPattern(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  placeholder="e.g. ^/sandbox/"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            Create Policy
          </button>
        </form>
      )}

      {policies.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <p>No policies configured yet.</p>
          <p className="text-sm mt-1">Create one to start controlling the agent.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {policies.map(policy => (
            <div
              key={policy.id}
              className={`bg-slate-800 border rounded-lg p-4 flex items-center justify-between ${
                policy.enabled ? 'border-slate-700' : 'border-slate-700/50 opacity-60'
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="text-white font-medium text-sm">{policy.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    policy.type === 'block' ? 'bg-red-500/20 text-red-400' :
                    policy.type === 'require_approval' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-purple-500/20 text-purple-400'
                  }`}>
                    {policy.type.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">{policy.tool_name}</span>
                </div>
                {policy.config && policy.config !== '{}' && (
                  <div className="text-xs text-slate-500 mt-1 font-mono">
                    {typeof policy.config === 'string' ? policy.config : JSON.stringify(policy.config)}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => handleToggle(policy.id)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${
                    policy.enabled ? 'bg-emerald-500' : 'bg-slate-600'
                  }`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    policy.enabled ? 'left-5' : 'left-0.5'
                  }`} />
                </button>
                <button
                  onClick={() => handleDelete(policy.id)}
                  className="text-slate-500 hover:text-red-400 text-sm px-2 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

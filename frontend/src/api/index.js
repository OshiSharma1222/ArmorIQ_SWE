const API_BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export function getPolicies() {
  return request('/policies');
}

export function createPolicy(policy) {
  return request('/policies', {
    method: 'POST',
    body: JSON.stringify(policy)
  });
}

export function updatePolicy(id, policy) {
  return request(`/policies/${id}`, {
    method: 'PUT',
    body: JSON.stringify(policy)
  });
}

export function deletePolicy(id) {
  return request(`/policies/${id}`, { method: 'DELETE' });
}

export function togglePolicy(id) {
  return request(`/policies/${id}/toggle`, { method: 'PATCH' });
}

export function sendChat(message) {
  return request('/agent/chat', {
    method: 'POST',
    body: JSON.stringify({ message })
  });
}

export function getTools() {
  return request('/agent/tools');
}

export function getConversations() {
  return request('/logs/conversations');
}

export function getConversation(id) {
  return request(`/logs/conversations/${id}`);
}

export function approveToolCall(id) {
  return request(`/agent/approve/${id}`, { method: 'POST' });
}

export function rejectToolCall(id) {
  return request(`/agent/reject/${id}`, { method: 'POST' });
}

export function getPendingApprovals() {
  return request('/agent/approvals');
}

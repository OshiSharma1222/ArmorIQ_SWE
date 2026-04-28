import db from '../db/index.js';

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /ignore\s+(all\s+)?prior\s+instructions/i,
  /you\s+are\s+now\s+/i,
  /new\s+system\s+prompt/i,
  /override\s+(your|the)\s+instructions/i,
  /disregard\s+(all\s+)?previous/i,
  /forget\s+(all\s+)?(your\s+)?instructions/i,
  /\bsystem\s*prompt\b/i,
  /\bact\s+as\s+if\b/i,
  /\bpretend\s+you\s+are\b/i,
  /\bjailbreak\b/i,
  /\bDAN\s+mode\b/i
];

class PolicyEngine {
  constructor() {
    this.cachedPolicies = null;
    this.lastRefresh = 0;
  }

  refresh() {
    this.cachedPolicies = null;
    this.lastRefresh = Date.now();
  }

  getPolicies() {
    if (!this.cachedPolicies) {
      this.cachedPolicies = db.prepare(
        'SELECT * FROM policies WHERE enabled = 1 ORDER BY type ASC'
      ).all();
    }
    return this.cachedPolicies;
  }

  evaluate(toolName, args) {
    const policies = this.getPolicies();

    const injectionCheck = this.checkInjection(args);
    if (injectionCheck) {
      return {
        allowed: false,
        reason: injectionCheck,
        policyType: 'injection_detection'
      };
    }

    const matchingPolicies = policies.filter(p =>
      p.tool_name === toolName || p.tool_name === '*'
    );

    if (matchingPolicies.length === 0) {
      return { allowed: true };
    }

    // block rules take highest priority
    const blockRule = matchingPolicies.find(p => p.type === 'block');
    if (blockRule) {
      return {
        allowed: false,
        reason: `Blocked by policy: ${blockRule.name}`,
        policyId: blockRule.id,
        policyType: 'block'
      };
    }

    // input validation rules come next
    for (const policy of matchingPolicies.filter(p => p.type === 'input_validation')) {
      const validationResult = this.runValidation(policy, toolName, args);
      if (!validationResult.passed) {
        return {
          allowed: false,
          reason: `Validation failed (${policy.name}): ${validationResult.reason}`,
          policyId: policy.id,
          policyType: 'input_validation'
        };
      }
    }

    // approval rules
    const approvalRule = matchingPolicies.find(p => p.type === 'require_approval');
    if (approvalRule) {
      return {
        allowed: false,
        needsApproval: true,
        reason: `Requires approval: ${approvalRule.name}`,
        policyId: approvalRule.id,
        policyType: 'require_approval'
      };
    }

    return { allowed: true };
  }

  runValidation(policy, toolName, args) {
    let config;
    try {
      config = typeof policy.config === 'string' ? JSON.parse(policy.config) : policy.config;
    } catch {
      return { passed: true };
    }

    if (config.pattern && config.field) {
      const value = args[config.field];
      if (value !== undefined) {
        const regex = new RegExp(config.pattern);
        if (!regex.test(String(value))) {
          return {
            passed: false,
            reason: `Field "${config.field}" does not match pattern "${config.pattern}"`
          };
        }
      }
    }

    if (config.blocked_values && config.field) {
      const value = String(args[config.field] || '').toLowerCase();
      for (const blocked of config.blocked_values) {
        if (value.includes(blocked.toLowerCase())) {
          return {
            passed: false,
            reason: `Field "${config.field}" contains blocked value "${blocked}"`
          };
        }
      }
    }

    if (config.max_length && config.field) {
      const value = String(args[config.field] || '');
      if (value.length > config.max_length) {
        return {
          passed: false,
          reason: `Field "${config.field}" exceeds max length of ${config.max_length}`
        };
      }
    }

    return { passed: true };
  }

  checkInjection(args) {
    if (!args || typeof args !== 'object') return null;

    const allValues = this.extractStringValues(args);
    for (const val of allValues) {
      for (const pattern of INJECTION_PATTERNS) {
        if (pattern.test(val)) {
          return `Potential prompt injection detected: argument matches suspicious pattern`;
        }
      }

      if (this.looksLikeBase64Injection(val)) {
        return `Potential prompt injection detected: suspicious base64-encoded content`;
      }
    }

    return null;
  }

  extractStringValues(obj) {
    const values = [];
    if (typeof obj === 'string') {
      values.push(obj);
    } else if (Array.isArray(obj)) {
      for (const item of obj) {
        values.push(...this.extractStringValues(item));
      }
    } else if (obj && typeof obj === 'object') {
      for (const val of Object.values(obj)) {
        values.push(...this.extractStringValues(val));
      }
    }
    return values;
  }

  looksLikeBase64Injection(str) {
    if (str.length < 40) return false;
    const b64Regex = /^[A-Za-z0-9+/=]{40,}$/;
    if (!b64Regex.test(str)) return false;

    try {
      const decoded = Buffer.from(str, 'base64').toString('utf-8');
      for (const pattern of INJECTION_PATTERNS) {
        if (pattern.test(decoded)) return true;
      }
    } catch {
      // not valid base64
    }
    return false;
  }
}

const policyEngine = new PolicyEngine();
export default policyEngine;

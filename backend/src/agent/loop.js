import { createChat, sendMessage, sendFunctionResult, extractFunctionCall, extractText, getTokenCount } from './llm.js';
import policyEngine from '../policy/engine.js';
import db from '../db/index.js';

const MAX_TOOL_ROUNDS = 10;

export async function runAgentLoop(userMessage, mcpClient, broadcastFn) {
  const conv = db.prepare('INSERT INTO conversations DEFAULT VALUES').run();
  const conversationId = conv.lastInsertRowid;

  db.prepare(
    'INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)'
  ).run(conversationId, 'user', userMessage);

  const tools = mcpClient.getToolsAsGeminiFunctions();
  const chat = createChat(tools);

  let response = await sendMessage(chat, userMessage);
  let totalTokens = getTokenCount(response);

  const steps = [];
  let rounds = 0;

  while (rounds < MAX_TOOL_ROUNDS) {
    const fnCall = extractFunctionCall(response);
    if (!fnCall) break;

    rounds++;

    const policyResult = policyEngine.evaluate(fnCall.name, fnCall.args);

    const step = {
      tool: fnCall.name,
      args: fnCall.args,
      policy: policyResult
    };

    db.prepare(
      'INSERT INTO messages (conversation_id, role, content, tool_name, policy_decision, token_count) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
      conversationId,
      'tool_call',
      JSON.stringify(fnCall.args),
      fnCall.name,
      policyResult.allowed ? 'allowed' : (policyResult.needsApproval ? 'pending_approval' : 'blocked'),
      0
    );

    if (broadcastFn) {
      broadcastFn({
        type: 'tool_call',
        conversationId,
        tool: fnCall.name,
        args: fnCall.args,
        policy: policyResult
      });
    }

    if (!policyResult.allowed && !policyResult.needsApproval) {
      const blockMsg = `Tool "${fnCall.name}" was blocked by policy: ${policyResult.reason}`;

      db.prepare(
        'INSERT INTO messages (conversation_id, role, content, tool_name, policy_decision) VALUES (?, ?, ?, ?, ?)'
      ).run(conversationId, 'policy', blockMsg, fnCall.name, 'blocked');

      response = await sendFunctionResult(chat, fnCall.name, blockMsg);
      totalTokens += getTokenCount(response);

      step.result = blockMsg;
      step.blocked = true;
      steps.push(step);
      continue;
    }

    if (policyResult.needsApproval) {
      const approvalRow = db.prepare(
        'INSERT INTO approval_queue (conversation_id, tool_name, arguments) VALUES (?, ?, ?)'
      ).run(conversationId, fnCall.name, JSON.stringify(fnCall.args));

      if (broadcastFn) {
        broadcastFn({
          type: 'approval_needed',
          conversationId,
          approvalId: approvalRow.lastInsertRowid,
          tool: fnCall.name,
          args: fnCall.args
        });
      }

      const approved = await waitForApproval(approvalRow.lastInsertRowid, 60000);

      if (!approved) {
        const rejectMsg = `Tool "${fnCall.name}" was rejected: approval timed out or was denied`;

        db.prepare(
          'INSERT INTO messages (conversation_id, role, content, tool_name, policy_decision) VALUES (?, ?, ?, ?, ?)'
        ).run(conversationId, 'policy', rejectMsg, fnCall.name, 'blocked');

        response = await sendFunctionResult(chat, fnCall.name, rejectMsg);
        totalTokens += getTokenCount(response);

        step.result = rejectMsg;
        step.blocked = true;
        steps.push(step);
        continue;
      }
    }

    let toolResult;
    try {
      toolResult = await mcpClient.executeTool(fnCall.name, fnCall.args);
    } catch (err) {
      toolResult = {
        content: [{ type: 'text', text: `Error executing tool: ${err.message}` }],
        isError: true
      };
    }

    const resultText = toolResult.content
      ?.map(c => c.text || JSON.stringify(c))
      .join('\n') || 'No output';

    db.prepare(
      'INSERT INTO messages (conversation_id, role, content, tool_name, policy_decision) VALUES (?, ?, ?, ?, ?)'
    ).run(conversationId, 'tool_result', resultText, fnCall.name, 'allowed');

    if (broadcastFn) {
      broadcastFn({
        type: 'tool_result',
        conversationId,
        tool: fnCall.name,
        result: resultText,
        isError: toolResult.isError || false
      });
    }

    response = await sendFunctionResult(chat, fnCall.name, resultText);
    totalTokens += getTokenCount(response);

    step.result = resultText;
    step.blocked = false;
    steps.push(step);
  }

  const finalText = extractText(response);

  db.prepare(
    'INSERT INTO messages (conversation_id, role, content, token_count) VALUES (?, ?, ?, ?)'
  ).run(conversationId, 'assistant', finalText, totalTokens);

  return {
    conversationId,
    response: finalText,
    steps,
    totalTokens
  };
}

function waitForApproval(approvalId, timeoutMs) {
  return new Promise(resolve => {
    const deadline = Date.now() + timeoutMs;
    const interval = setInterval(() => {
      const row = db.prepare('SELECT status FROM approval_queue WHERE id = ?').get(approvalId);
      if (!row || row.status === 'rejected') {
        clearInterval(interval);
        resolve(false);
      } else if (row.status === 'approved') {
        clearInterval(interval);
        resolve(true);
      } else if (Date.now() > deadline) {
        db.prepare('UPDATE approval_queue SET status = ? WHERE id = ?').run('rejected', approvalId);
        clearInterval(interval);
        resolve(false);
      }
    }, 1000);
  });
}

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

class MCPClientManager {
  constructor() {
    this.connections = new Map();
  }

  async connectSSE(name, url) {
    const transport = new SSEClientTransport(new URL(url));
    const client = new Client({ name: 'armoriq-agent', version: '1.0.0' });

    await client.connect(transport);

    const toolsResponse = await client.listTools();
    const tools = toolsResponse.tools || [];

    this.connections.set(name, { client, transport, tools, type: 'sse' });
    console.log(`Connected to MCP server "${name}" via SSE (${tools.length} tools discovered)`);

    return tools;
  }

  async connectStdio(name, command, args = [], env = {}) {
    const transport = new StdioClientTransport({
      command,
      args,
      env: { ...process.env, ...env }
    });

    const client = new Client({ name: 'armoriq-agent', version: '1.0.0' });
    await client.connect(transport);

    const toolsResponse = await client.listTools();
    const tools = toolsResponse.tools || [];

    this.connections.set(name, { client, transport, tools, type: 'stdio' });
    console.log(`Connected to MCP server "${name}" via stdio (${tools.length} tools discovered)`);

    return tools;
  }

  getAllTools() {
    const allTools = [];
    for (const [serverName, conn] of this.connections) {
      for (const tool of conn.tools) {
        allTools.push({
          ...tool,
          _serverName: serverName
        });
      }
    }
    return allTools;
  }

  getToolsAsGeminiFunctions() {
    const allTools = this.getAllTools();
    return allTools.map(tool => {
      const params = tool.inputSchema || {};
      const properties = params.properties || {};
      const required = params.required || [];

      const geminiProperties = {};
      for (const [key, schema] of Object.entries(properties)) {
        geminiProperties[key] = convertJsonSchemaToGemini(schema);
      }

      return {
        name: tool.name,
        description: tool.description || tool.name,
        parameters: {
          type: 'object',
          properties: geminiProperties,
          required
        }
      };
    });
  }

  findToolServer(toolName) {
    for (const [serverName, conn] of this.connections) {
      if (conn.tools.some(t => t.name === toolName)) {
        return serverName;
      }
    }
    return null;
  }

  async executeTool(toolName, args) {
    const serverName = this.findToolServer(toolName);
    if (!serverName) {
      throw new Error(`No server found for tool "${toolName}"`);
    }

    const conn = this.connections.get(serverName);

    const TIMEOUT_MS = 30000;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Tool "${toolName}" timed out after ${TIMEOUT_MS}ms`)), TIMEOUT_MS)
    );

    try {
      const result = await Promise.race([
        conn.client.callTool({ name: toolName, arguments: args }),
        timeoutPromise
      ]);
      return result;
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Tool execution error: ${err.message}` }],
        isError: true
      };
    }
  }

  async disconnect(name) {
    const conn = this.connections.get(name);
    if (conn) {
      await conn.transport.close();
      this.connections.delete(name);
    }
  }

  async disconnectAll() {
    for (const name of this.connections.keys()) {
      await this.disconnect(name);
    }
  }
}

function convertJsonSchemaToGemini(schema) {
  if (!schema) return { type: 'string' };

  const result = {};

  if (schema.type === 'string') result.type = 'string';
  else if (schema.type === 'number' || schema.type === 'integer') result.type = 'number';
  else if (schema.type === 'boolean') result.type = 'boolean';
  else if (schema.type === 'array') {
    result.type = 'array';
    if (schema.items) result.items = convertJsonSchemaToGemini(schema.items);
  } else if (schema.type === 'object') {
    result.type = 'object';
    if (schema.properties) {
      result.properties = {};
      for (const [k, v] of Object.entries(schema.properties)) {
        result.properties[k] = convertJsonSchemaToGemini(v);
      }
    }
  } else {
    result.type = 'string';
  }

  if (schema.description) result.description = schema.description;
  if (schema.enum) result.enum = schema.enum;

  return result;
}

export default MCPClientManager;

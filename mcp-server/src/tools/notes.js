import { z } from 'zod';

const notes = new Map();
let nextId = 1;

export function registerNoteTools(server) {
  server.tool(
    'create_note',
    'Create a new note with a title and content',
    { title: z.string(), content: z.string() },
    async ({ title, content }) => {
      const id = String(nextId++);
      notes.set(id, { id, title, content, createdAt: new Date().toISOString() });
      return {
        content: [{ type: 'text', text: JSON.stringify(notes.get(id)) }]
      };
    }
  );

  server.tool(
    'list_notes',
    'List all saved notes',
    {},
    async () => {
      const all = Array.from(notes.values());
      return {
        content: [{ type: 'text', text: JSON.stringify(all) }]
      };
    }
  );

  server.tool(
    'get_note',
    'Get a single note by its ID',
    { id: z.string() },
    async ({ id }) => {
      const note = notes.get(id);
      if (!note) {
        return {
          content: [{ type: 'text', text: `Note with id "${id}" not found` }],
          isError: true
        };
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(note) }]
      };
    }
  );

  server.tool(
    'delete_note',
    'Delete a note by its ID',
    { id: z.string() },
    async ({ id }) => {
      if (!notes.has(id)) {
        return {
          content: [{ type: 'text', text: `Note with id "${id}" not found` }],
          isError: true
        };
      }
      notes.delete(id);
      return {
        content: [{ type: 'text', text: `Note "${id}" deleted` }]
      };
    }
  );
}

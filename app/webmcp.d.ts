type CascadeToolDefinition = {
  name: string;
  title?: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
  execute: (input: Record<string, unknown>, options?: { signal?: AbortSignal }) => unknown | Promise<unknown>;
};

interface Document {
  modelContext?: {
    registerTool: (tool: CascadeToolDefinition, options?: { signal?: AbortSignal }) => Promise<void>;
  };
}

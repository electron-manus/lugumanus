import type { FunctionDefinition } from 'openai/resources/index.mjs';
import type { AgentTaskRef } from '../agent/type.js';

export interface SpecializedToolAgent extends FunctionDefinition {
  execute(query: Record<string, unknown>, taskRef: AgentTaskRef): Promise<unknown>;
}

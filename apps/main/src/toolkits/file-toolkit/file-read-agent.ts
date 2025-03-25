import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import yaml from 'js-yaml';
import { BaseAgent } from '../../agent/base-agent.js';
import type { AgentTaskRef } from '../../agent/type.js';
import type { SpecializedToolAgent } from '../types.js';
export class FileReadAgent extends BaseAgent implements SpecializedToolAgent {
  name = 'FileReadTool';

  description = 'A tool for reading file contents';

  parameters = {
    type: 'object',
    properties: {
      filePath: { type: 'string', description: 'File path to read' },
      encoding: {
        type: 'string',
        description: 'File encoding, defaults to utf-8',
        default: 'utf-8',
      },
    },
    required: ['filePath'],
  };

  strict = true;

  async execute(query: Record<string, unknown>, taskRef: AgentTaskRef): Promise<string> {
    const filePath = query.filePath as string;
    const encoding = (query.encoding as string) || 'utf-8';

    const absolutePath = path.resolve(filePath);
    const content = await fs.readFile(absolutePath, { encoding: encoding as BufferEncoding });

    return yaml.dump({
      success: true,
      content,
      path: absolutePath,
    });
  }
}

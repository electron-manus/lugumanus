import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { app } from 'electron';
import yaml from 'js-yaml';
import { BaseAgent } from '../../agent/base-agent.js';
import type { AgentTaskRef } from '../../agent/type.js';
import type { SpecializedToolAgent } from '../types.js';

export class FileWriteAgent extends BaseAgent implements SpecializedToolAgent {
  override name = 'FileWriteTool';

  description = 'A tool for writing content to files';

  parameters = {
    type: 'object',
    properties: {
      filePath: { type: 'string', description: 'File path to write to' },
      content: { type: 'string', description: 'Content to write' },
      encoding: {
        type: 'string',
        description: 'File encoding, defaults to utf-8',
        default: 'utf-8',
      },
      append: {
        type: 'boolean',
        description: 'Whether to append content instead of overwriting, defaults to false',
        default: false,
      },
    },
    required: ['filePath', 'content'],
  };

  strict = true;

  async execute(query: Record<string, unknown>, taskRef: AgentTaskRef): Promise<string> {
    let filePath = query.filePath as string;
    const content = query.content as string;
    const encoding = (query.encoding as string) || 'utf-8';
    const append = Boolean(query.append);

    // 判断是否绝对路径
    if (!path.isAbsolute(filePath)) {
      filePath = path.resolve(app.getPath('userData'), taskRef.conversationId, filePath);
    }

    const absolutePath = path.resolve(filePath);
    // 确保目录存在
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });

    if (append) {
      await fs.appendFile(absolutePath, content, { encoding: encoding as BufferEncoding });
    } else {
      await fs.writeFile(absolutePath, content, { encoding: encoding as BufferEncoding });
    }

    await taskRef.studio.start(
      {
        type: 'editor',
        payload: {
          text: content,
        },
        description: absolutePath,
      },
      taskRef.observer,
      taskRef.abortSignal,
    );

    return yaml.dump({
      success: true,
      path: absolutePath,
      message: `File has been ${append ? 'appended' : 'written'}`,
    });
  }
}

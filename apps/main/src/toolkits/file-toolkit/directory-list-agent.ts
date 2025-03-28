import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import yaml from 'js-yaml';
import { BaseAgent } from '../../agent/base-agent.js';
import type { AgentTaskRef } from '../../agent/type.js';
import type { SpecializedToolAgent } from '../types.js';

interface FileEntry {
  name: string;
  type: 'file';
  path: string;
}

interface DirectoryEntry {
  name: string;
  type: 'directory';
  path: string;
  children: Array<FileEntry | DirectoryEntry>;
}

type FileSystemEntry = FileEntry | DirectoryEntry;
type RecursiveResult = Array<FileSystemEntry>;

export class DirectoryListAgent extends BaseAgent implements SpecializedToolAgent {
  override name = 'DirectoryListTool';

  description = 'A tool for listing directory contents';

  parameters = {
    type: 'object',
    properties: {
      dirPath: { type: 'string', description: 'Directory path to list contents from' },
      recursive: {
        type: 'boolean',
        description: 'Whether to recursively list subdirectory contents, defaults to false',
        default: false,
      },
    },
    required: ['dirPath'],
  };

  strict = true;

  async execute(query: Record<string, unknown>, taskRef: AgentTaskRef): Promise<string> {
    const dirPath = query.dirPath as string;
    const recursive = Boolean(query.recursive);

    const absolutePath = path.resolve(dirPath);
    if (recursive) {
      const result = await this.listRecursive(absolutePath);
      return yaml.dump(result);
    }
    const entries = await fs.readdir(absolutePath, { withFileTypes: true });
    return yaml.dump(
      entries.map((entry) => ({
        name: entry.name,
        type: entry.isDirectory() ? 'directory' : 'file',
        path: path.join(absolutePath, entry.name),
      })),
    );
  }

  private async listRecursive(dirPath: string): Promise<RecursiveResult> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    const result = [];
    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        result.push({
          name: entry.name,
          type: 'directory',
          path: entryPath,
          children: await this.listRecursive(entryPath),
        });
      } else {
        result.push({
          name: entry.name,
          type: 'file',
          path: entryPath,
        });
      }
    }
    return result as RecursiveResult;
  }
}

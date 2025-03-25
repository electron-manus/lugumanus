import { DirectoryListAgent } from './directory-list-agent.js';
import { FileReadAgent } from './file-read-agent.js';
import { FileWriteAgent } from './file-write-agent.js';

export const fileToolkits = [new FileReadAgent(), new FileWriteAgent(), new DirectoryListAgent()];

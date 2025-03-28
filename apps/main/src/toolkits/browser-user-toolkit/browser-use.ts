import yaml from 'js-yaml';
import { BaseAgent } from '../../agent/base-agent';
import type { AgentTaskRef } from '../../agent/type';
import type { SpecializedToolAgent } from '../types';

export class BrowserUseAgent extends BaseAgent implements SpecializedToolAgent {
  override name = 'BrowserUseTool';

  description = 'A tool for browser simulator';

  parameters = {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'URL to visit' },
      instruction: {
        type: 'string',
        description: `Operation instruction. It is recommended to follow the format: [Where] + [How] + [Result]. For example: "Search for the 'Contact Us' link on the DeepSeekV1 page, click to enter, and then extract all the contact information." `,
      },
    },
    required: ['url', 'instruction'],
  };

  strict = true;

  async execute(query: Record<string, string>, taskRef: AgentTaskRef): Promise<string> {
    const url = query.url;
    const instruction = query.instruction;

    taskRef.studio.browserUse.webContentsView.setVisible(true);

    const results = await taskRef.studio.browserUse.run({
      instruction: instruction,
      webUrl: url,
      webTitle: '',
      actionCallback: async (action: string) => {
        console.log('\x1b[36m🚀 ~ %s\x1b[0m', action);
        const message = await taskRef.createMessage('Tool');
        message.content = action;
        await taskRef.completeMessage(message);
        taskRef.observer.next(message);
      },
      abortSignal: taskRef.abortSignal,
    });
    // 返回模拟的结果
    return yaml.dump(
      results.history.map((h) => ({
        action: h.action,
        information: h.information,
      })),
    );
  }
}

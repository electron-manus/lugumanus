import { BaseAgent } from '../../agent/base-agent.js';
import type { AgentTaskRef } from '../../agent/type.js';
import { getHtmlCode } from '../../javascript-code/get-html.js';
import type { SpecializedToolAgent } from '../types.js';
import { extractHtmlContent } from './extract-html-content.js';
export class WebPageSummaryAgent extends BaseAgent implements SpecializedToolAgent {
  override name = 'WebPageSummaryTool';

  description = 'Web page summary tool';

  parameters = {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'Web page url' },
    },
    required: ['url'],
  };

  strict = true;

  async execute(query: Record<string, string>, taskRef: AgentTaskRef): Promise<unknown> {
    await taskRef.studio.start(
      {
        type: 'openUrl',
        payload: {
          url: query.url,
        },
        description: query.url,
      },
      taskRef.observer,
      taskRef.abortSignal,
    );

    const html = await taskRef.studio.browserUse.webContents.executeJavaScript(getHtmlCode);
    try {
      const summary = extractHtmlContent(html);
      return summary;
    } catch (error) {
      throw new Error('Failed to extract html content');
    }
  }
}

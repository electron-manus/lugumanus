import axios from 'axios';
import * as cheerio from 'cheerio';
import { BaseAgent } from '../../agent/base-agent.js';
import type { AgentTaskRef } from '../../agent/type.js';
import type { SpecializedToolAgent } from '../types.js';
import { extractHtmlContent } from './extract-html-content.js';

export class WebPageSummaryAgent extends BaseAgent implements SpecializedToolAgent {
  name = 'WebPageSummaryTool';

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
    const userAgent =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3';

    const response = await axios.get(query.url, {
      headers: {
        'User-Agent': userAgent,
      },
    });

    const $ = cheerio.load(response.data);
    const content = $('body').text();

    return extractHtmlContent(content);
  }
}

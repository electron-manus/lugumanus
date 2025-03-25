// 百度搜索 agent

import axios from 'axios';
import * as cheerio from 'cheerio';
import * as yaml from 'js-yaml';
import { BaseAgent } from '../../agent/base-agent.js';
import type { AgentTaskRef } from '../../agent/type.js';
import type { SpecializedToolAgent } from '../types.js';

export class BaiduSearchAgent extends BaseAgent implements SpecializedToolAgent {
  name = 'BaiduSearchTool';

  description = 'Baidu search tool';

  parameters = {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search keywords' },
    },
    required: ['query'],
  };

  strict = true;

  async execute(query: Record<string, unknown>, taskRef: AgentTaskRef): Promise<unknown> {
    const results: { title: string; link: string; snippet: string }[] = [];
    const userAgent =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3';

    for (let page = 0; page < 2; page++) {
      const response = await axios.get('https://www.baidu.com/s', {
        params: {
          wd: query.query,
          pn: page * 10, // 每页10个结果，pn参数控制从第几个结果开始
        },
        headers: {
          'User-Agent': userAgent,
        },
      });

      const $ = cheerio.load(response.data);
      $('.result, .result-op').each((index, element) => {
        const title = $(element).find('h3').text();
        const link = $(element).find('a').attr('href');
        const snippetNode =
          $(element).find('.c-abstract') ||
          $(element).find('.c-span-last .c-color-text') ||
          $(element).find('[class^="content-right-"]');
        const snippet = snippetNode.text();
        if (!title || !link || !snippet) {
          return;
        }
        results.push({ title, link, snippet });
      });
    }

    // TODO: 使用 taskRef.browserUse 显示出搜索结果

    return yaml.dump(results);
  }
}
